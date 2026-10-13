const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Budget = sequelize.define('Budget', {
    budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            isInt: true
        }
    },
    month: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
            min: 1,
            max: 12,
            isInt: true
        }
    },
    year: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
            min: 2000,
            max: 2100,
            isInt: true
        }
    },
    keterangan: {
        type: DataTypes.VIRTUAL,
        get() {
            return `Anggaran ${this.month}/${this.year} untuk user ${this.user_id}`;
        }
    }
}, {
    tableName: 'budget',
    timestamps: true,
    indexes: [
        {
            name: 'uq_budget_user_period',
            unique: true,
            fields: ['user_id', 'month', 'year']
        }
    ]
});

module.exports = Budget;
