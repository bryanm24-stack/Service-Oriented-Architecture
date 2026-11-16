const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');
module.exports = sequelize.define(
  'AuthSession',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'auth_sessions', timestamps: true },
);
