const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

module.exports = sequelize.define('TokenLedger', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token_purchase_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  amount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  balance_after: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  reason: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'purchase' },
}, {
  tableName: 'token_ledgers',
  timestamps: true,
});
