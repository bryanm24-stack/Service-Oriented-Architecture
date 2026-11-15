const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const RecurringCost = sequelize.define('RecurringCost', {
  id_recurring_cost: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name: { type: DataTypes.STRING(180), allowNull: false, validate: { notEmpty: true, len: [1, 180] } },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, validate: { min: 0.01 } },
  interval: { type: DataTypes.ENUM('monthly', 'yearly'), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  next_due_date: { type: DataTypes.DATEONLY, allowNull: false },
  due_day: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, validate: { min: 1, max: 31 } },
  status: { type: DataTypes.ENUM('active', 'paused'), allowNull: false, defaultValue: 'active' },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'recurring_costs', timestamps: true, paranoid: true });

module.exports = RecurringCost;
