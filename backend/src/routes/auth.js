const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');

// Register student
router.post('/register/student', async (req, res, next) => {
  try {
  let { name, email, password, dept, semester, year, section, enrollmentNumber, registerNumber } = req.body;
  email = (email || '').trim().toLowerCase();
    // ensure email not used by admin either
    const existing = await User.findOne({ email }) || await Admin.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = new User({ name, email, password, role: 'student', dept, semester, year, section, enrollmentNumber, registerNumber });
    await user.save();
    // set session
    req.session.userId = user._id;
    req.session.userType = 'student';
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, dept: user.dept, semester: user.semester, year: user.year, section: user.section, enrollmentNumber: user.enrollmentNumber, registerNumber: user.registerNumber } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'there is error' });
    }
    next(err);
  }
});

// Register admin
router.post('/register/admin', async (req, res, next) => {
  try {
  let { name, email, password, privateKey, dept, semester, year, section } = req.body;
  email = (email || '').trim().toLowerCase();
    const expected = process.env.REGISTRATION_KEY;
    if (!expected || !privateKey || privateKey !== expected) {
      return res.status(403).json({ error: 'Invalid registration key' });
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ error: 'Email already registered (admin)' });
    const existingStudent = await User.findOne({ email });
    // If a student exists with this email, migrate to admin (remove student record)
    if (existingStudent) {
      await User.deleteOne({ _id: existingStudent._id });
    }
    const admin = new Admin({ name, email, password, role: 'admin', dept, semester, year, section });
    await admin.save();
    req.session.userId = admin._id;
    req.session.userType = 'admin';
    res.json({ user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, dept: admin.dept, semester: admin.semester, year: admin.year, section: admin.section } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'there is a error' });
    }
    next(err);
  }
});

// List students (admin only)
const { requireAuth, requireAdmin } = require('../middleware/auth');
router.get('/students', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { semester, dept, section, page = '1', limit = '100' } = req.query;
    const query = { role: 'student' };
    if (semester) query.semester = String(semester);
    if (dept) query.dept = String(dept);
    if (section) query.section = String(section);
    const pageN = Math.max(parseInt(String(page), 10) || 1, 1);
    const limitN = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
    const skip = (pageN - 1) * limitN;
    const [items, total] = await Promise.all([
      User.find(query).select('name email semester section year dept enrollmentNumber registerNumber').sort({ createdAt: -1 }).skip(skip).limit(limitN).lean(),
      User.countDocuments(query),
    ]);
    const students = items.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      semester: u.semester,
      section: u.section,
      year: u.year,
      dept: u.dept,
      enrollmentNumber: u.enrollmentNumber,
      registerNumber: u.registerNumber,
      role: 'student'
    }));
    res.json({ students, total, page: pageN, limit: limitN });
  } catch (err) { next(err); }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();
    // Try admin first, then student
    let account = await Admin.findOne({ email });
    let type = 'admin';
    if (!account) {
      account = await User.findOne({ email });
      type = 'student';
    }
    if (!account) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await account.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = account._id;
    req.session.userType = type;
    const base = { id: account._id, name: account.name, email: account.email, role: type === 'admin' ? 'admin' : (account.role || 'student') };
    if (type === 'admin') {
      return res.json({ user: { ...base, dept: account.dept, semester: account.semester, year: account.year, section: account.section } });
    }
    return res.json({ user: { ...base, dept: account.dept, semester: account.semester, year: account.year, section: account.section, enrollmentNumber: account.enrollmentNumber, registerNumber: account.registerNumber } });
  } catch (err) {
    next(err);
  }
});

// me
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) return res.status(200).json({ user: null });
    const type = req.session.userType === 'admin' ? 'admin' : 'student';
    let user;
    if (type === 'admin') user = await Admin.findById(req.session.userId).lean();
    else user = await User.findById(req.session.userId).lean();
    if (!user) return res.status(200).json({ user: null });
    const base = { id: user._id, name: user.name, email: user.email, role: type === 'admin' ? 'admin' : (user.role || 'student') };
    if (type === 'admin') return res.json({ user: { ...base, dept: user.dept, semester: user.semester, year: user.year, section: user.section } });
    return res.json({ user: { ...base, dept: user.dept, semester: user.semester, year: user.year, section: user.section, enrollmentNumber: user.enrollmentNumber, registerNumber: user.registerNumber } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
