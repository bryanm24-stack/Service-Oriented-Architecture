const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Transaction = sequelize.define(
    'Transaction',
    {
        id_transaction: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        id_category: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        id_user: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        nominal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            validate: {
                min: 0
            }
        },
        catatan: {
            type: DataTypes.TEXT,
            allowNull: true
        },
    },
    {
        tableName: "transactions",
        timestamps: true
    }
);

module.exports = Transaction;
