const { TokenPurchase } = require('../models');
const { parse } = require('../utils/validation/resourceSchemas');
const schema = require('../utils/validation/tokenSchemas');
const service = require('../services/tokenPurchases');
const walletService = require('../services/tokenWallet');
const checkout = require('../services/tokenCheckout');
const { verifyNotificationSignature } = require('../services/midtrans');

const create = async (req, res) => {
  parse(schema.empty, req.query);
  const { token_bundle_id } = parse(schema.purchaseCreate, req.body);
  const idempotencyKey = parse(schema.idempotencyKey, req.get('Idempotency-Key'));
  const result = await service.createLocalOrder({
    userId: req.user.id, bundleId: token_bundle_id, idempotencyKey,
  });
  res.location(service.location(result.purchase)).status(result.created ? 201 : 200)
    .set('Idempotency-Replayed', result.created ? 'false' : 'true')
    .json({ data: service.present(result.purchase) });
};
const list = async (req, res) => {
  const { limit, offset, status } = parse(schema.purchasesList, req.query);
  const { rows, count } = await TokenPurchase.findAndCountAll({
    where: { user_id: req.user.id, ...(status ? { status } : {}) },
    include: [service.bundleInclude],
    order: [['id', 'DESC']], limit, offset,
  });
  res.json({ data: rows.map(service.present), meta: { total: count, limit, offset } });
};
const wallet = async (req, res) => res.json({ data: await walletService.walletSummary(req.user.id) });
const ledger = async (req, res) => {
  const { limit, offset, type, start_date, end_date } = parse(require('joi').object({ limit: require('joi').number().integer().min(1).max(50).default(10), offset: require('joi').number().integer().min(0).max(1000000).default(0), type: require('joi').string().valid('credit','debit','reserve','release'), start_date: require('joi').string().pattern(/^\d{4}-\d{2}-\d{2}$/), end_date: require('joi').string().pattern(/^\d{4}-\d{2}-\d{2}$/) }).unknown(false), req.query);
  const { rows, count } = await walletService.ledgerList({ userId: req.user.id, limit, offset, type, startDate: start_date, endDate: end_date });
  res.json({ data: rows, meta: { total: count, limit, offset } });
};
const input = (req) => {
  parse(schema.empty, req.query);
  return { userId: req.user.id, orderId: parse(schema.orderId, req.params.orderId) };
};
const show = async (req, res) => {
  const values = input(req);
  res.json({ data: service.present(await service.findOwnedOrder(values.orderId, values.userId)) });
};
const inspectCheckout = async (req, res) => res.json({ data: await checkout.inspectCheckout(input(req)) });
const startCheckout = async (req, res) => {
  parse(schema.empty, req.body || {});
  const result = await checkout.startCheckout(input(req));
  res.json({ data: result });
};

const notification = async (req, res) => {
  const payload = parse(schema.midtransNotification, req.body);
  if (!verifyNotificationSignature(payload)) {
    return res.status(401).json({ msg: 'Signature Midtrans tidak valid' });
  }
  const purchase = await TokenPurchase.findOne({ where: { order_id: payload.order_id } });
  if (!purchase) return res.status(404).json({ msg: 'Order tidak ditemukan' });
  const provider = {
    currency: payload.currency,
    gross_amount: payload.gross_amount,
    transaction_id: payload.transaction_id,
    transaction_status: payload.transaction_status,
    fraud_status: payload.fraud_status,
    selected_response: {
      order_id: payload.order_id,
      status_code: payload.status_code,
      gross_amount: payload.gross_amount,
      currency: payload.currency,
      transaction_id: payload.transaction_id || null,
      transaction_status: payload.transaction_status,
      fraud_status: payload.fraud_status || null,
      payment_type: payload.payment_type || null,
      transaction_time: payload.transaction_time || null,
    },
  };
  const result = await checkout.grantPaidPurchase({ orderId: payload.order_id, provider });
  return res.json({ data: { accepted: true, granted: result.granted } });
};

module.exports = { create, list, wallet, ledger, show, inspectCheckout, startCheckout, notification };
