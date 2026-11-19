const { Op } = require('sequelize');
const { User, TokenWallet, TokenLedger, TokenPurchase, AIUsage, sequelize } = require('../models');
const httpError = require('../utils/httpError');

const MAX_TOKENS = 2147483647n;
const safe = (value) => {
  const number = BigInt(String(value));
  if (number < 0n || number > MAX_TOKENS) throw httpError(409, 'Nilai kuota melewati batas aman');
  return number;
};
const ensureWallet = async (userId, transaction) => {
  await TokenWallet.findOrCreate({ where: { user_id: userId }, defaults: { balance: 0, available_tokens: 0, reserved_tokens: 0 }, transaction });
  return TokenWallet.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
};
const writeLedger = async ({ userId, eventKey, purchaseId = null, type, status = 'completed', amount, wallet, reason }, transaction) => TokenLedger.create({
  user_id: userId, token_purchase_id: purchaseId, event_key: eventKey, entry_type: type, status,
  amount: safe(amount).toString(), available_after: safe(wallet.available_tokens).toString(),
  reserved_after: safe(wallet.reserved_tokens).toString(), balance_after: safe(wallet.available_tokens).toString(), reason,
}, { transaction });

const reserve = async ({ userId, idempotencyKey, promptHash, reserveTokens, provider, model }) => sequelize.transaction(async (transaction) => {
  await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE }).then((user) => { if (!user) throw httpError(401, 'Akun tidak tersedia'); });
  const existing = await AIUsage.findOne({ where: { user_id: userId, idempotency_key: idempotencyKey }, transaction, lock: transaction.LOCK.UPDATE });
  if (existing) {
    if (existing.prompt_hash !== promptHash) throw httpError(409, 'Idempotency-Key sudah digunakan untuk permintaan berbeda');
    return { usage: existing, replay: true };
  }
  const wallet = await ensureWallet(userId, transaction);
  const available = safe(wallet.available_tokens); const held = safe(reserveTokens);
  if (safe(safe(wallet.reserved_tokens) + held) > MAX_TOKENS) throw httpError(409, 'Total reservasi melewati batas aman');
  if (available < held) throw httpError(409, 'Saldo token tidak mencukupi', 'INSUFFICIENT_TOKENS');
  await wallet.update({ available_tokens: (available - held).toString(), reserved_tokens: (safe(wallet.reserved_tokens) + held).toString(), balance: (available - held).toString() }, { transaction });
  const usage = await AIUsage.create({ user_id: userId, idempotency_key: idempotencyKey, prompt_hash: promptHash, provider, model, status: 'reserved', reserved_tokens: held.toString(), reservation_expires_at: new Date(Date.now() + 15 * 60 * 1000) }, { transaction });
  await writeLedger({ userId, eventKey: `ai:${usage.id}:reserve`, type: 'reserve', status: 'reserved', amount: held, wallet, reason: 'ai_reservation' }, transaction);
  return { usage, replay: false };
});

const commitUsage = async ({ usageId, userId, inputTokens, outputTokens, providerTotal, thinkingTokens = 0, cacheTokens = 0, toolTokens = 0, responseText }) => sequelize.transaction(async (transaction) => {
  const usage = await AIUsage.findOne({ where: { id: usageId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!usage) throw httpError(404, 'Permintaan AI tidak ditemukan');
  if (usage.status === 'completed') return { usage, replay: true };
  if (usage.status !== 'reserved') throw httpError(409, 'Penggunaan AI memerlukan pemeriksaan manual');
  const actual = safe(safe(inputTokens) + safe(outputTokens));
  const reserved = safe(usage.reserved_tokens);
  const wallet = await ensureWallet(userId, transaction);
  const currentReserved = safe(wallet.reserved_tokens);
  if (currentReserved < reserved) throw httpError(409, 'Saldo reservasi tidak konsisten');
  const available = safe(wallet.available_tokens);
  if (actual > reserved && available < actual - reserved) {
    await usage.update({ status: 'needs_reconciliation', input_tokens: Number(inputTokens), output_tokens: Number(outputTokens), provider_total_tokens: providerTotal == null ? null : Number(providerTotal), actual_tokens: actual.toString(), error_code: 'ACTUAL_EXCEEDS_RESERVATION' }, { transaction });
    await TokenLedger.update({ status: 'needs_reconciliation' }, { where: { user_id: userId, event_key: `ai:${usage.id}:reserve` }, transaction });
    return { usage, replay: false, needsReconciliation: true };
  }
  const nextAvailable = safe(actual <= reserved ? available + reserved - actual : available - (actual - reserved));
  const nextReserved = safe(currentReserved - reserved);
  await wallet.update({ available_tokens: nextAvailable.toString(), reserved_tokens: nextReserved.toString(), balance: nextAvailable.toString() }, { transaction });
  await usage.update({ status: 'completed', input_tokens: Number(inputTokens), output_tokens: Number(outputTokens), provider_total_tokens: providerTotal == null ? null : Number(providerTotal), thinking_tokens: thinkingTokens == null ? null : Number(thinkingTokens), cache_tokens: cacheTokens == null ? null : Number(cacheTokens), tool_tokens: toolTokens == null ? null : Number(toolTokens), actual_tokens: actual.toString(), response_text: responseText, completed_at: new Date(), error_code: null }, { transaction });
  await writeLedger({ userId, eventKey: `ai:${usage.id}:debit`, type: 'debit', amount: actual, wallet, reason: 'ai_usage' }, transaction);
  if (reserved > actual) await writeLedger({ userId, eventKey: `ai:${usage.id}:release`, type: 'release', amount: reserved - actual, wallet, reason: 'unused_reservation' }, transaction);
  await TokenLedger.update({ status: 'completed' }, { where: { user_id: userId, event_key: `ai:${usage.id}:reserve` }, transaction });
  return { usage, replay: false };
});

const markDispatched = async ({ usageId, userId }) => sequelize.transaction(async (transaction) => {
  const usage = await AIUsage.findOne({ where: { id: usageId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!usage || usage.status !== 'reserved' || new Date(usage.reservation_expires_at) <= new Date()) throw httpError(409, 'Reservasi tidak lagi aktif untuk dikirim ke provider');
  await usage.update({ dispatch_started_at: new Date() }, { transaction });
  return usage;
});

const release = async ({ usageId, userId, reason = 'ai_failed_before_dispatch', allowAfterDispatch = false }) => sequelize.transaction(async (transaction) => {
  const usage = await AIUsage.findOne({ where: { id: usageId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!usage || usage.status !== 'reserved' || (usage.dispatch_started_at && !allowAfterDispatch)) return { released: false, usage };
  const wallet = await ensureWallet(userId, transaction);
  const reserved = safe(usage.reserved_tokens); const current = safe(wallet.reserved_tokens);
  if (current < reserved) throw httpError(409, 'Saldo reservasi tidak konsisten');
  const available = safe(safe(wallet.available_tokens) + reserved);
  const nextReserved = safe(current - reserved);
  await wallet.update({ available_tokens: available.toString(), reserved_tokens: nextReserved.toString(), balance: available.toString() }, { transaction });
  await usage.update({ status: 'failed', error_code: reason, completed_at: new Date() }, { transaction });
  await writeLedger({ userId, eventKey: `ai:${usage.id}:release`, type: 'release', amount: reserved, wallet, reason }, transaction);
  await TokenLedger.update({ status: 'failed' }, { where: { user_id: userId, event_key: `ai:${usage.id}:reserve` }, transaction });
  return { released: true, usage };
});

const markNeedsReconciliation = async ({ usageId, userId, reason }) => sequelize.transaction(async (transaction) => {
  const usage = await AIUsage.findOne({ where: { id: usageId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!usage || usage.status !== 'reserved') return usage;
  await usage.update({ status: 'needs_reconciliation', error_code: reason }, { transaction });
  await TokenLedger.update({ status: 'needs_reconciliation' }, { where: { user_id: userId, event_key: `ai:${usage.id}:reserve` }, transaction });
  return usage;
});

const grantPurchase = async (purchaseId, externalTransaction = null) => {
  const execute = async (transaction) => {
    const purchase = await TokenPurchase.findByPk(purchaseId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!purchase || purchase.status !== 'paid') throw httpError(409, 'Pembelian belum berstatus paid');
    const previous = await TokenLedger.findOne({ where: { token_purchase_id: purchase.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (previous) return { granted: false, ledgerId: previous.id };
    const wallet = await ensureWallet(purchase.user_id, transaction);
    const available = safe(safe(wallet.available_tokens) + safe(purchase.token_quota_snapshot));
    safe(available + safe(wallet.reserved_tokens));
    await wallet.update({ available_tokens: available.toString(), balance: available.toString() }, { transaction });
    const ledger = await writeLedger({ userId: purchase.user_id, purchaseId: purchase.id, eventKey: `purchase:${purchase.id}`, type: 'credit', amount: purchase.token_quota_snapshot, wallet, reason: 'purchase' }, transaction);
    return { granted: true, ledgerId: ledger.id, balance: available.toString() };
  };
  return externalTransaction ? execute(externalTransaction) : sequelize.transaction(execute);
};

const recoverExpiredReservations = async () => {
  const expired = await AIUsage.findAll({ where: { status: 'reserved', reservation_expires_at: { [Op.lte]: new Date() } }, order: [['id','ASC']], limit: 100 });
  const result = { inspected: expired.length, released_before_dispatch: 0, marked_for_reconciliation: 0 };
  for (const row of expired) {
    if (!row.dispatch_started_at) {
      const outcome = await release({ usageId: row.id, userId: row.user_id, reason: 'RESERVATION_EXPIRED_BEFORE_DISPATCH' });
      if (outcome.released) result.released_before_dispatch += 1;
      else if (outcome.usage?.status === 'reserved' && outcome.usage.dispatch_started_at) {
        await markNeedsReconciliation({ usageId: row.id, userId: row.user_id, reason: 'RESERVATION_EXPIRED_AFTER_DISPATCH' });
        result.marked_for_reconciliation += 1;
      }
    } else {
      await markNeedsReconciliation({ usageId: row.id, userId: row.user_id, reason: 'RESERVATION_EXPIRED_AFTER_DISPATCH' });
      result.marked_for_reconciliation += 1;
    }
  }
  return result;
};

const walletSummary = async (userId) => {
  const wallet = await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw httpError(401, 'Akun tidak tersedia');
    return ensureWallet(userId, transaction);
  });
  return { balance: String(wallet.available_tokens), available_tokens: String(wallet.available_tokens), reserved_tokens: String(wallet.reserved_tokens), total_tokens: safe(safe(wallet.available_tokens) + safe(wallet.reserved_tokens)).toString() };
};

const jakartaDateRange = (startDate, endDate) => ({
  ...(startDate ? { [Op.gte]: new Date(`${startDate}T00:00:00+07:00`) } : {}),
  ...(endDate ? { [Op.lt]: new Date(new Date(`${endDate}T00:00:00+07:00`).getTime() + 86400000) } : {}),
});

const usageList = async ({ userId, limit, offset, status, startDate, endDate }) => {
  const where = { user_id: userId, ...(status ? { status } : {}), ...(startDate || endDate ? { createdAt: jakartaDateRange(startDate, endDate) } : {}) };
  const { rows, count } = await AIUsage.findAndCountAll({ where, limit, offset, order: [['id', 'DESC']], attributes: { exclude: ['prompt_hash', 'response_text'] } });
  return { rows, count };
};

const ledgerList = async ({ userId, limit, offset, type, startDate, endDate }) => {
  const where = { user_id: userId, ...(type ? { entry_type: type } : {}), ...(startDate || endDate ? { createdAt: jakartaDateRange(startDate, endDate) } : {}) };
  const { rows, count } = await TokenLedger.findAndCountAll({ where, limit, offset, order: [['id', 'DESC']] });
  return { rows, count };
};

module.exports = { reserve, markDispatched, commitUsage, release, grantPurchase, markNeedsReconciliation, recoverExpiredReservations, walletSummary, usageList, ledgerList, MAX_TOKENS };
