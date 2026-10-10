const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 100]
            },
            set(value) {
                this.setDataValue("name", typeof value === "string"
                ? value.trim().replace(/\s+/g, " ") : value);
            },
        },
        icon: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        formatted_name: {
            type: DataTypes.VIRTUAL,
            get() {
                const name = this.getDataValue("name");

                return name ? name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : null;
            },
        },
    },
    {
        tableName: "categories",
        timestamps: true,
        defaultScope: {
            attributes: {
                exclude: ["createdAt", "updatedAt"]
            }
        }
    }
);

module.exports = Category;
