const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const RecurringOccurrence = sequelize.define('RecurringOccurrence', {
  id_occurrence: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  recurring_cost_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  scheduled_for: { type: DataTypes.DATEONLY, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status: { type: DataTypes.ENUM('planned', 'paid', 'locked'), allowNull: false, defaultValue: 'planned' },
  transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  locked_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'recurring_occurrences', timestamps: true });

module.exports = RecurringOccurrence;
