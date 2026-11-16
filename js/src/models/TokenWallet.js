const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

module.exports = sequelize.define('TokenWallet', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  balance: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'token_wallets',
  timestamps: true,
});
