const userModel = require('../models/userModel');
const adminUserModel = require('../models/adminUserModel');

module.exports = async function (req, res, next) {
  try {
    // authMiddleware should have populated req.userId and req.userPayload already
    const userId = req.userId;
    const payload = req.userPayload || {};
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Only accept tokens issued specifically for admin sessions
    if (payload.token_type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - token admin requis' });
    }

    // Check dedicated admin_users table first
    const admin = await adminUserModel.findById(userId);
    if (admin) {
      if (admin.is_active === 0) return res.status(403).json({ error: 'Compte administrateur inactif' });
      req.user = admin;
      return next();
    }

    // Fallback: regular utilisateurs table with admin role
    const user = await userModel.findById(userId);
    if (!user) return res.status(403).json({ error: 'Forbidden - admin only' });
    const roleStr = (user.role || '').toString().toLowerCase();
    if (!roleStr.includes('admin')) return res.status(403).json({ error: 'Forbidden - admin only' });
    if (typeof user.is_active !== 'undefined' && user.is_active === 0) {
      return res.status(403).json({ error: 'Compte inactif' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('adminAuth error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
