const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String },
  points: { type: Number, default: 1 },
});

const TestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  questions: [QuestionSchema],
  // Restrict visibility/eligibility to a specific group of students
  assignedTo: {
    dept: { type: String, required: true },
    semester: { type: String },
    section: { type: String },
    year: { type: String },
  },
  durationMinutes: { type: Number, default: 30 },
  attemptsAllowed: { type: Number, default: 1 },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: true },
  startAt: { type: Date },
  endAt: { type: Date },
  // Polymorphic reference: could be Admin (typical) or User (if needed)
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' },
  createdByModel: { type: String, enum: ['User', 'Admin'], default: 'Admin' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Test', TestSchema);
