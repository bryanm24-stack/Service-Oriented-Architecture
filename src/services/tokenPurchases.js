const { randomUUID } = require('node:crypto');
const { User, TokenBundle, TokenPurchase, sequelize } = require('../models');
const httpError = require('../utils/httpError');
const { decimalPrice } = require('../utils/tokenValues');

// The current bundle is metadata only. Always display/order by the immutable snapshots.
const bundleInclude = {
  model: TokenBundle, as: 'bundle', paranoid: false, required: false,
  attributes: ['id', 'name', 'is_active', 'deletedAt'],
};
const location = (purchase) => '/api/v1/token-purchases/' + purchase.order_id;
const present = (row) => {
  const data = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  delete data.idempotency_key;
  return {
    ...data,
    checkout: {
      available: false,
      href: location(data) + '/checkout',
      reason: 'Pembayaran belum tersedia. Order pending belum menambah kuota.',
    },
  };
};

// Serializing on the owner prevents two parallel requests with the same key
// from producing two orders, including requests for different bundles.
const createLocalOrder = async ({ userId, bundleId, idempotencyKey }) =>
  sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw httpError(401, 'Akun tidak tersedia');
    const existing = await TokenPurchase.findOne({
      where: { user_id: userId, idempotency_key: idempotencyKey },
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      if (existing.token_bundle_id !== bundleId) {
        throw httpError(409, 'Idempotency-Key sudah dipakai untuk paket yang berbeda');
      }
      return { purchase: existing, created: false };
    }
    const bundle = await TokenBundle.findByPk(bundleId, {
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!bundle || !bundle.is_active) throw httpError(404, 'Paket aktif tidak tersedia');
    const purchase = await TokenPurchase.create({
      order_id: 'SOA-' + randomUUID(),
      user_id: userId,
      token_bundle_id: bundle.id,
      idempotency_key: idempotencyKey,
      status: 'pending',
      bundle_name_snapshot: bundle.name,
      price_idr_snapshot: decimalPrice(String(bundle.price_idr)),
      token_quota_snapshot: bundle.token_quota,
      currency: 'IDR',
    }, { transaction });
    return { purchase, created: true };
  });

const findOwnedOrder = async (orderId, userId) => {
  const purchase = await TokenPurchase.findOne({
    where: { order_id: orderId, user_id: userId },
    include: [bundleInclude],
  });
  if (!purchase) throw httpError(404, 'Order tidak ditemukan');
  return purchase;
};

module.exports = { createLocalOrder, findOwnedOrder, bundleInclude, present, location };
