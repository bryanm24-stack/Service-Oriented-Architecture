const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 255]
            },
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: "Format email tidak valid"
                }
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                len: {
                    args: [8, 255],
                    msg: "Password tersimpan harus 8-255 karakter"
                }
            },
        },
        profile_info: {
            type: DataTypes.VIRTUAL,
            get() {
                return `${this.name} (${this.email})`;
            },
        },
    },
    {
        tableName: "users",
        timestamps: true,
        paranoid: true,
        defaultScope: {
            attributes: {
                exclude: ["password"]
            }
        }
    }
);

module.exports = User;
