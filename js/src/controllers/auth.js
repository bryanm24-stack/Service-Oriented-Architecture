const jwt = require('jsonwebtoken');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const Joi = require('joi');
const { User, AuthSession, sequelize } = require('../models');
const { hashPassword, verifyPassword } = require('../utils/password');
const { parse } = require('../utils/validation/resourceSchemas');
const { settings } = require('../middlewares/auth');
const httpError = require('../utils/httpError');
const digest = (token) => createHash('sha256').update(token).digest('hex');
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().lowercase().email().max(255).required(),
  password: Joi.string().min(8).max(100).required(),
  konfirmasi_password: Joi.string().valid(Joi.ref('password')).required(),
});
const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(1).max(100).required(),
});
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
});
const access = (user, sessionId) => {
  const cfg = settings();
  return jwt.sign({ role: user.role, sid: sessionId }, cfg.secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    issuer: cfg.issuer,
    audience: cfg.audience,
    expiresIn: '15m',
    jwtid: randomUUID(),
  });
};
const register = async (req, res) => {
  const values = parse(registerSchema, req.body);
  const user = await User.create({
    name: values.name,
    email: values.email,
    password: await hashPassword(values.password),
    role: 'user',
  });
  res
    .location(`/api/v1/users/${user.id}`)
    .status(201)
    .json({ message: 'Akun berhasil didaftarkan. Silakan login.', user: publicUser(user) });
};
const login = async (req, res) => {
  settings();
  const values = parse(loginSchema, req.body);
  const user = await User.scope('withPassword').findOne({ where: { email: values.email } });
  if (!user || !(await verifyPassword(values.password, user.password)))
    throw httpError(401, 'Email atau password salah');
  const refresh = randomBytes(48).toString('hex');
  const session = await AuthSession.create({
    id: randomUUID(),
    user_id: user.id,
    token_hash: digest(refresh),
    expires_at: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie('refreshToken', refresh, { ...cookieOptions(), maxAge: 7 * 86400000 });
  res
    .set('Cache-Control', 'no-store')
    .json({
      accessToken: access(user, session.id),
      tokenType: 'Bearer',
      expiresIn: 900,
      user: publicUser(user),
    });
};
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token || !/^[a-f0-9]{96}$/.test(token)) throw httpError(401, 'Silakan login kembali');
  const nextToken = randomBytes(48).toString('hex');
  const result = await sequelize.transaction(async (transaction) => {
    const session = await AuthSession.findOne({
      where: { token_hash: digest(token) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date())
      throw httpError(401, 'Sesi sudah berakhir');
    const user = await User.findByPk(session.user_id, { transaction });
    if (!user) throw httpError(401, 'Akun tidak tersedia');
    await session.update({ token_hash: digest(nextToken) }, { transaction });
    return { accessToken: access(user, session.id), user: publicUser(user) };
  });
  res.cookie('refreshToken', nextToken, { ...cookieOptions(), maxAge: 7 * 86400000 });
  res.set('Cache-Control', 'no-store').json({ ...result, expiresIn: 900, tokenType: 'Bearer' });
};
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token)
    await AuthSession.update({ revoked_at: new Date() }, { where: { token_hash: digest(token) } });
  if (req.user?.sessionId)
    await AuthSession.update({ revoked_at: new Date() }, { where: { id: req.user.sessionId } });
  res.clearCookie('refreshToken', cookieOptions());
  res.status(204).send();
};
const getProfile = async (req, res) =>
  res.json({ user: publicUser(await User.findByPk(req.user.id)) });
module.exports = { register, login, refresh, logout, getProfile };
