const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define(
    'Transaction',
    {
        id_transaction: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        id_category: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        id_user: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        nominal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },

        catatan: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName: 'transactions',
        timestamps: true
    }
);

module.exports = Transaction;