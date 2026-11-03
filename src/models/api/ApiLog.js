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
    indexes: [
        {
            name: 'uq_name',
            unique: true,
            fields: ['name']
        }
    ]
});

module.exports = ApiLog;