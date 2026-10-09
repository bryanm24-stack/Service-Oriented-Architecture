/**
 * DAFTAR MODEL — MINGGU 4
 * =======================
 *
 * Satu tempat yang membangun semua model terhadap koneksi yang sama,
 * lalu MENYALAKAN semua relasi.
 *
 * Kenapa dua langkah (bangun dulu, relasi belakangan)?
 *
 * `static associate(models)` di dalam model merujuk ke model LAIN lewat
 * nama — Buku.hasMany(models.Karakter, ...). Kalau relasi dinyatakan
 * langsung saat model masih dibangun satu per satu, ada kemungkinan
 * model yang dirujuk belum ada -> "Cannot read property 'Karakter' of
 * undefined" — error yang membingungkan padahal penyebabnya cuma urutan.
 *
 * Maka: bangun SEMUA model dulu, baru jalankan SEMUA associate().
 * Pola ini disalin dari struktur model standar Sequelize (yang juga
 * dipakai minggu referensi), jadi kalian akan menemukannya lagi nanti.
 *
 * Kalau kalian menambah model baru (Latihan 6: Penulis), langkahnya:
 *   1. buat src/models/Penulis.js
 *   2. require + daftarkan di objek `db` di bawah
 *   3. selesai — associate() model lain bisa langsung merujuknya.
 */
const db = {};

const { sequelize } = require("../databases/connection");

const Buku = require("./Buku");
const Karakter = require("./Karakter");
const Category = require("./Category");
const User = require("./User");

db.Buku = Buku(sequelize, sequelize.Sequelize);
db.Karakter = Karakter(sequelize, sequelize.Sequelize);
db.Category = Category(sequelize, sequelize.Sequelize);
// User.js sudah mengekspor model yang diinisialisasi.
db.User = User;

// Relasi dinyatakan SETELAH semua model ada. Urutan di objek `db`
// tidak penting; yang penting semua sudah terdaftar di baris atas.
for (const key of Object.keys(db)) {
  if (typeof db[key].associate === "function") {
    db[key].associate(db);
  }
}

db.sequelize = sequelize;
module.exports = db;




//index.js(transaction, user, category)(Dana)

const sequelize = require('../config/database');

const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');

// Transaction -> Category
Transaction.belongsTo(Category, {
    foreignKey: 'id_category',
    as: 'category'
});

// Transaction -> User
Transaction.belongsTo(User, {
    foreignKey: 'id_user',
    as: 'user'
});

// Category -> Transaction
Category.hasMany(Transaction, {
    foreignKey: 'id_category',
    as: 'transactions'
});

// User -> Transaction
User.hasMany(Transaction, {
    foreignKey: 'id_user',
    as: 'transactions'
});

module.exports = {
    sequelize,
    User,
    Category,
    Transaction
};