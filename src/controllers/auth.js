const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');
const db = require('../models');
const User = db.User;

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_w7';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_w7';

// Helper verifikasi format hash scrypt
function verifyScryptPassword(plainPassword, storedHash) {
  try {
    const [salt, keyLength, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;

    const derivedKey = crypto.scryptSync(plainPassword, salt, parseInt(keyLength || 64));
    const originalBuffer = Buffer.from(originalHash, 'hex');

    return crypto.timingSafeEqual(derivedKey, originalBuffer);
  } catch (error) {
    console.error('Scrypt verification error:', error);
    return false;
  }
}

// Skema Validasi Joi
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  konfirmasi_password: Joi.any().valid(Joi.ref('password')).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// 1. Register Controller
exports.register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const normalizedEmail = value.email.toLowerCase();

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    const newUser = await User.create({
      name: value.name,
      email: normalizedEmail,
      password: value.password,
      role: 'user'
    });

    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };

    return res.status(201).json({ message: 'Registrasi berhasil.', user: userResponse });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 2. Login Controller
exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const normalizedEmail = value.email.toLowerCase();
    
    // Menggunakan scope 'withPassword' agar kolom password terbawa saat query
    const user = await User.scope('withPassword').findOne({
      where: { email: normalizedEmail },
      paranoid: true
    });

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const isValid = verifyScryptPassword(value.password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      message: 'Login berhasil.',
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 3. Refresh Token Controller
exports.refresh = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.status(401).json({ error: 'Unauthorized: Refresh token tidak ada.' });

    const refreshToken = cookies.refreshToken;
    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Forbidden: Refresh token tidak valid atau kedaluwarsa.' });

      const user = await User.findByPk(decoded.id);
      if (!user) return res.status(403).json({ error: 'Forbidden: Akun tidak ditemukan.' });

      const newAccessToken = jwt.sign({ id: user.id, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      return res.status(200).json({ accessToken: newAccessToken });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 4. Logout Controller
exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logout berhasil, sesi dibersihkan.' });
};

// 5. Get Profile Controller
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};