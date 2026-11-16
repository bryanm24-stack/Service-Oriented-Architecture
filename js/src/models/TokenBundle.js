const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');
const { MAX_TOKENS, normalizeName, isPrice } = require('../utils/tokenValues');

module.exports = sequelize.define(
  'TokenBundle',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) { this.setDataValue('name', normalizeName(value)); },
      validate: { notEmpty: true, len: [1, 100] },
    },
    token_quota: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: { isInt: true, min: 1, max: MAX_TOKENS },
    },
    price_idr: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        positiveDecimal(value) {
          if (!isPrice(value)) throw new Error('Harga IDR tidak valid');
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        booleanOnly(value) {
          if (typeof value !== 'boolean') throw new Error('Status aktif harus boolean');
        },
      },
    },
  },
  {
    tableName: 'token_bundles',
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['is_active', 'deletedAt'] }],
  },
);
