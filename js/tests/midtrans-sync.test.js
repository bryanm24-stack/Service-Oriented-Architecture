const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');

test('Midtrans sync HTTP + MySQL: provider authority, saved checkout, ownership and exactly-once credit', {
  skip: process.env.RUN_MYSQL_TESTS !== '1', timeout: 120000,
}, async (t) => {
  const mysql = require('mysql2/promise');
  const axios = require('axios');
  const previousAdapter = axios.defaults.adapter;
  const keys = ['DB_NAME', 'DB_HOST', 'DB_PORT', 'JWT_ACCESS_SECRET', 'MIDTRANS_ENVIRONMENT', 'MIDTRANS_SERVER_KEY'];
  const previous = keys.map((key) => process.env[key]);
  const database = `soa_midtrans_sync_${randomBytes(5).toString('hex')}`;
  Object.assign(process.env, {
    DB_NAME: database, DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1', DB_PORT: process.env.TEST_DB_PORT || '3306',
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'), MIDTRANS_ENVIRONMENT: 'sandbox', MIDTRANS_SERVER_KEY: 'SB-Mid-server-regression-test-only',
  });
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  const db = require('../src/models');
  let server;
  const statuses = new Map();
  const sessions = new Map();
  const creates = new Map();
  let lookups = 0;
  let failure = null;
  axios.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`);
    if (config.method === 'get') {
      lookups += 1;
      assert.equal(new URL(config.url).origin, 'https://api.sandbox.midtrans.com');
      if (failure) throw new axios.AxiosError('private provider details', failure, config, {});
      const id = decodeURIComponent(new URL(config.url).pathname.split('/')[2]);
      const found = statuses.get(id) || [...statuses.values()].find((row) => row.transaction_id === id);
      return { status: 200, data: found || { status_code: '404' }, config };
    }
    assert.equal(config.url, 'https://app.sandbox.midtrans.com/snap/v1/transactions');
    const body = JSON.parse(config.data);
    const orderId = body.transaction_details.order_id;
    creates.set(orderId, (creates.get(orderId) || 0) + 1);
    if (sessions.has(orderId)) throw new Error('Duplicate Snap creation must never occur in this test');
    const purchase = await db.TokenPurchase.findOne({ where: { order_id: orderId } });
    assert.equal(body.transaction_details.gross_amount, Number(purchase.price_idr_snapshot));
    const session = { token: `snap-${orderId}`, redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${orderId}` };
    sessions.set(orderId, session);
    return { status: 201, data: session, config };
  };
  try {
    await require('../scripts/migrate')();
    await connection.query(`USE ${mysql.escapeId(database)}`);
    server = require('../index').listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const call = async (method, route, body, token, expected) => {
      const response = await fetch(base + route, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (expected) assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(result)}`);
      return { response, result };
    };
    const login = async (label) => {
      const values = { name: label, email: `${label}@example.com`, password: 'PaymentRegression123!', konfirmasi_password: 'PaymentRegression123!' };
      const created = await call('POST', '/auth/register', values, null, 201);
      const logged = await call('POST', '/auth/login', { email: values.email, password: values.password }, null, 200);
      return { id: created.result.user.id, token: logged.result.accessToken };
    };
    const user = await login('payment-owner');
    const other = await login('payment-other');
    const bundle = await db.TokenBundle.create({ name: 'Regression demo', price_idr: '140000.00', token_quota: 12000, is_active: true });
    const newOrder = async () => db.TokenPurchase.create({
      order_id: `SOA-${randomUUID()}`, user_id: user.id, token_bundle_id: bundle.id, idempotency_key: randomUUID(), status: 'pending',
      price_idr_snapshot: bundle.price_idr, token_quota_snapshot: bundle.token_quota, bundle_name_snapshot: bundle.name, currency: 'IDR',
    });
    const provider = (order, values = {}) => ({
      order_id: order.order_id, transaction_id: randomUUID(), status_code: '201', transaction_status: 'pending',
      gross_amount: order.price_idr_snapshot, currency: 'IDR', fraud_status: 'accept', payment_type: 'bank_transfer', ...values,
    });
    const checkout = (order) => `/token-purchases/${order.order_id}/checkout`;
    const sync = (order) => `/token-purchases/${order.order_id}/sync`;
    const balance = async () => BigInt((await db.TokenWallet.findByPk(user.id))?.available_tokens || 0);
    const order = await newOrder();

    await t.test('authenticated owner only; bad methods and client-supplied paid data are rejected before provider lookup', async () => {
      const before = lookups;
      await call('POST', sync(order), {}, null, 401);
      await call('POST', sync(order), {}, other.token, 404);
      await call('POST', sync(order), { status: 'paid', gross_amount: '1.00' }, user.token, 400);
      const badMethod = await call('GET', sync(order), undefined, user.token, 405);
      assert.equal(badMethod.response.headers.get('allow'), 'POST');
      assert.equal(lookups, before);
    });
    await t.test('parallel first checkout creates a single Snap session; pre-channel Status API 404 reuses the saved URL', async () => {
      const requests = await Promise.all(Array.from({ length: 4 }, () => call('POST', checkout(order), {}, user.token, 200)));
      assert.equal(creates.get(order.order_id), 1);
      assert.equal(new Set(requests.map((row) => row.result.data.checkout.token)).size, 1);
      const retry = await call('POST', checkout(order), {}, user.token, 200);
      assert.equal(retry.result.data.reused, true);
      assert.equal(creates.get(order.order_id), 1);
    });
    await t.test('spoofed paid webhook cannot override pending result from authenticated Midtrans status lookup', async () => {
      statuses.set(order.order_id, provider(order));
      const event = await call('POST', '/payments/midtrans/notifications', {
        order_id: order.order_id, transaction_status: 'settlement', gross_amount: '140000.00', signature_key: 'forged',
      }, null, 200);
      assert.equal(event.result.data.granted, false);
      assert.equal((await order.reload()).status, 'pending');
      assert.equal(await balance(), 0n);
      const retry = await call('POST', checkout(order), {}, user.token, 200);
      assert.equal(retry.result.data.reused, true);
      assert.equal(creates.get(order.order_id), 1);
    });
    await t.test('settled existing order becomes paid on sync and credits its snapshot once despite parallel retries', async () => {
      statuses.set(order.order_id, { ...statuses.get(order.order_id), status_code: '200', transaction_status: 'settlement' });
      await db.TokenBundle.update({ token_quota: 999, price_idr: '150000.00' }, { where: { id: bundle.id } });
      const requests = await Promise.all(Array.from({ length: 6 }, () => call('POST', sync(order), {}, user.token, 200)));
      assert.equal(requests.filter((row) => row.result.data.granted).length, 1);
      assert.equal(await balance(), 12000n);
      assert.equal((await order.reload()).status, 'paid');
      assert.equal(await db.TokenLedger.count({ where: { token_purchase_id: order.id } }), 1);
      assert.equal(order.provider_response.checkout.token, sessions.get(order.order_id).token);
      assert.equal(order.provider_response.payment_status.signature_key, undefined);
      const repeatedPay = await call('POST', checkout(order), {}, user.token, 200);
      assert.equal(repeatedPay.result.data.checkout, null);
      assert.equal(creates.get(order.order_id), 1);
    });
    await t.test('duplicate/out-of-order webhook uses current provider status and never credits a paid order again', async () => {
      const event = await call('POST', '/payments/midtrans/notifications', { order_id: order.order_id, transaction_status: 'pending' }, null, 200);
      assert.equal(event.result.data.granted, false);
      assert.equal((await order.reload()).status, 'paid');
      assert.equal(await balance(), 12000n);
    });
    await t.test('legacy top-level token/redirect fields are reused and preserved through a pending notification', async () => {
      const legacy = await newOrder();
      const saved = { token: 'legacy-snap', redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/legacy-snap' };
      await legacy.update({ provider_response: saved });
      statuses.set(legacy.order_id, provider(legacy));
      await call('POST', '/payments/midtrans/notifications', { order_id: legacy.order_id }, null, 200);
      const reply = await call('POST', checkout(legacy), {}, user.token, 200);
      assert.equal(reply.result.data.checkout.token, 'legacy-snap');
      assert.equal(creates.get(legacy.order_id), undefined);
    });
    await t.test('mismatched order, currency, transaction ID and amount never grant tokens', async () => {
      for (const [changes, code] of [
        [{ order_id: 'different-order' }, 502], [{ currency: 'USD' }, 502], [{ gross_amount: '1.00' }, 400],
      ]) {
        const bad = await newOrder();
        statuses.set(bad.order_id, provider(bad, { status_code: '200', transaction_status: 'settlement', ...changes }));
        await call('POST', sync(bad), {}, user.token, code);
        assert.equal((await bad.reload()).status, 'pending');
      }
      const badId = await newOrder();
      await badId.update({ provider_transaction_id: 'stored-transaction-id' });
      statuses.set('stored-transaction-id', provider(badId, { status_code: '200', transaction_status: 'settlement' }));
      await call('POST', sync(badId), {}, user.token, 502);
      assert.equal(await balance(), 12000n);
    });
    await t.test('capture with challenge or wrong success code grants nothing; accepted capture grants once', async () => {
      for (const changes of [{ fraud_status: 'challenge' }, { status_code: '201' }]) {
        const bad = await newOrder();
        statuses.set(bad.order_id, provider(bad, { status_code: '200', transaction_status: 'capture', payment_type: 'credit_card', ...changes }));
        await call('POST', sync(bad), {}, user.token, 200);
        assert.equal((await bad.reload()).status, 'pending');
      }
      assert.equal(await balance(), 12000n);
      const captured = await newOrder();
      const official = provider(captured, { status_code: '200', transaction_status: 'capture', payment_type: 'credit_card' });
      delete official.currency; // Supported documented legacy IDR status response.
      statuses.set(captured.order_id, official);
      await call('POST', sync(captured), {}, user.token, 200);
      assert.equal(await balance(), 24000n);
    });
    await t.test('unknown transaction returns not-found result without inventing paid or an extra checkout', async () => {
      const unknown = await newOrder();
      const reply = await call('POST', sync(unknown), {}, user.token, 200);
      assert.equal(reply.result.data.provider_found, false);
      assert.equal((await unknown.reload()).status, 'pending');
      const registered = await newOrder();
      statuses.set(registered.order_id, provider(registered));
      await call('POST', checkout(registered), {}, user.token, 409);
      assert.equal(creates.get(registered.order_id), undefined);
    });
    await t.test('timeout stops checkout and sync without modifying status, wallet or adding another Snap transaction', async () => {
      failure = 'ECONNABORTED';
      await call('POST', sync(order), {}, user.token, 504);
      await call('POST', checkout(order), {}, user.token, 504);
      failure = null;
      assert.equal(await balance(), 24000n);
      assert.equal((await order.reload()).status, 'paid');
      assert.equal(creates.get(order.order_id), 1);
    });
    await t.test('ledger insert failure rolls purchase and wallet changes back; retry safely credits once', async () => {
      const retry = await newOrder();
      statuses.set(retry.order_id, provider(retry, { status_code: '200', transaction_status: 'settlement' }));
      db.TokenLedger.addHook('beforeCreate', 'qa-fail-ledger', () => { throw new Error('QA ledger failure'); });
      try { await call('POST', sync(retry), {}, user.token, 500); }
      finally { db.TokenLedger.removeHook('beforeCreate', 'qa-fail-ledger'); }
      assert.equal((await retry.reload()).status, 'pending');
      assert.equal(await balance(), 24000n);
      await call('POST', sync(retry), {}, user.token, 200);
      assert.equal(await balance(), 36000n);
      assert.equal(await db.TokenLedger.count({ where: { token_purchase_id: retry.id } }), 1);
    });
    await t.test('refund is flagged for review without granting more tokens', async () => {
      statuses.set(order.order_id, { ...statuses.get(order.order_id), transaction_status: 'refund' });
      await call('POST', sync(order), {}, user.token, 200);
      assert.equal((await order.reload()).status, 'needs_review');
      assert.equal(await balance(), 36000n);
    });
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    axios.defaults.adapter = previousAdapter;
    await db.sequelize.close();
    await connection.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(database)}`);
    await connection.end();
    keys.forEach((key, index) => previous[index] === undefined ? delete process.env[key] : process.env[key] = previous[index]);
  }
});
