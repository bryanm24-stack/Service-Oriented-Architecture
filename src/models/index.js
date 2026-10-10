const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');

const db = {
    Buku: require('./Buku')(sequelize, DataTypes),
    Karakter: require('./Karakter')(sequelize, DataTypes),
    User,
    Category,
    Transaction
};

// Buku dan Karakter mempertahankan pola factory dari materi.
for (const model of [db.Buku, db.Karakter]) {
    if (typeof model.associate === 'function') {
        model.associate(db);
    }
}

// Seluruh model sudah tersedia sebelum relasi dipasang.

User.hasMany(db.Transaction, {
    foreignKey: "id_user",
    as: "transactions",
    onDelete: "RESTRICT",
});

Category.hasMany(db.Transaction, {
    foreignKey: "id_category",
    as: "transactions",
    onDelete: "RESTRICT",
});

Transaction.belongsTo(db.Category, {
    foreignKey: "id_category",
    as: "category",
    onDelete: "RESTRICT",
});

Transaction.belongsTo(db.User, {
    foreignKey: "id_user",
    as: "user",
    onDelete: "RESTRICT",
});

db.sequelize = sequelize;

module.exports = db;
