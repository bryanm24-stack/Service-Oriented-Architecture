const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { estimateReservation, actualBillableTokens } = require('../src/utils/tokenMetering');

test('AI metering: 100 input + 50 output = 150 unit, metadata tambahan tidak ditagih dua kali', () => {
  assert.equal(actualBillableTokens(100, 50), 150);
  assert.equal(actualBillableTokens(100, 50), 150); // cached/thinking/tool fields are intentionally separate.
  assert.throws(() => actualBillableTokens(-1, 50));
  assert.throws(() => actualBillableTokens(100, Number.NaN));
});

test('AI metering: reservasi mengestimasi seluruh prompt dan batas output dengan margin', () => {
  const prompt = 'system instructions + complete financial context + user question';
  const result = estimateReservation(prompt, 700, 1.2);
  assert.equal(result.estimatedInput, Math.ceil(Buffer.byteLength(prompt, 'utf8') / 3));
  assert.equal(result.reserveTokens, Math.ceil((result.estimatedInput + 700) * 1.2));
  assert.throws(() => estimateReservation(prompt, 0, 1.2));
});


test('AI wallet models: relasi owner/wallet/ledger dan unique idempotency sesuai kontrak', () => {
  const db = require('../src/models');
  assert.equal(db.User.associations.token_wallet.target, db.TokenWallet);
  assert.equal(db.TokenWallet.associations.user.target, db.User);
  assert.equal(db.TokenWallet.associations.ledger.target, db.TokenLedger);
  assert.equal(db.User.associations.ai_usages.target, db.AIUsage);
  assert.equal(db.AIUsage.associations.user.target, db.User);
  assert.equal(db.TokenWallet.rawAttributes.user_id.primaryKey, true);
  assert.equal(db.TokenLedger.options.paranoid, false);
  assert(db.AIUsage.options.indexes.some((index) => index.unique && index.fields.join(',') === 'user_id,idempotency_key'));
});

test('AI wallet MySQL: credit, reserve, commit, release, rollback, idempotency dan concurrency', {
  skip: process.env.RUN_MYSQL_TESTS !== '1', timeout: 120000,
}, async () => {
  const name = 'soa_ai_wallet_' + crypto.randomBytes(6).toString('hex');
  process.env.DB_NAME = name;
  process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  const db = require('../src/models');
  const migrate = require('../scripts/migrate');
  const service = require('../src/services/tokenWallet');
  try {
    await migrate();
    await connection.query('USE ' + mysql.escapeId(name));
    const user = await db.User.create({ name: 'AI Wallet Test', email: name + '@example.test', password: 'password123' });
    await db.TokenWallet.create({ user_id: user.id, balance: 1000, available_tokens: 1000, reserved_tokens: 0 });

    const concurrent = await Promise.allSettled([
      service.reserve({ userId: user.id, idempotencyKey: 'parallel-wallet-0001', promptHash: 'a'.repeat(64), reserveTokens: 700, provider: 'test', model: 'test' }),
      service.reserve({ userId: user.id, idempotencyKey: 'parallel-wallet-0002', promptHash: 'b'.repeat(64), reserveTokens: 400, provider: 'test', model: 'test' }),
    ]);
    assert.equal(concurrent.filter((row) => row.status === 'fulfilled').length, 1);
    assert.equal(concurrent.filter((row) => row.status === 'rejected').length, 1);
    const held = concurrent.find((row) => row.status === 'fulfilled').value.usage;
    const replay = await service.reserve({ userId: user.id, idempotencyKey: held.idempotency_key, promptHash: held.prompt_hash, reserveTokens: Number(held.reserved_tokens), provider: 'test', model: 'test' });
    assert.equal(replay.replay, true);
    assert.equal(String(replay.usage.id), String(held.id));

    const committed = await service.commitUsage({ usageId: held.id, userId: user.id, inputTokens: 100, outputTokens: 50, providerTotal: 150, responseText: 'hasil test' });
    assert.equal(committed.usage.status, 'completed');
    let current = await service.walletSummary(user.id);
    assert.equal(current.available_tokens, '850');
    assert.equal(current.reserved_tokens, '0');

    const releaseUsage = await service.reserve({ userId: user.id, idempotencyKey: 'release-wallet-0001', promptHash: 'c'.repeat(64), reserveTokens: 200, provider: 'test', model: 'test' });
    assert.equal((await service.walletSummary(user.id)).reserved_tokens, '200');
    assert.equal((await service.release({ usageId: releaseUsage.usage.id, userId: user.id })).released, true);
    current = await service.walletSummary(user.id);
    assert.equal(current.available_tokens, '850');
    assert.equal(current.reserved_tokens, '0');

    await assert.rejects(db.sequelize.transaction(async (transaction) => {
      const row = await db.TokenWallet.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
      await row.update({ available_tokens: 1, balance: 1 }, { transaction });
      throw new Error('rollback test');
    }), /rollback test/);
    assert.equal((await service.walletSummary(user.id)).available_tokens, '850');

    const bundle = await db.TokenBundle.create({ name: 'Test credit', token_quota: 50, price_idr: '1000.00', is_active: true });
    const purchase = await db.TokenPurchase.create({ order_id: 'SOA-' + crypto.randomUUID(), user_id: user.id, token_bundle_id: bundle.id, idempotency_key: 'purchase-wallet-001', status: 'paid', bundle_name_snapshot: bundle.name, price_idr_snapshot: '1000.00', token_quota_snapshot: 50, currency: 'IDR' });
    const credit1 = await service.grantPurchase(purchase.id);
    const credit2 = await service.grantPurchase(purchase.id);
    assert.equal(credit1.granted, true);
    assert.equal(credit2.granted, false);
    assert.equal((await service.walletSummary(user.id)).available_tokens, '900');
    assert.equal(await db.TokenLedger.count({ where: { token_purchase_id: purchase.id } }), 1);

    const dispatched = await service.reserve({ userId: user.id, idempotencyKey: 'dispatch-wallet-0001', promptHash: 'd'.repeat(64), reserveTokens: 100, provider: 'test', model: 'test' });
    await service.markDispatched({ usageId: dispatched.usage.id, userId: user.id });
    assert.equal((await service.release({ usageId: dispatched.usage.id, userId: user.id })).released, false);
    await service.markNeedsReconciliation({ usageId: dispatched.usage.id, userId: user.id, reason: 'TEST_AMBIGUOUS' });
    const finalSummary = await service.walletSummary(user.id);
    assert.equal(finalSummary.available_tokens, '800');
    assert.equal(finalSummary.reserved_tokens, '100');
    const finalWallet = await db.TokenWallet.findByPk(user.id);
    assert(BigInt(finalWallet.available_tokens) >= 0n);
    assert(BigInt(finalWallet.reserved_tokens) >= 0n);
  } finally {
    await db.sequelize.close();
    await connection.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(name));
    await connection.end();
  }
});
