const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_w7';

// 1. verifyJWT: Memeriksa Access Token dari Header Authorization
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token akses tidak ditemukan.' });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Token tidak valid atau kedaluwarsa.' });
    }
    // Menyimpan payload token ke req.user ({ id, role })
    req.user = decoded;
    next();
  });
};

// 2. checkRoles: Role-Based Access Control (RBAC)
const checkRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Anda tidak memiliki hak akses.' });
    }
    next();
  };
};

// 3. checkOwnership: Memastikan user hanya bisa mengakses datanya sendiri (atau jika Admin)
const checkOwnership = (resourceUserId) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({ error: 'Forbidden: Anda bukan pemilik resource ini.' });
    }
    next();
  };
};

module.exports = { verifyJWT, checkRoles, checkOwnership };