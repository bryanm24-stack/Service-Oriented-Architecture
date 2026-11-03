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

const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');
const BudgetCategory = require('./Budget_categories');
const ApiLog = require('./api/ApiLog');
const ApiTier = require('./api/ApiTier');
const ApiClient = require('./api/ApiClient');

const db = {
    User,
    Category,
    Transaction,
    Budget,
    BudgetCategory,
    Budget_categories: BudgetCategory,
    ApiLog,
    ApiTier,
    ApiClient,
};

db.Buku = Buku(sequelize, sequelize.Sequelize);
db.Karakter = Karakter(sequelize, sequelize.Sequelize);

// Relasi dinyatakan SETELAH semua model ada. Urutan di objek `db`
// tidak penting; yang penting semua sudah terdaftar di baris atas.
for (const key of Object.keys(db)) {
  if (typeof db[key].associate === "function") {
    db[key].associate(db);
  }
}

db.User.hasMany(db.ApiClient, {
    foreignKey: 'user_id',
    as: 'api_clients',
    onDelete: 'RESTRICT'
});

ApiClient.belongsTo(db.User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'RESTRICT'
});

ApiClient.belongsTo(db.ApiTier, {
    foreignKey: 'api_tier_id',
    as: 'api_tier',
    onDelete: 'RESTRICT'
});
ApiTier.hasMany(db.ApiClient, {
    foreignKey: 'api_tier_id',
    as: 'api_clients',
    onDelete: 'RESTRICT'
});
ApiClient.hasMany(db.ApiLog, {
    foreignKey: 'api_client_id',
    as: 'api_logs',
    onDelete: 'RESTRICT'
});
ApiLog.belongsTo(db.ApiClient, {
    foreignKey: 'api_client_id',
    as: 'api_client',
    onDelete: 'RESTRICT'
});

db.sequelize = sequelize;
module.exports = db;
