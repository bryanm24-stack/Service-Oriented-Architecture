const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Wish = sequelize.define('Wish', {
  id_wish: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(180), allowNull: false, validate: { notEmpty: true, len: [2, 180] } },
  price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  payment_method: { type: DataTypes.ENUM('cash', 'installment'), allowNull: false },
  down_payment: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  tenor_months: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  installment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  status: { type: DataTypes.ENUM('planned', 'paid'), allowNull: false, defaultValue: 'planned' },
  paid_transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, { tableName: 'wishes', timestamps: true });

module.exports = Wish;
