const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

module.exports = sequelize.define('TokenLedger', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token_purchase_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, unique: true },
  event_key: { type: DataTypes.STRING(120), allowNull: true, unique: true },
  entry_type: { type: DataTypes.ENUM('credit', 'debit', 'reserve', 'release'), allowNull: false, defaultValue: 'credit' },
  status: { type: DataTypes.ENUM('completed', 'reserved', 'failed', 'needs_reconciliation'), allowNull: false, defaultValue: 'completed' },
  amount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  available_after: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  reserved_after: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  balance_after: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  reason: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'purchase' },
}, { tableName: 'token_ledgers', timestamps: true });
