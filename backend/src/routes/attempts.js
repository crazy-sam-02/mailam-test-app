const express = require('express');
const router = express.Router();
const Attempt = require('../models/Attempt');
const { requireAuth } = require('../middleware/auth');

router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id }).populate('test', 'title').sort({ startedAt: -1 }).lean();
    res.json({ attempts });
  } catch (err) { next(err); }
});

module.exports = router;
