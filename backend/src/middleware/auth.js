const User = require('../models/User');
const Admin = require('../models/Admin');

async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const isAdmin = req.session.userType === 'admin';
    let user = null;
    if (isAdmin) {
      user = await Admin.findById(req.session.userId).lean();
    } else {
      user = await User.findById(req.session.userId).lean();
    }
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    // Ensure role is present (admin docs have role preset)
    if (!user.role) user.role = isAdmin ? 'admin' : 'student';
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden - admin only' });
  next();
}

module.exports = { requireAuth, requireAdmin };
