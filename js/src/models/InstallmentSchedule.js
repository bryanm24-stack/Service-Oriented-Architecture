const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const InstallmentSchedule = sequelize.define('InstallmentSchedule', {
  id_installment: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  wish_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  period_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status: { type: DataTypes.ENUM('planned', 'paid'), allowNull: false, defaultValue: 'planned' },
  transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, { tableName: 'installment_schedules', timestamps: true });

module.exports = InstallmentSchedule;
