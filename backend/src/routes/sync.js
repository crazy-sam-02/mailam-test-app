const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const Attempt = require('../models/Attempt');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// POST /api/sync/tests
// Accepts an array of tests created offline and inserts them if not already present (clientId dedupe)
router.post('/tests', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.tests) ? req.body.tests : [];
    if (!items.length) return res.status(400).json({ error: 'No tests provided' });
    const results = [];
    for (const t of items) {
      const clientId = t.clientId ? String(t.clientId) : null;
      if (clientId) {
        const existing = await Test.findOne({ clientId }).lean();
        if (existing) {
          results.push({ clientId, ok: true, serverId: String(existing._id), note: 'already exists' });
          continue;
        }
      }
      // Basic validation
      if (!t.title || !Array.isArray(t.questions) || t.questions.length === 0) {
        results.push({ clientId, ok: false, error: 'Invalid test shape' });
        continue;
      }
      const normQuestions = t.questions.map(q => ({
        text: String(q.text || '').trim(),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : undefined,
        points: Number.isFinite(q.points) ? q.points : 1,
      }));
      const testDoc = new Test({
        title: String(t.title || '').trim(),
        description: t.description ? String(t.description) : '',
        questions: normQuestions,
        assignedTo: t.assignedTo || {},
        durationMinutes: Number.isFinite(t.durationMinutes) ? t.durationMinutes : 30,
        attemptsAllowed: Number.isFinite(t.attemptsAllowed) ? t.attemptsAllowed : 1,
        shuffleQuestions: !!t.shuffleQuestions,
        shuffleOptions: !!t.shuffleOptions,
        startAt: t.startAt ? new Date(t.startAt) : undefined,
        endAt: t.endAt ? new Date(t.endAt) : undefined,
        createdBy: req.user._id,
        createdByModel: 'Admin',
        clientId: clientId,
      });
      await testDoc.save();
      results.push({ clientId, ok: true, serverId: String(testDoc._id) });
    }
    res.json({ results });
  } catch (err) { next(err); }
});

// POST /api/sync/attempts
// Accepts array of attempts from offline clients and inserts if attemptId not already present
router.post('/attempts', requireAuth, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.attempts) ? req.body.attempts : [];
    if (!items.length) return res.status(400).json({ error: 'No attempts provided' });
    const results = [];
    for (const a of items) {
      const attemptId = String(a.attemptId || (a.attemptId === 0 ? '0' : ''));
      if (!attemptId) {
        results.push({ ok: false, error: 'attemptId required' });
        continue;
      }
      const existing = await Attempt.findOne({ attemptId }).lean();
      if (existing) {
        results.push({ attemptId, ok: true, note: 'already exists' });
        continue;
      }
      // Determine student: if admin uploading attempts for many students, honor provided studentId; otherwise require that student matches req.user
      let studentId = req.user._id;
      if (req.user.role === 'admin' && a.studentId) {
        // allow admin to upload attempts for a specified student
        studentId = a.studentId;
      }
      // Validate test id
      const testId = a.testId ? String(a.testId) : null;
      if (!testId || !mongoose.Types.ObjectId.isValid(testId)) {
        results.push({ attemptId, ok: false, error: 'Invalid testId' });
        continue;
      }

      const attemptDoc = new Attempt({
        test: testId,
        student: studentId,
        attemptId: attemptId,
        clientId: a.clientId ? String(a.clientId) : undefined,
        answers: Array.isArray(a.answers) ? a.answers : [],
        score: Number.isFinite(a.score) ? a.score : 0,
        totalQuestions: Number.isFinite(a.totalQuestions) ? a.totalQuestions : (Array.isArray(a.answers) ? a.answers.length : undefined),
        totalPoints: Number.isFinite(a.totalPoints) ? a.totalPoints : undefined,
        percentage: Number.isFinite(a.percentage) ? a.percentage : undefined,
        suspiciousEvents: Array.isArray(a.suspiciousEvents) ? a.suspiciousEvents : [],
        startedAt: a.startedAt ? new Date(a.startedAt) : undefined,
        submittedAt: a.submittedAt ? new Date(a.submittedAt) : undefined,
      });
      await attemptDoc.save();
      results.push({ attemptId, ok: true });
    }
    res.json({ results });
  } catch (err) { next(err); }
});

module.exports = router;
