const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    let token = null;
    if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
    if (!token && req.query && typeof req.query.token === 'string') token = req.query.token;
    if (!token) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Missing Authorization header"');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    } catch (e) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Invalid or expired token"');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const isAdmin = payload.role === 'admin';
    const userId = payload.sub || payload.userId || payload.id;
    if (!userId) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Token missing subject"');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let user = null;
    if (isAdmin) user = await Admin.findById(userId).lean();
    else user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
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
