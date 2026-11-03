const { DataTypes } = require('sequelize');
const { sequelize } = require('../../databases/connection');

const ApiLog = sequelize.define('ApiLog', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    api_client_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    endpoint: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    request_method: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    status_code: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'api_log',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            name: 'idx_api_log_client_created',
            fields: ['api_client_id', 'created_at']
        }
    ]
});

module.exports = ApiLog;
