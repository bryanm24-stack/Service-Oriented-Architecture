const { TokenPurchase } = require('../models');
const { parse } = require('../utils/validation/resourceSchemas');
const schema = require('../utils/validation/tokenSchemas');
const service = require('../services/tokenPurchases');
const walletService = require('../services/tokenWallet');
const checkout = require('../services/tokenCheckout');
const Joi = require('joi');

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

const syncPayment = async (req, res) => {
  parse(schema.empty, req.body || {});
  res.json({ data: await checkout.syncOwnedPayment(input(req)) });
};

const notification = async (req, res) => {
  const payload = parse(Joi.object({
    order_id: Joi.string().trim().min(1).max(255).required(),
    transaction_id: Joi.string().trim().min(1).max(255),
  }).unknown(true), req.body);
  // Never trust status/amount/signature sent by the caller. Confirm directly
  // with Midtrans; this also supports separate Signature Secret Key accounts.
  const result = await checkout.reconcileByOrder({ orderId: payload.order_id, transactionIdHint: payload.transaction_id });
  if (!result.provider_found) return res.status(503).json({ msg: 'Status order belum tersedia di Midtrans; coba kembali.' });
  return res.json({ data: { accepted: true, granted: result.granted } });
};

module.exports = { create, list, wallet, ledger, show, inspectCheckout, startCheckout, syncPayment, notification };
