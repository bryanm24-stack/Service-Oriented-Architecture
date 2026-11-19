const httpError = require('../utils/httpError');
const { User, TokenPurchase, TokenLedger, sequelize } = require('../models');
const tokenWallet = require('./tokenWallet');
const { findOwnedOrder, present } = require('./tokenPurchases');
const { createSnapTransaction } = require('./midtrans');

const inspectCheckout = async ({ userId, orderId }) => {
  const purchase = await findOwnedOrder(orderId, userId);
  return {
    purchase: present(purchase),
    available: purchase.status === 'pending',
    message: 'Pembayaran hanya mengubah saldo setelah webhook Midtrans terverifikasi.',
  };
};

const startCheckout = async ({ userId, orderId }) => {
  const purchase = await findOwnedOrder(orderId, userId);
  if (purchase.status !== 'pending') return { purchase: present(purchase), checkout: null };
  const user = await User.findByPk(userId);
  if (!user) throw httpError(404, 'Akun tidak tersedia');
  const checkout = await createSnapTransaction({ purchase, user });
  await purchase.update({
    provider_transaction_status: checkout.provider_transaction_status,
    provider_response: { token: checkout.token, redirect_url: checkout.redirect_url },
  });
  return { purchase: present(purchase), checkout };
};

const grantPaidPurchase = async (input) => {
  if (!input || typeof input.orderId !== 'string' || !input.provider) {
    throw httpError(503, 'Pemberian kuota membutuhkan event pembayaran terverifikasi');
  }
  return sequelize.transaction(async (transaction) => {
    const { orderId, provider } = input;
    const purchase = await TokenPurchase.findOne({
      where: { order_id: orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!purchase) throw httpError(404, 'Order tidak ditemukan');
    const owner = await User.findByPk(purchase.user_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!owner) throw httpError(404, 'Pemilik order tidak ditemukan');
    const expectedGross = Number(purchase.price_idr_snapshot).toFixed(2);
    const receivedGross = Number(provider.gross_amount).toFixed(2);
    if (purchase.currency !== provider.currency || expectedGross !== receivedGross) {
      throw httpError(400, 'Nominal atau mata uang pembayaran tidak cocok dengan snapshot order');
    }
    const paid = ['settlement', 'capture'].includes(provider.transaction_status) &&
      provider.fraud_status !== 'deny' && provider.fraud_status !== 'challenge';
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
      provider_response: provider.selected_response,
      status: wasCredited && !refund ? purchase.status : nextStatus,
    }, { transaction });
    if (!paid || refund || wasCredited) return { granted: false, purchase };

    const grant = await tokenWallet.grantPurchase(purchase.id, transaction);
    return { ...grant, purchase };
  });
};

module.exports = { inspectCheckout, startCheckout, grantPaidPurchase };
