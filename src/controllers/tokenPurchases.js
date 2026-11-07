const { TokenPurchase } = require('../models');
const { parse } = require('../utils/validation/resourceSchemas');
const schema = require('../utils/validation/tokenSchemas');
const service = require('../services/tokenPurchases');
const checkout = require('../services/tokenCheckout');

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
  await checkout.startCheckout(input(req));
  res.status(204).send();
};

module.exports = { create, list, show, inspectCheckout, startCheckout };
