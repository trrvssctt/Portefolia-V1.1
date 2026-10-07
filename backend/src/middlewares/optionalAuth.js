// Comme authMiddleware, mais ne bloque jamais : renseigne req.userId si un jeton valide est fourni
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = function optionalAuth(req, res, next) {
  const parts = (req.headers.authorization || '').split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const payload = jwt.verify(parts[1], JWT_SECRET);
      if (payload.token_type !== 'admin') {
        req.userId = payload.sub;
        req.userPayload = payload;
      }
    } catch { /* jeton invalide : on continue en anonyme */ }
  }
  next();
};
