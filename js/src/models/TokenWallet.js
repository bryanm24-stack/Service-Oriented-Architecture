const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

module.exports = sequelize.define('TokenWallet', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  available_tokens: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  reserved_tokens: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  // Compatibility mirror for older catalog clients; wallet services never use it as source of truth.
  balance: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
}, { tableName: 'token_wallets', timestamps: true });
