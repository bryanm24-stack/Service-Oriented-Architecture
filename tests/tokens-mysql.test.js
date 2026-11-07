const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');

test('SOA-20261106-05 HTTP + SQL: katalog, admin, snapshot, concurrency dan histori', {
  skip: process.env.RUN_MYSQL_TESTS !== '1', timeout: 120000,
}, async (t) => {
  const name = 'soa_test_tokens_' + crypto.randomBytes(6).toString('hex');
  process.env.DB_NAME = name;
  process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
  process.env.JWT_ACCESS_SECRET = crypto.randomBytes(48).toString('hex');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  });
  const db = require('../src/models');
  const migrate = require('../scripts/migrate');
  const seed = require('../scripts/seed-token-bundles');
  const server = require('../index').listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const call = async (method, path, body, token, expected, key) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (expected !== undefined) assert.equal(response.status, expected, method + ' ' + path + ': ' + text);
    return { response, data };
  };
  const register = async (label) => {
    const values = { name: label, email: label + '@example.com', password: 'Password123!', konfirmasi_password: 'Password123!' };
    const created = await call('POST', '/auth/register', values, null, 201);
    const logged = await call('POST', '/auth/login', { email: values.email, password: values.password }, null, 200);
    return { id: created.data.user.id, token: logged.data.accessToken };
  };
  let user, other, admin, bundle, order, originalTier, legacy;
  try {
    await migrate();
    await connection.query('USE ' + mysql.escapeId(name));
    const [legacyInsert] = await connection.query("INSERT INTO categories(name,icon) VALUES('legacy-preserved','x')");
    legacy = legacyInsert.insertId;
    await migrate();
    await t.test('Migrasi additive dua kali; seed opt-in tidak menimpa edit paket', async () => {
      const [[row]] = await connection.query('SELECT name FROM categories WHERE id=?', [legacy]);
      assert.equal(row.name, 'legacy-preserved');
      assert.equal(await db.TokenBundle.count(), 0);
      await seed.main();
      await seed.main();
      assert.equal(await db.TokenBundle.count(), 3);
      await db.TokenBundle.update({ price_idr: '17000.00' }, { where: { name: 'DEMO Hemat' } });
      await seed.main();
      assert.equal((await db.TokenBundle.findOne({ where: { name: 'DEMO Hemat' } })).price_idr, '17000.00');
    });
    user = await register('buyer-a');
    other = await register('buyer-b');
    admin = await register('catalog-admin');
    await db.User.update({ role: 'admin' }, { where: { id: admin.id } });
    originalTier = await db.ApiClient.count();
    await t.test('JWT wajib dan user tidak dapat menulis/membaca katalog admin atau kategori', async () => {
      await call('GET', '/token-bundles', undefined, null, 401);
      await call('GET', '/admin/token-bundles', undefined, user.token, 403);
      await call('POST', '/admin/token-bundles', {}, user.token, 403);
      await call('POST', '/categories', { name: 'forged' }, user.token, 403);
      await call('POST', '/auth/register', { name: 'x', email: 'x@example.com', password: 'Password123!', konfirmasi_password: 'Password123!', role: 'admin' }, null, 400);
    });
    await t.test('CRUD: setter, POST Location, PUT lengkap/PATCH parsial, Joi dan harga string', async () => {
      const values = { name: '  Paket   Awal  ', token_quota: 2000, price_idr: '25000.50', is_active: true };
      const created = await call('POST', '/admin/token-bundles', values, admin.token, 201);
      bundle = created.data.data;
      assert.equal(bundle.name, 'Paket Awal');
      assert.equal(created.response.headers.get('location'), '/api/v1/admin/token-bundles/' + bundle.id);
      await call('PUT', '/admin/token-bundles/' + bundle.id, { price_idr: '9.99' }, admin.token, 400);
      for (const bad of [{ ...values, token_quota: 0 }, { ...values, price_idr: 15000 }, { ...values, price_idr: '0' }, { ...values, is_active: 'false' }, { ...values, role: 'admin' }]) {
        await call('POST', '/admin/token-bundles', bad, admin.token, 400);
      }
      const catalog = await call('GET', '/token-bundles?limit=100', undefined, user.token, 200);
      assert.match(catalog.response.headers.get('cache-control'), /no-store/);
      const visible = catalog.data.data.find((row) => row.id === bundle.id);
      assert.equal(visible.price_idr, '25000.50');
      assert.equal(visible.token_quota, 2000);
      assert.equal(typeof visible.price_idr, 'string');
      const badMethod = await call('POST', '/token-bundles', {}, user.token, 405);
      assert.equal(badMethod.response.headers.get('allow'), 'GET');
      const badItem = await call('POST', '/admin/token-bundles/' + bundle.id, {}, admin.token, 405);
      assert.equal(badItem.response.headers.get('allow'), 'GET, PUT, PATCH, DELETE');
    });
    await t.test('Order menolak harga, kuota, status, owner dan key tidak valid', async () => {
      await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 400);
      for (const field of ['price_idr', 'token_quota', 'user_id', 'status', 'tier', 'currency', 'price_idr_snapshot']) {
        await call('POST', '/token-purchases', { token_bundle_id: bundle.id, [field]: 'forged' }, user.token, 400, 'key-invalid-body');
      }
      assert.equal(await db.TokenPurchase.count(), 0);
    });
    await t.test('8 request serentak menghasilkan tepat satu order; key dibatasi per pemilik', async () => {
      const calls = await Promise.all(Array.from({ length: 8 }, () => call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, undefined, 'parallel-key-0001')));
      assert.equal(calls.filter((row) => row.response.status === 201).length, 1);
      assert.equal(calls.filter((row) => row.response.status === 200).length, 7);
      assert.equal(new Set(calls.map((row) => row.data.data.order_id)).size, 1);
      order = calls[0].data.data;
      assert.equal(order.user_id, user.id);
      assert.equal(order.status, 'pending');
      assert.equal(order.price_idr_snapshot, '25000.50');
      assert.equal(order.token_quota_snapshot, 2000);
      assert.equal(order.checkout.available, false);
      assert.equal(order.idempotency_key, undefined);
      assert.equal(calls[0].response.headers.get('location'), '/api/v1/token-purchases/' + order.order_id);
      await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, other.token, 201, 'parallel-key-0001');
      assert.equal(await db.TokenPurchase.count(), 2);
      await call('POST', '/token-purchases', { token_bundle_id: 1 }, user.token, 409, 'parallel-key-0001');
    });
    await t.test('Harga/nama/kuota baru tidak mengubah snapshot atau replay order lama', async () => {
      await call('PUT', '/admin/token-bundles/' + bundle.id, { name: 'Paket Baru', token_quota: 4000, price_idr: '49000.75', is_active: true }, admin.token, 200);
      const fetched = await call('GET', '/token-purchases/' + order.order_id, undefined, user.token, 200);
      assert.equal(fetched.data.data.bundle_name_snapshot, 'Paket Awal');
      assert.equal(fetched.data.data.price_idr_snapshot, '25000.50');
      assert.equal(fetched.data.data.token_quota_snapshot, 2000);
      assert.equal(fetched.data.data.bundle.name, 'Paket Baru');
      const replay = await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 200, 'parallel-key-0001');
      assert.equal(replay.data.data.price_idr_snapshot, '25000.50');
      assert.equal(replay.response.headers.get('idempotency-replayed'), 'true');
      const newer = await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 201, 'new-purchase-key-02');
      assert.equal(newer.data.data.price_idr_snapshot, '49000.75');
      await assert.rejects(db.TokenPurchase.update({ price_idr_snapshot: '1.00' }, { where: { order_id: order.order_id } }));
    });
    await t.test('Pemilik lain/admin tidak membaca order orang lain; status/kuota tidak dapat ditulis', async () => {
      await call('GET', '/token-purchases/' + order.order_id, undefined, other.token, 404);
      await call('GET', '/token-purchases/' + order.order_id, undefined, admin.token, 404);
      await call('GET', '/token-purchases?user_id=' + other.id, undefined, user.token, 400);
      const list = await call('GET', '/token-purchases?status=pending', undefined, user.token, 200);
      assert(list.data.data.every((row) => row.user_id === user.id));
      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        const bad = await call(method, '/token-purchases/' + order.order_id, { status: 'paid', token_quota_snapshot: 999999 }, user.token, 405);
        assert.equal(bad.response.headers.get('allow'), 'GET');
      }
      await call('GET', '/token-purchases/' + order.order_id + '/checkout', undefined, other.token, 404);
      const inspection = await call('GET', '/token-purchases/' + order.order_id + '/checkout', undefined, user.token, 200);
      assert.equal(inspection.data.data.available, false);
      await call('POST', '/token-purchases/' + order.order_id + '/checkout', {}, user.token, 503);
      assert.equal((await db.TokenPurchase.findOne({ where: { order_id: order.order_id } })).status, 'pending');
      assert.equal(await db.ApiClient.count(), originalTier);
      const [[wallet]] = await connection.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=? AND table_name IN ('token_wallets','token_ledgers')", [name]);
      assert.equal(Number(wallet.n), 0);
    });
    await t.test('Nonaktif dan arsip tidak bisa dibeli; JOIN histori tetap membaca paket paranoid:false', async () => {
      await call('PATCH', '/admin/token-bundles/' + bundle.id, { is_active: false }, admin.token, 200);
      const hidden = await call('GET', '/token-bundles?limit=100', undefined, user.token, 200);
      assert(!hidden.data.data.some((row) => row.id === bundle.id));
      await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 404, 'inactive-order-key');
      await call('DELETE', '/admin/token-bundles/' + bundle.id, {}, admin.token, 204);
      assert.equal(await db.TokenBundle.findByPk(bundle.id), null);
      const history = await call('GET', '/token-purchases/' + order.order_id, undefined, user.token, 200);
      assert(history.data.data.bundle.deletedAt);
      assert.equal(history.data.data.bundle_name_snapshot, 'Paket Awal');
      const archived = await call('GET', '/admin/token-bundles?status=archived', undefined, admin.token, 200);
      assert(archived.data.data.some((row) => row.id === bundle.id));
      await call('PATCH', '/admin/token-bundles/' + bundle.id, { is_active: true }, admin.token, 404);
      await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 200, 'parallel-key-0001');
      await call('POST', '/token-purchases', { token_bundle_id: bundle.id }, user.token, 404, 'archived-order-key');
      const [[row]] = await connection.query('SELECT name FROM categories WHERE id=?', [legacy]);
      assert.equal(row.name, 'legacy-preserved');
    });
    await t.test('Unique DB dan penurunan role tetap berlaku pada token lama', async () => {
      await assert.rejects(connection.execute(
        'UPDATE token_purchases SET idempotency_key=? WHERE user_id=? AND order_id<>?',
        ['parallel-key-0001', user.id, order.order_id],
      ), (error) => error.code === 'ER_DUP_ENTRY');
      await assert.rejects(connection.execute(
        'UPDATE token_bundles SET token_quota=0 WHERE id=?', [bundle.id],
      ));
      await db.User.update({ role: 'user' }, { where: { id: admin.id } });
      await call('POST', '/admin/token-bundles', { name: 'forged', token_quota: 1, price_idr: '1.00', is_active: true }, admin.token, 403);
      await call('PATCH', '/categories/' + legacy, { name: 'forged' }, admin.token, 403);
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await db.sequelize.close();
    await connection.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(name));
    await connection.end();
  }
});
