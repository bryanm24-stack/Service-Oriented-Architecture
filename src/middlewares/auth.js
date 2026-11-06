const jwt = require('jsonwebtoken');
const { User, AuthSession } = require('../models');
const httpError = require('../utils/httpError');
const settings = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32)
    throw httpError(503, 'JWT belum dikonfigurasi; jalankan npm run auth:keys');
  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'projectsoa',
    audience: process.env.JWT_AUDIENCE || 'projectsoa-clients',
  };
};
const verifyJWT = async (req, res, next) => {
  try {
    const match = /^Bearer ([^ ]+)$/i.exec(req.get('Authorization') || '');
    if (!match) return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
    const config = settings();
    let decoded;
    try {
      decoded = jwt.verify(match[1], config.secret, {
        algorithms: ['HS256'],
        issuer: config.issuer,
        audience: config.audience,
      });
    } catch {
      return res.status(401).json({ message: 'Sesi tidak valid atau kedaluwarsa' });
    }
    if (!/^[1-9]\d*$/.test(decoded.sub || '') || !decoded.sid)
      return res.status(401).json({ message: 'Sesi tidak valid' });
    const [user, session] = await Promise.all([
      User.findByPk(Number(decoded.sub)),
      AuthSession.findByPk(decoded.sid),
    ]);
    if (
      !user ||
      !session ||
      session.user_id !== user.id ||
      session.revoked_at ||
      new Date(session.expires_at) <= new Date()
    )
      return res.status(401).json({ message: 'Sesi sudah berakhir' });
    req.user = {
      id: user.id,
      role: user.role === 'admin' ? 'admin' : 'user',
      sessionId: session.id,
    };
    next();
  } catch (error) {
    next(error);
  }
};
const checkRoles = (roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'Akses khusus administrator' });
module.exports = { verifyJWT, checkRoles, settings };
