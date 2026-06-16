const { pool } = require('../db');

// Accepts BUSINESS_ADMIN and BUSINESS_MEMBER via JWT role.
// Fallback: accepts any user with an active (or pending) Business plan subscription,
// so accounts waiting for admin validation aren't locked out.
module.exports = async function requireBusinessAccess(req, res, next) {
  const role = (req.userPayload?.role || '').toString().toUpperCase();
  if (role === 'BUSINESS_ADMIN' || role === 'BUSINESS_MEMBER') return next();

  try {
    const userId = req.userPayload?.sub;
    if (userId) {
      const [rows] = await pool.query(
        `SELECT a.id FROM abonnements a
         JOIN plans p ON p.id = a.plan_id
         WHERE a.utilisateur_id = ?
           AND a.statut IN ('active', 'pending_admin')
           AND LOWER(p.slug) LIKE '%business%'
         LIMIT 1`,
        [userId]
      );
      if (rows && rows.length > 0) return next();
    }
  } catch (e) { /* ignore, fall through */ }

  return res.status(403).json({ error: 'Accès réservé aux utilisateurs Business' });
};
