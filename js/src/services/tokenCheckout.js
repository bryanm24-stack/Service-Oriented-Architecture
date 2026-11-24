const httpError = require('../utils/httpError');
const { User, TokenPurchase, TokenLedger, sequelize } = require('../models');
const tokenWallet = require('./tokenWallet');
const { findOwnedOrder, present } = require('./tokenPurchases');
const { createSnapTransaction, getTransactionStatus, getProviderConfig } = require('./midtrans');
const { toCents } = require('../utils/money');

const responseData = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const storedCheckout = (purchase) => {
  const response = responseData(purchase.provider_response);
  const value = responseData(response.checkout || response);
  if (typeof value.token !== 'string' || !value.token || typeof value.redirect_url !== 'string') return null;
  let url;
  try { url = new URL(value.redirect_url); } catch { return null; }
  const { environment } = getProviderConfig();
  const host = environment === 'sandbox' ? 'app.sandbox.midtrans.com' : 'app.midtrans.com';
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password) return null;
  return { token: value.token, redirect_url: value.redirect_url, provider_transaction_status: purchase.provider_transaction_status || 'pending' };
};

const reconcilePurchase = async (purchase, transactionIdHint = null) => {
  const provider = await getTransactionStatus({
    orderId: purchase.order_id,
    transactionId: purchase.provider_transaction_id || transactionIdHint || null,
  });
  if (!provider) return { purchase, provider_found: false, synced: false, granted: false };
  const result = await grantPaidPurchase({ orderId: purchase.order_id, provider });
  return { ...result, provider_found: true, synced: true };
};

const syncOwnedPayment = async ({ userId, orderId }) => {
  const purchase = await findOwnedOrder(orderId, userId);
  const result = await reconcilePurchase(purchase);
  return { ...result, purchase: present(await findOwnedOrder(orderId, userId)) };
};

// Used by the webhook and local maintenance CLI. A notification is only a hint;
// transaction state, amount and identity always come from authenticated HTTPS.
const reconcileByOrder = async ({ orderId, transactionIdHint = null }) => {
  const purchase = await TokenPurchase.findOne({ where: { order_id: orderId } });
  if (!purchase) throw httpError(404, 'Order tidak ditemukan');
  return reconcilePurchase(purchase, transactionIdHint);
};

const inspectCheckout = async ({ userId, orderId }) => {
  const purchase = await findOwnedOrder(orderId, userId);
  return {
    purchase: present(purchase),
    available: purchase.status === 'pending',
    message: 'Gunakan Cek status pembayaran setelah membayar. Saldo mengikuti status resmi Midtrans.',
  };
};

const startCheckout = async ({ userId, orderId }) => {
  // POST can reconcile a finished payment before offering another payment page.
  const synced = await syncOwnedPayment({ userId, orderId });
  return sequelize.transaction(async (transaction) => {
    // Same lock order as order creation and wallet grants: owner, then purchase.
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw httpError(404, 'Akun tidak tersedia');
    const purchase = await TokenPurchase.findOne({
      where: { order_id: orderId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!purchase) throw httpError(404, 'Order tidak ditemukan');
    if (purchase.status !== 'pending') return { purchase: present(purchase), checkout: null };
    const saved = storedCheckout(purchase);
    if (saved) return { purchase: present(purchase), checkout: saved, reused: true };
    if (synced.provider_found) {
      throw httpError(409, 'Order sudah tercatat di Midtrans. Gunakan Cek status pembayaran; sesi baru tidak dibuat.');
    }
    const checkout = await createSnapTransaction({ purchase, user });
    await purchase.update({
      provider_transaction_status: checkout.provider_transaction_status,
      provider_response: { ...responseData(purchase.provider_response), checkout },
    }, { transaction });
    return { purchase: present(purchase), checkout, reused: false };
  });
};

const grantPaidPurchase = async (input) => {
  if (!input || typeof input.orderId !== 'string' || !input.provider) {
    throw httpError(503, 'Pemberian kuota membutuhkan event pembayaran terverifikasi');
  }
  return sequelize.transaction(async (transaction) => {
    const { orderId, provider } = input;
    const identity = await TokenPurchase.findOne({ where: { order_id: orderId }, transaction });
    if (!identity) throw httpError(404, 'Order tidak ditemukan');
    const owner = await User.findByPk(identity.user_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!owner) throw httpError(404, 'Pemilik order tidak ditemukan');
    const purchase = await TokenPurchase.findOne({ where: { order_id: orderId, user_id: owner.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!purchase) throw httpError(404, 'Order tidak ditemukan');
    let amountMatches = false;
    try { amountMatches = toCents(purchase.price_idr_snapshot) === toCents(provider.gross_amount); } catch {}
    if (provider.order_id !== purchase.order_id || purchase.currency !== provider.currency || !amountMatches ||
        (purchase.provider_transaction_id && purchase.provider_transaction_id !== provider.transaction_id)) {
      throw httpError(400, 'Nominal atau mata uang pembayaran tidak cocok dengan snapshot order');
    }
    const paid = String(provider.status_code) === '200' && ['settlement', 'capture'].includes(provider.transaction_status) &&
      (!provider.fraud_status || provider.fraud_status === 'accept');
    const refund = ['refund', 'partial_refund', 'chargeback', 'partial_chargeback']
      .includes(provider.transaction_status);
    const nextStatus = refund ? 'needs_review' : paid ? 'paid' :
        provider.transaction_status === 'expire' ? 'expired' :
          provider.transaction_status === 'cancel' ? 'cancelled' :
        ['deny', 'failure'].includes(provider.transaction_status) ? 'failed' : 'pending';
    const ledger = await TokenLedger.findOne({
        where: { token_purchase_id: purchase.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    const wasCredited = Boolean(ledger) || ['paid', 'needs_review'].includes(purchase.status);
    await purchase.update({
      provider_transaction_id: provider.transaction_id || null,
      provider_transaction_status: provider.transaction_status,
      provider_fraud_status: provider.fraud_status || null,
      provider_response: { ...responseData(purchase.provider_response), payment_status: provider.selected_response },
      status: wasCredited && !refund ? purchase.status : nextStatus,
    }, { transaction });
    if (!paid || refund || wasCredited) return { granted: false, purchase };

    const grant = await tokenWallet.grantPurchase(purchase.id, transaction);
    return { ...grant, purchase };
  });
};

module.exports = { inspectCheckout, startCheckout, grantPaidPurchase, syncOwnedPayment, reconcileByOrder };
