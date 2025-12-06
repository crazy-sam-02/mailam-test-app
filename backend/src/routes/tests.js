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
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(req.query.limit || '100', 10)), 500);
    const skip = (page - 1) * limit;

    // Helper to normalize populated createdBy into id/name/email fields
    const normalizeCreatedBy = (t) => {
      if (t.createdBy && typeof t.createdBy === 'object' && t.createdBy._id) {
        const id = t.createdBy._id.toString();
        const name = t.createdBy.name || '';
        const email = t.createdBy.email || '';
        t.createdBy = id;
        t.createdByName = name;
        t.createdByEmail = email;
      } else if (t.createdBy) {
        t.createdBy = String(t.createdBy);
      }
    };

    if (req.user.role === 'admin') {
      // If admin/staff has a department, show tests for their department OR tests they created
      const adminDept = req.user.dept || req.user.department;
      if (adminDept) {
        const query = {
          $or: [
            { 'assignedTo.departments': adminDept },
            { createdBy: req.user._id },
          ],
        };
        const [tests, total] = await Promise.all([
          Test.find(query)
            .select('-questions.correctAnswer')
            .populate('createdBy', '_id name email')
            .skip(skip)
            .limit(limit)
            .lean(),
          Test.countDocuments(query),
        ]);
        tests.forEach(normalizeCreatedBy);
        return res.json({ tests, total, page, limit });
      }
      // if admin has no dept (super-admin), return all tests (paginated)
      const query = {};
      const [tests, total] = await Promise.all([
        Test.find(query)
          .select('-questions.correctAnswer')
          .populate('createdBy', '_id name email')
          .skip(skip)
          .limit(limit)
          .lean(),
        Test.countDocuments(query),
      ]);
      tests.forEach(normalizeCreatedBy);
      return res.json({ tests, total, page, limit });
    }

    // student view: must have dept
    const deptRaw = req.user.dept || req.user.department;
    if (!deptRaw) {
      return res.status(400).json({ error: 'Your profile is missing department' });
    }
    const dept = String(deptRaw).trim();
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Support legacy shapes (assignedTo.department or assignedTo.dept) and be case-insensitive
    const query = {
      $or: [
        { 'assignedTo.departments': { $in: [dept, dept.toUpperCase(), dept.toLowerCase()] } },
        { 'assignedTo.department': { $regex: `^${escapeRegex(dept)}$`, $options: 'i' } },
        { 'assignedTo.dept': { $regex: `^${escapeRegex(dept)}$`, $options: 'i' } },
      ]
    };
    const [tests, total] = await Promise.all([
      Test.find(query)
        .select('-questions.correctAnswer')
        .populate('createdBy', '_id name email')
        .skip(skip)
        .limit(limit)
        .lean(),
      Test.countDocuments(query),
    ]);
    tests.forEach(normalizeCreatedBy);
    // student shouldn't see correctAnswer, so no populate needed
    return res.json({ tests, total, page, limit });
  } catch (err) { next(err); }
});

router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const difficulty = req.body.difficulty || 'Medium';
    const questionType = req.body.questionType || 'Multiple Choice';

    let text = '';
    let questions = [];

    // JSON file (Direct parse)
    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      try {
        const json = JSON.parse(content);
        questions = Array.isArray(json) ? json : (json.questions || []);
        fs.unlinkSync(filePath);
        return res.json({ questions });
      } catch (e) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Invalid JSON file' });
      }
    }

    // Extract text from Document
    try {
      if (ext === '.pdf') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        text = data.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (ext === '.txt') {
        text = fs.readFileSync(filePath, 'utf8');
      } else {
        throw new Error('Unsupported file type');
      }
    } finally {
      // cleanup uploaded file
      try { fs.unlinkSync(filePath); } catch (e) { }
    }

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from file to generate questions.' });
    }

    // Call AI Service
    try {
      questions = await extractQuestionsFromTextGemini(text, difficulty, questionType);
      res.json({ questions, method: 'gemini-ai' });
    } catch (aiError) {
      console.error('[AI Service Error]', aiError);
      return res.status(502).json({ error: aiError.message || 'AI processing failed. Check server logs/keys.' });
    }

  } catch (err) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    next(err);
  }
});

// create test (admin)
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, description, questions } = req.body || {};
    const meta = req.body?.meta || {};
    const assignedRaw = req.body?.assignedTo || meta?.assignedTo || {};
    const depts = assignedRaw.departments || assignedRaw.department || assignedRaw.dept;
    const semesterRaw = assignedRaw.semester || assignedRaw.sem;
    const sectionRaw = assignedRaw.section;
    const yearRaw = assignedRaw.year;

    const departments = Array.isArray(depts) ? depts.map(String) : (depts ? [String(depts)] : []);
    const semester = Array.isArray(semesterRaw) ? semesterRaw.map(String) : (semesterRaw ? [String(semesterRaw)] : []);
    const section = Array.isArray(sectionRaw) ? sectionRaw.map(String) : (sectionRaw ? [String(sectionRaw)] : []);
    const year = Array.isArray(yearRaw) ? yearRaw.map(String) : (yearRaw ? [String(yearRaw)] : []);

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Missing title or questions' });
    }
    if (departments.length === 0) {
      return res.status(400).json({ error: 'assignedTo.departments is required' });
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
      assignedTo: { departments, semester, section, year },
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
    // Ensure createdBy is always a string in response
    let testObj = test.toObject();
    if (testObj.createdBy && typeof testObj.createdBy === 'object' && testObj.createdBy._id) {
      testObj.createdBy = testObj.createdBy._id.toString();
    } else if (testObj.createdBy) {
      testObj.createdBy = String(testObj.createdBy);
    }
    res.status(201).json({ test: testObj });
  } catch (err) { next(err); }
});

// delete test (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    console.log('[DELETE] request for test id:', req.params.id, 'by user:', req.user && req.user._id);
    const test = await Test.findById(req.params.id);
    console.log('[DELETE] found test:', !!test);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    // Only allow the admin who created the test or a super-admin (no dept) to delete it
    const userDept = req.user.dept || req.user.department;
    if (userDept) {
      if (!test.createdBy || String(test.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ error: 'You are not authorized to delete this test' });
      }
    }
    // Delete associated attempts and the test
    await Attempt.deleteMany({ test: test._id });
    await test.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// get single test
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('createdBy', '_id name email')
      .lean();

    if (!test) return res.status(404).json({ error: 'Not found' });

    // Helper to normalize populated createdBy
    if (test.createdBy && typeof test.createdBy === 'object' && test.createdBy._id) {
      const id = test.createdBy._id.toString();
      const name = test.createdBy.name || '';
      const email = test.createdBy.email || '';
      test.createdBy = id;
      test.createdByName = name;
      test.createdByEmail = email;
    } else if (test.createdBy) {
      test.createdBy = String(test.createdBy);
    }

    const userDept = req.user.dept || req.user.department;
    if (req.user.role !== 'admin') {
      const hasAccess = (() => {
        if (!userDept || !test.assignedTo) return false;
        const dept = String(userDept).trim();
        const departments = Array.isArray(test.assignedTo.departments) ? test.assignedTo.departments : [];
        const inArray = departments.some(d => String(d).toLowerCase() === dept.toLowerCase());
        const singleDept = test.assignedTo.department ? String(test.assignedTo.department) : null;
        const legacyDept = test.assignedTo.dept ? String(test.assignedTo.dept) : null;
        const singleMatch = singleDept && singleDept.toLowerCase() === dept.toLowerCase();
        const legacyMatch = legacyDept && legacyDept.toLowerCase() === dept.toLowerCase();
        return inArray || singleMatch || legacyMatch;
      })();
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized for this test' });
      }
      test.questions = (test.questions || []).map(q => ({ id: q._id?.toString?.() || '', text: q.text, options: q.options }));
    } else {
      // admin/staff: if they have a dept, allow if creator OR assigned to their dept
      if (userDept) {
        const departments = (test.assignedTo && Array.isArray(test.assignedTo.departments)) ? test.assignedTo.departments : [];
        const isCreator = test.createdBy && String(test.createdBy) === String(req.user._id);
        if (!isCreator && !departments.includes(userDept)) {
          return res.status(403).json({ error: 'Not authorized for this test' });
        }
      }
      // admins can view full test
    }
    res.json({ test });
  } catch (err) { next(err); }
});

// start attempt
router.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ error: 'Test not found' });
    const userDept = req.user.dept || req.user.department;
    // Enforce department match for students and for admin/staff that have a dept
    if (req.user.role !== 'admin' || userDept) {
      const dept = String(userDept || '').trim();
      const departments = (test.assignedTo && Array.isArray(test.assignedTo.departments)) ? test.assignedTo.departments : [];
      const inArray = departments.some(d => String(d).toLowerCase() === dept.toLowerCase());
      const singleDept = test.assignedTo && test.assignedTo.department ? String(test.assignedTo.department) : null;
      const legacyDept = test.assignedTo && test.assignedTo.dept ? String(test.assignedTo.dept) : null;
      const singleMatch = singleDept && singleDept.toLowerCase() === dept.toLowerCase();
      const legacyMatch = legacyDept && legacyDept.toLowerCase() === dept.toLowerCase();
      if (!dept || !test.assignedTo || !(inArray || singleMatch || legacyMatch)) {
        return res.status(403).json({ error: 'Not authorized for this test' });
      }
    }
    // Enforce attempts allowed (count submitted attempts)
    const priorAttempts = await Attempt.countDocuments({ test: test._id, student: req.user._id, submittedAt: { $ne: null } });
    const limit = Number.isFinite(test.attemptsAllowed) ? test.attemptsAllowed : 1;
    if (priorAttempts >= limit) {
      return res.status(400).json({ error: 'No attempts left' });
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
    const { attemptId, answers = [], suspiciousEvents = [], autoSubmitted = false, malpracticeReason = null } = req.body;
    let attempt = await Attempt.findOne({ attemptId }).populate('test');

    // Handle offline start: Create attempt if not found
    if (!attempt) {
      const test = await Test.findById(req.params.id);
      if (!test) return res.status(404).json({ error: 'Test not found' });

      attempt = new Attempt({
        test: test._id,
        student: req.user._id,
        attemptId: attemptId,
        answers: [],
        startedAt: new Date() // Approximate start time
      });
      // Manually populate test for scoring logic
      attempt.test = test;
    }

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

    // Check for malpractice based on suspicious events
    const tabSwitchEvents = suspiciousEvents.filter(event => event.type === 'tab-switch');
    const multiFaceEvents = suspiciousEvents.filter(event => event.type === 'multiple-faces');
    const phoneEvents = suspiciousEvents.filter(event => event.type === 'phone-detected');

    // Strict Malpractice Rules:
    // 1. Auto-submitted explicitly
    // 2. Tab switches >= 3
    // 3. Multiple faces >= 1 (Strict) or set a threshold e.g. > 2 seconds
    // 4. Phone detected >= 1
    const hasMalpractice = autoSubmitted || tabSwitchEvents.length >= 3 || multiFaceEvents.length > 0 || phoneEvents.length > 0;

    attempt.answers = answers;
    attempt.suspiciousEvents = suspiciousEvents || [];
    attempt.score = score;
    attempt.submittedAt = new Date();
    attempt.autoSubmitted = autoSubmitted;

    if (hasMalpractice) {
      attempt.malpractice = true;
      let reasons = [];
      if (autoSubmitted) reasons.push(malpracticeReason || 'Auto-submitted');
      if (tabSwitchEvents.length >= 3) reasons.push(`Excessive tab switching (${tabSwitchEvents.length})`);
      if (multiFaceEvents.length > 0) reasons.push(`Multiple faces detected (${multiFaceEvents.length} times)`);
      if (phoneEvents.length > 0) reasons.push(`Phone detected (${phoneEvents.length} times)`);

      attempt.malpracticeReason = reasons.join(', ');
    }

    await attempt.save();
    res.json({ ok: true, score, malpractice: attempt.malpractice });
  } catch (err) {
    if (err.name === 'VersionError') {
      console.log('VersionError caught, assuming already submitted.');
      // Attempt was already saved, so we can return the score from the document.
      // Note: this might not be the most up-to-date score if another request just finished,
      // but it's better than an error.
      return res.json({ ok: true, score: attempt.score, malpractice: attempt.malpractice, message: 'Already submitted' });
    }
    next(err);
  }
});

// attempts for a test (admin)
router.get('/:id/attempts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Department check for admins
    const adminDept = req.user.dept || req.user.department;
    if (adminDept) {
      const departments = (test.assignedTo && Array.isArray(test.assignedTo.departments)) ? test.assignedTo.departments : [];
      const isCreator = test.createdBy && String(test.createdBy) === String(req.user._id);
      if (!isCreator && !departments.includes(adminDept)) {
        return res.status(403).json({ error: 'Not authorized for this test' });
      }
    }

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

