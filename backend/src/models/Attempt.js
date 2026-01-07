const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.Mixed },
  answer: { type: mongoose.Schema.Types.Mixed },
});

const AttemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  attemptId: { type: String, required: true, index: true },
  // Optional client-side identifier to dedupe offline uploads
  clientId: { type: String, index: true, sparse: true },
  answers: [AnswerSchema],
  score: { type: Number, default: 0 },
  // Persist totals so history remains accurate if tests are edited
  totalQuestions: { type: Number },
  totalPoints: { type: Number },
  percentage: { type: Number },
  suspiciousEvents: { type: Array, default: [] },
  malpractice: { type: Boolean, default: false },
  malpracticeReason: { type: String },
  autoSubmitted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
});

// Indexes to keep admin analytics endpoints fast
AttemptSchema.index({ test: 1, submittedAt: -1 });
AttemptSchema.index({ test: 1, student: 1 });
AttemptSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model("Attempt", AttemptSchema);
