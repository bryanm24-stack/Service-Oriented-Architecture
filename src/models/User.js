const { Sequelize, DataTypes } = require('sequelize');
// 1. Destructure 'sequelize' dari import
const { sequelize } = require('../databases/connection'); 

// 2. Gunakan sequelize.define, bukan connection.define
const User = sequelize.define('User', {
// ...
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: "Format email tidak valid"
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: {
                args: [8, 100],
                msg: "Password minimal 8 karakter"
            }
        }
    },
    profile_info: {
    type: DataTypes.VIRTUAL,
    get() {
        return `${this.name} (${this.email})`;
    }
}
}, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Wajib ada untuk soft delete
    deletedAt: 'deletedAt'
});

module.exports = User