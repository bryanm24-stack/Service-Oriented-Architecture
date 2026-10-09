/**
 * DAFTAR SEMUA MODEL
 */

const db = {};

const {
  sequelize,
} = require("../databases/connection");

const Buku = require("./Buku");
const Karakter = require("./Karakter");
const Category = require("./Category");


// ============================================================
// DAFTARKAN MODEL
// ============================================================

db.Buku = Buku(
  sequelize,
  sequelize.Sequelize
);

db.Karakter = Karakter(
  sequelize,
  sequelize.Sequelize
);

db.Category = Category(
  sequelize,
  sequelize.Sequelize
);


/*
 * Nanti setelah Dana membuat Transaction:
 *
 * const Transaction = require("./Transaction");
 *
 * db.Transaction = Transaction(
 *   sequelize,
 *   sequelize.Sequelize
 * );
 */


// ============================================================
// JALANKAN SEMUA RELASI
// ============================================================

for (const key of Object.keys(db)) {
  if (
    typeof db[key].associate === "function"
  ) {
    db[key].associate(db);
  }
}


// ============================================================
// INSTANCE SEQUELIZE
// ============================================================

db.sequelize = sequelize;

module.exports = db;