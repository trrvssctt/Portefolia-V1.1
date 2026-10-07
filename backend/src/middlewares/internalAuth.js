// Protège les routes /api/internal/* appelées par n8n (en-tête X-Internal-Key)
const crypto = require('crypto');

module.exports = function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY || '';
  const given = req.get('X-Internal-Key') || '';
  const ok = expected.length > 0 && given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? next() : res.status(401).json({ error: 'unauthorized' });
};
