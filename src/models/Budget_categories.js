const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const BudgetCategory = sequelize.define('Budget_categories', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    allocated_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    tableName: 'budget_categories',
    timestamps: true,
    indexes: [
        {
            name: 'uq_budget_category',
            unique: true,
            fields: ['budget_id', 'category_id']
        }
    ]
});

module.exports = BudgetCategory;
