// Clean, single router definition
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Test = require('../models/Test');
const Attempt = require('../models/Attempt');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { extractQuestionsFromTextGemini } = require('../services/ai');

const upload = multer({ dest: 'uploads/' });

// list tests - admins see all; students only see tests for their department
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      // Always populate createdBy so frontend can filter reliably
      const tests = await Test.find().select('-questions.correctAnswer').populate('createdBy', '_id').lean();
      // Coerce createdBy to string for all tests
      for (const t of tests) {
        if (t.createdBy && typeof t.createdBy === 'object' && t.createdBy._id) {
          t.createdBy = t.createdBy._id.toString();
        } else if (t.createdBy) {
          t.createdBy = String(t.createdBy);
        }
      }
      return res.json({ tests });
    }
    const dept = req.user.dept || req.user.department;
    if (!dept) {
      return res.status(400).json({ error: 'Your profile is missing department' });
    }
    const tests = await Test.find({ 'assignedTo.dept': dept }).select('-questions.correctAnswer').lean();
    return res.json({ tests });
  } catch (err) { next(err); }
});

// create test (admin)
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, description, questions } = req.body || {};
    const meta = req.body?.meta || {};
    const assignedRaw = req.body?.assignedTo || meta?.assignedTo || {};
    const dept = assignedRaw.dept || assignedRaw.department;
    const semester = assignedRaw.semester || assignedRaw.sem;
    const section = assignedRaw.section;
    const year = assignedRaw.year;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Missing title or questions' });
    }
    if (!dept) {
      return res.status(400).json({ error: 'assignedTo.dept (department) is required' });
    }

    // Normalize questions to expected shape
    const normQuestions = questions.map(q => ({
      text: String(q.text || '').trim(),
      options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
      correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : '0',
      points: Number.isFinite(q.points) ? q.points : 1,
    }));

    const test = new Test({
      title: String(title).trim(),
      description: description ? String(description) : '',
      questions: normQuestions,
      assignedTo: { dept: String(dept).trim(), semester: semester ? String(semester) : undefined, section, year },
      durationMinutes: Number.isFinite(req.body?.durationMinutes) ? req.body.durationMinutes : (Number.isFinite(meta.durationMinutes) ? meta.durationMinutes : 30),
      attemptsAllowed: Number.isFinite(req.body?.attemptsAllowed) ? req.body.attemptsAllowed : (Number.isFinite(meta.attemptsAllowed) ? meta.attemptsAllowed : 1),
      shuffleQuestions: typeof req.body?.shuffleQuestions === 'boolean' ? req.body.shuffleQuestions : !!meta.shuffleQuestions,
      shuffleOptions: typeof req.body?.shuffleOptions === 'boolean' ? req.body.shuffleOptions : !!meta.shuffleOptions,
      startAt: req.body?.startAt ? new Date(req.body.startAt) : (meta.startAt ? new Date(meta.startAt) : undefined),
      endAt: req.body?.endAt ? new Date(req.body.endAt) : (meta.endAt ? new Date(meta.endAt) : undefined),
      createdBy: req.user._id,
      createdByModel: 'Admin',
    });
    await test.save();
    res.status(201).json({ test });
  } catch (err) { next(err); }
});

// upload (multipart) -> returns { questions }
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const filePath = path.resolve(req.file.path);
    const mime = req.file.mimetype || '';
    let text = '';

    if (mime.includes('application/json')) {
      const raw = fs.readFileSync(filePath, 'utf8');
      let data;
      try { data = JSON.parse(raw); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
      let questions = [];
      if (Array.isArray(data)) questions = data;
      else if (Array.isArray(data.questions)) questions = data.questions;
      else return res.status(400).json({ error: 'JSON must be an array or {questions: []}' });
      const normalized = questions
        .filter(q => q && q.text)
        .map(q => {
          const opts = Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [];
          while (opts.length < 4) opts.push('Option');
          let idx = Number.isInteger(q.correctOptionIndex) ? q.correctOptionIndex : 0;
          if (idx < 0 || idx > 3) idx = 0;
          return { text: String(q.text).trim(), options: opts, correctOptionIndex: idx };
        });
      return res.json({ questions: normalized });
    }

    if (mime.includes('msword') || mime.includes('officedocument.wordprocessingml.document') || req.file.originalname.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = (result && result.value) || '';
    } else if (mime.includes('pdf') || req.file.originalname.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(fs.readFileSync(filePath));
      text = data && data.text ? data.text : '';
    } else if (mime.startsWith('text/') || req.file.originalname.toLowerCase().endsWith('.txt')) {
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!text || text.trim().length < 10) return res.status(400).json({ error: 'Could not extract text from document' });
    try {
      const questions = await extractQuestionsFromTextGemini(text);
      return res.json({ questions });
    } catch (e) {
      const msg = (e && e.message) ? String(e.message) : 'AI processing failed';
      // Provide an actionable hint for common model-not-found errors
      const hint = 'Check GOOGLE_API_KEY and set GEMINI_MODEL to a supported model like "gemini-1.5-flash-latest".';
      return res.status(502).json({ error: msg, hint });
    }
  } catch (err) { next(err); }
});

// get single test
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin') {
      const dept = req.user.dept || req.user.department;
      if (!dept || !test.assignedTo || String(test.assignedTo.dept) !== String(dept)) {
        return res.status(403).json({ error: 'Not authorized for this test' });
      }
      test.questions = (test.questions || []).map(q => ({ id: q._id?.toString?.() || '', text: q.text, options: q.options }));
    }
    res.json({ test });
  } catch (err) { next(err); }
});

// start attempt
router.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (req.user.role !== 'admin') {
      const dept = req.user.dept || req.user.department;
      if (!dept || !test.assignedTo || String(test.assignedTo.dept) !== String(dept)) {
        return res.status(403).json({ error: 'Not authorized for this test' });
      }
      // Enforce attempts allowed (count submitted attempts)
      const priorAttempts = await Attempt.countDocuments({ test: test._id, student: req.user._id, submittedAt: { $ne: null } });
      const limit = Number.isFinite(test.attemptsAllowed) ? test.attemptsAllowed : 1;
      if (priorAttempts >= limit) {
        return res.status(400).json({ error: 'No attempts left' });
      }
    }
    const attemptId = uuidv4();
    const attempt = new Attempt({ test: test._id, student: req.user._id, attemptId, answers: [] });
    await attempt.save();
    res.json({ attemptId, startedAt: attempt.startedAt });
  } catch (err) { next(err); }
});

// submit attempt
router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const { attemptId, answers = [], suspiciousEvents = [] } = req.body;
    const attempt = await Attempt.findOne({ attemptId }).populate('test');
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.student.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Forbidden' });
    let score = 0;
    if (attempt.test && attempt.test.questions) {
      const qs = attempt.test.questions;
      for (const ans of answers) {
        const q = qs.find(x => x._id.toString() === (ans.questionId || '').toString());
        if (q && q.correctAnswer != null) {
          if (String(ans.answer) === String(q.correctAnswer)) score += (q.points || 1);
        }
      }
    }
    attempt.answers = answers;
    attempt.suspiciousEvents = suspiciousEvents || [];
    attempt.score = score;
    attempt.submittedAt = new Date();
    await attempt.save();
    res.json({ ok: true, score });
  } catch (err) { next(err); }
});

// attempts for a test (admin)
router.get('/:id/attempts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const skip = (page - 1) * limit;
    const query = { test: req.params.id };
    const [items, total] = await Promise.all([
      Attempt.find(query).populate('student', 'name email').sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      Attempt.countDocuments(query),
    ]);
    res.json({ attempts: items, total, page, limit });
  } catch (err) { next(err); }
});

module.exports = router;

