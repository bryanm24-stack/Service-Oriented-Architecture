const httpError = require('../utils/httpError');
const { findOwnedOrder, present } = require('./tokenPurchases');

// Handoff to Dana: replace the stub only after signed provider verification
// and wallet/ledger migrations exist. This milestone never calls Midtrans.
const inspectCheckout = async ({ userId, orderId }) => ({
  purchase: present(await findOwnedOrder(orderId, userId)),
  available: false,
  message: 'Checkout Midtrans belum tersedia. Tidak ada pembayaran atau kuota yang diproses.',
});

const startCheckout = async ({ userId, orderId }) => {
  await findOwnedOrder(orderId, userId);
  throw httpError(503, 'Checkout belum tersedia sampai integrasi Midtrans selesai');
};

/**
 * Future server-only contract; NOT an HTTP endpoint.
 * @param {{ orderId: string, paymentEventId: string, transaction: object }} input
 * Future return: { granted: boolean, ledgerId: string, balance: number }.
 * Dana must verify payment, lock order + wallet, match amount/currency, and
 * write a unique purchase credit + paid status in the SAME DB transaction.
 * Pending orders and browser return URLs must never call this successfully.
 */
const grantPaidPurchase = async (_input) => {
  throw httpError(503, 'Pemberian kuota belum tersedia; wallet/ledger belum diintegrasikan');
};

module.exports = { inspectCheckout, startCheckout, grantPaidPurchase };
