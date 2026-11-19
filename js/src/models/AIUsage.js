const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

module.exports = sequelize.define('AIUsage', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  idempotency_key: { type: DataTypes.STRING(80), allowNull: false },
  prompt_hash: { type: DataTypes.STRING(64), allowNull: false },
  provider: { type: DataTypes.STRING(40), allowNull: true },
  model: { type: DataTypes.STRING(120), allowNull: true },
  status: { type: DataTypes.ENUM('reserved', 'completed', 'failed', 'needs_reconciliation'), allowNull: false, defaultValue: 'reserved' },
  reserved_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  input_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  output_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  provider_total_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  thinking_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  cache_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  tool_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  actual_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  response_text: { type: DataTypes.TEXT('long'), allowNull: true },
  error_code: { type: DataTypes.STRING(64), allowNull: true },
  dispatch_started_at: { type: DataTypes.DATE, allowNull: true },
  reservation_expires_at: { type: DataTypes.DATE, allowNull: false },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'ai_usages', timestamps: true,
  indexes: [
    { name: 'uq_ai_usage_owner_idempotency', unique: true, fields: ['user_id', 'idempotency_key'] },
    { name: 'idx_ai_usage_owner_created', fields: ['user_id', 'createdAt'] },
    { name: 'idx_ai_usage_status_expiry', fields: ['status', 'reservation_expires_at'] },
  ],
});
