const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models');
const { parse } = require('../src/utils/validation/resourceSchemas');
const schema = require('../src/utils/validation/tokenSchemas');
const { decimalPrice } = require('../src/utils/tokenValues');
const { grantPaidPurchase } = require('../src/services/tokenCheckout');

const valid = { name: '  DEMO   Hemat  ', token_quota: 1000, price_idr: '15000', is_active: true };

test('Token: setter, DECIMAL string dan validasi model mencegah kuota/harga tidak valid', async () => {
  const bundle = db.TokenBundle.build(valid);
  await bundle.validate();
  assert.equal(bundle.name, 'DEMO Hemat');
  assert.equal(decimalPrice('15000.5'), '15000.50');
  assert.equal(decimalPrice('9999999999999.99'), '9999999999999.99');
  for (const values of [
    { name: '   ' }, { token_quota: 0 }, { token_quota: 1.5 }, { token_quota: 2147483648 },
    { price_idr: '-1' }, { price_idr: '0.00' }, { price_idr: '1.001' }, { price_idr: 15000 },
  ]) {
    await assert.rejects(db.TokenBundle.build({ ...valid, ...values }).validate());
  }
});

test('Token: semua field Joi, PUT lengkap/PATCH parsial, format uang dan mass assignment', () => {
  assert.deepEqual(parse(schema.bundleCreate, valid), { ...valid, name: 'DEMO Hemat', price_idr: '15000.00' });
  assert.deepEqual(parse(schema.bundlePatch, { price_idr: '12.34' }), { price_idr: '12.34' });
  for (const values of [{}, { name: 'Satu' }, { ...valid, user_id: 1 }, { ...valid, deletedAt: new Date() }]) {
    assert.throws(() => parse(schema.bundlePut, values), (error) => error.status === 400);
  }
  for (const values of [{}, { token_quota: '1000' }, { token_quota: -1 }, { price_idr: '1e5' }, { price_idr: 123 }, { is_active: 'true' }, { price_idr: '10000000000000' }]) {
    assert.throws(() => parse(schema.bundlePatch, values));
  }
  assert.deepEqual(parse(schema.purchaseCreate, { token_bundle_id: 1 }), { token_bundle_id: 1 });
  for (const field of ['user_id', 'price_idr', 'token_quota', 'status', 'currency', 'tier', 'idempotency_key']) {
    assert.throws(() => parse(schema.purchaseCreate, { token_bundle_id: 1, [field]: 'forged' }));
  }
  assert.throws(() => parse(schema.idempotencyKey, undefined));
  assert.throws(() => parse(schema.idempotencyKey, 'x; DROP TABLE'));
  assert.throws(() => parse(schema.list, { status: 'all' }));
});

test('Token: relasi historis mempertahankan N:M, FK, paranoid dan unique owner-key', () => {
  assert.equal(db.TokenBundle.sequelize, db.sequelize);
  assert.equal(db.TokenPurchase.sequelize, db.sequelize);
  assert.equal(db.User.associations.token_purchases.target, db.TokenPurchase);
  assert.equal(db.TokenBundle.associations.purchases.target, db.TokenPurchase);
  assert.equal(db.TokenPurchase.associations.bundle.target, db.TokenBundle);
  assert.equal(db.TokenPurchase.associations.user.target, db.User);
  assert.equal(db.TokenPurchase.rawAttributes.user_id.type.toSql(), db.User.rawAttributes.id.type.toSql());
  assert.equal(db.TokenPurchase.rawAttributes.token_bundle_id.type.toSql(), db.TokenBundle.rawAttributes.id.type.toSql());
  assert.equal(db.TokenBundle.options.paranoid, true);
  assert.equal(db.TokenPurchase.options.paranoid, false);
  assert.equal(db.TokenPurchase.rawAttributes.order_id.unique, true);
  assert(db.TokenPurchase.options.indexes.some((index) => index.unique && index.fields.join(',') === 'user_id,idempotency_key'));
  assert.equal(db.Budget.associations.categories.through.model, db.BudgetCategory);
});

test('Token: snapshot/identitas tidak bisa diubah lewat instance/bulk, kuota service masih terkunci', async () => {
  const purchase = db.TokenPurchase.build({
    order_id: 'SOA-00000000-0000-4000-8000-000000000001', user_id: 1, token_bundle_id: 1,
    idempotency_key: 'test-key-0001', status: 'pending', bundle_name_snapshot: 'Awal',
    price_idr_snapshot: '10.00', token_quota_snapshot: 10, currency: 'IDR',
  }, { isNewRecord: false });
  purchase.changed(false);
  purchase.price_idr_snapshot = '20.00';
  await assert.rejects(db.TokenPurchase.runHooks('beforeUpdate', purchase), /snapshot/);
  await assert.rejects(db.TokenPurchase.runHooks('beforeBulkUpdate', { attributes: { token_quota_snapshot: 99 } }), /snapshot/);
  await assert.rejects(db.TokenPurchase.runHooks('beforeDestroy', purchase), /Histori/);
  await assert.rejects(grantPaidPurchase({}), (error) => error.status === 503);
});
