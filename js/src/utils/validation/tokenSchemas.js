const Joi = require('joi');
const { MAX_TOKENS, normalizeName, isPrice, decimalPrice } = require('../tokenValues');

const id = Joi.number().integer().min(1).max(2147483647);
const price = Joi.string().strict().custom((value, helpers) =>
  isPrice(value) ? decimalPrice(value) : helpers.error('any.invalid'),
).messages({ 'any.invalid': 'price_idr harus string desimal positif, maksimal 13 digit dan 2 desimal' });
const fields = {
  name: Joi.string().trim().max(100).custom(normalizeName).min(1),
  token_quota: Joi.number().integer().min(1).max(MAX_TOKENS).strict(),
  price_idr: price,
  is_active: Joi.boolean().strict(),
};
const bundleCreate = Joi.object(fields).fork(Object.keys(fields), (field) => field.required()).unknown(false);
const bundlePatch = Joi.object(fields).min(1).unknown(false);
const empty = Joi.object({}).unknown(false);
const pagination = {
  limit: Joi.number().integer().min(1).max(100).default(12),
  offset: Joi.number().integer().min(0).max(10000000).default(0),
};
const list = Joi.object(pagination).unknown(false);
const adminList = Joi.object({
  ...pagination,
  status: Joi.string().valid('all', 'active', 'inactive', 'archived').default('all'),
}).unknown(false);
const purchaseCreate = Joi.object({ token_bundle_id: id.required() }).unknown(false);
const idempotencyKey = Joi.string().min(8).max(80).pattern(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/).required();
const orderId = Joi.string().pattern(/^SOA-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/).required();
const purchasesList = Joi.object({
  ...pagination,
  status: Joi.string().valid('pending', 'paid', 'failed', 'cancelled', 'expired', 'needs_review'),
}).unknown(false);
const midtransNotification = Joi.object({
  order_id: Joi.string().trim().min(1).max(255).required(),
  status_code: Joi.string().pattern(/^\d{3}$/).required(),
  gross_amount: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  signature_key: Joi.string().hex().length(128).required(),
  transaction_id: Joi.string().trim().max(255).allow(''),
  transaction_status: Joi.string().valid(
    'authorize', 'capture', 'settlement', 'pending', 'deny', 'cancel', 'expire',
    'failure', 'refund', 'partial_refund', 'chargeback', 'partial_chargeback',
  ).required(),
  fraud_status: Joi.string().valid('accept', 'challenge', 'deny').allow(''),
  currency: Joi.string().uppercase().length(3).required(),
  payment_type: Joi.string().max(64).allow(''),
  transaction_time: Joi.string().max(64).allow(''),
}).unknown(true);

module.exports = {
  bundleCreate, bundlePut: bundleCreate, bundlePatch, list, adminList,
  empty, purchaseCreate, idempotencyKey, orderId, purchasesList, midtransNotification,
};
