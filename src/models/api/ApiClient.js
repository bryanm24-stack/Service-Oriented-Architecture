const { DataTypes } = require('sequelize');
const { sequelize } = require('../../databases/connection');

const ApiClient = sequelize.define('ApiClient', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    api_tier_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    key_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'api_clients',
    timestamps: true,
    indexes: [
        {
            name: 'uq_user_api_tier_name',
            unique: true,
            fields: ['user_id', 'api_tier_id', 'name']
        }
    ]
});

module.exports = ApiClient;