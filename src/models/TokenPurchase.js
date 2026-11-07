const { DataTypes, ValidationError } = require('sequelize');
const { sequelize } = require('../databases/connection');
const { MAX_TOKENS, isPrice } = require('../utils/tokenValues');

const immutable = [
  'order_id', 'user_id', 'token_bundle_id', 'idempotency_key',
  'bundle_name_snapshot', 'price_idr_snapshot', 'token_quota_snapshot', 'currency',
];

module.exports = sequelize.define(
  'TokenPurchase',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    order_id: {
      type: DataTypes.STRING(40), allowNull: false, unique: true,
      validate: { is: /^SOA-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/ },
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
    token_bundle_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, validate: { isInt: true, min: 1 } },
    idempotency_key: {
      type: DataTypes.STRING(80), allowNull: false,
      validate: { len: [8, 80], is: /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ },
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'paid', 'failed', 'cancelled', 'expired']] },
    },
    bundle_name_snapshot: {
      type: DataTypes.STRING(100), allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    price_idr_snapshot: {
      type: DataTypes.DECIMAL(15, 2), allowNull: false,
      validate: {
        positiveDecimal(value) {
          if (!isPrice(value)) throw new Error('Snapshot harga tidak valid');
        },
      },
    },
    token_quota_snapshot: {
      type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      validate: { isInt: true, min: 1, max: MAX_TOKENS },
    },
    currency: {
      type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IDR',
      validate: { isIn: [['IDR']] },
    },
  },
  {
    tableName: 'token_purchases',
    timestamps: true,
    // Financial history is retained; there is no purchase DELETE endpoint.
    paranoid: false,
    indexes: [
      { unique: true, name: 'uq_token_purchase_owner_key', fields: ['user_id', 'idempotency_key'] },
      { fields: ['user_id', 'createdAt'] },
      { fields: ['token_bundle_id'] },
    ],
    hooks: {
      beforeUpdate(purchase) {
        if (immutable.some((field) => purchase.changed(field))) {
          throw new ValidationError('Identitas dan snapshot order tidak boleh diubah');
        }
      },
      beforeBulkUpdate(options) {
        if (immutable.some((field) => Object.hasOwn(options.attributes, field))) {
          throw new ValidationError('Identitas dan snapshot order tidak boleh diubah');
        }
      },
      beforeDestroy() { throw new ValidationError('Histori order tidak boleh dihapus'); },
      beforeBulkDestroy() { throw new ValidationError('Histori order tidak boleh dihapus'); },
    },
  },
);
