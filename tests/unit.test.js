const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const { hashPassword, verifyPassword } = require('../src/utils/password');
const { parse } = require('../src/utils/validation/resourceSchemas');
const schema = require('../src/utils/validation/transactionSchemas');
const { plan } = require('../src/services/transactionQuery');
const { toCents, fromCents } = require('../src/utils/money');
const { getMidtransConfig } = require('../src/services/midtrans');
const { mapUpstreamError } = require('../src/services/upstream');
test('Password lama scrypt tetap kompatibel, hash berbeda per salt, input salah ditolak', async () => {
  const first = await hashPassword('Password123!'),
    second = await hashPassword('Password123!');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('Password123!', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
  assert.equal(await verifyPassword('Password123!', 'plaintext'), false);
});
test('Validasi create/PUT/PATCH, enum, nominal dan rentang tanggal', () => {
  assert.equal(parse(schema.create, { id_category: 1, nominal: '0.00' }).type, 'expense');
  for (const v of [
    { id_category: 1, nominal: '-1' },
    { id_category: 1, nominal: '1.234' },
    { id_category: 1, nominal: '3', type: 'other' },
    { id_category: 1, nominal: '3', role: 'admin' },
  ])
    assert.throws(() => parse(schema.create, v));
  assert.throws(() => parse(schema.patch, {}));
  assert.throws(() => parse(schema.patch, { id_user: 2 }));
  assert.throws(() => parse(schema.put, { id_category: 1, nominal: '2', catatan: null }));
  assert.throws(() => parse(schema.query, { start_date: '2026-02-30' }));
  assert.throws(() => parse(schema.query, { start_date: '2026-11-20', end_date: '2026-11-01' }));
  assert.throws(() => parse(schema.query, { period: '2026-11', start_date: '2026-11-01' }));
});
test('Satu query plan membatasi owner ORM/raw, semua parameter terpisah dan batas tanggal Jakarta', () => {
  const req = {
    user: { id: 7, role: 'user' },
    query: { period: '2026-11', search: "'; DROP TABLE users;--", type: 'income', category_id: 3 },
  };
  const p = plan(req);
  assert.equal(p.where.id_user, 7);
  assert.equal(p.replacements.id_user, 7);
  assert.equal(p.where.type, 'income');
  assert.equal(p.where.createdAt[Op.gte].toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(p.where.createdAt[Op.lt].toISOString(), '2026-11-30T17:00:00.000Z');
  assert.equal(p.replacements.start, '2026-10-31 17:00:00');
  assert.equal(p.replacements.end, '2026-11-30 17:00:00');
  assert(!p.sqlWhere.includes(req.query.search));
  assert.equal(p.replacements.search, '%' + req.query.search + '%');
  assert.throws(
    () => plan({ ...req, query: { user_id: 8 } }),
    (e) => e.status === 404,
  );
  assert.equal(plan({ user: { id: 7, role: 'admin' }, query: {} }).where.id_user, undefined);
});
test('Uang tetap presisi, konfigurasi provider salah dan timeout jelas', () => {
  assert.equal(fromCents(toCents('0.10') + toCents('0.20')), '0.30');
  assert.equal(fromCents(0n - toCents('100.01')), '-100.01');
  assert.throws(
    () => getMidtransConfig(1, {}),
    (e) => e.status === 503,
  );
  assert.equal(mapUpstreamError({ code: 'ETIMEDOUT' }).status, 504);
});
