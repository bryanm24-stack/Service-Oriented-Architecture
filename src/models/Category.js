const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define(
    'Category',
    {
        id_category: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        nama_category: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    },
    {
        tableName: 'categories',
        timestamps: true
    }
);

module.exports = Category;