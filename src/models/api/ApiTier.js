const { DataTypes } = require('sequelize');
const { sequelize } = require('../../databases/connection');

const ApiTier = sequelize.define('ApiTier', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    rate_limit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    window_seconds: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'api_tiers',
    timestamps: true,
    indexes: [
        {
            name: 'uq_name',
            unique: true,
            fields: ['name']
        }
    ]
});

module.exports = ApiTier;
