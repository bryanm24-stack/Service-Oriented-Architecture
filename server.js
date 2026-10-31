const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./models');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Middleware CORS untuk HTTP Only Cookie & Frontend Vite (port 5173)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prefix Route Autentikasi
app.use('/api/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend SOA W7 Autentikasi berjalan dengan baik.' });
});

// Global Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 5000;

db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database berhasil terhubung.');
    app.listen(PORT, () => {
      console.log(`Server aktif pada http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal terhubung ke database:', err);
  });