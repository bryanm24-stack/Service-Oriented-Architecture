const axios = require('axios');
const { requestUpstream, mapUpstreamError } = require('./upstream');
const httpError = require('../utils/httpError');

const hosts = {
    sandbox: 'https://api.sandbox.midtrans.com',
    production: 'https://api.midtrans.com'
};

const transactionStatuses = new Set([
    'authorize', 'capture', 'settlement', 'pending', 'deny', 'cancel',
    'expire', 'failure', 'refund', 'partial_refund', 'chargeback', 'partial_chargeback'
]);

const validIdentifier = value => typeof value === 'string'
    && value.length > 0 && value.length <= 255
    && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value)
    && value !== '.' && value !== '..';

const configurationError = () => httpError(503,
    'MIDTRANS_ORDER_IDS harus memetakan ID user ke order unik yang valid');

// Pemetaan ini milik operator aplikasi, tidak pernah diambil dari body/query client.
// String lama tetap didukung. Object dapat menyertakan transaction_id dari provider.
const getMidtransConfig = (userId, env = process.env) => {
    const environment = env.MIDTRANS_ENVIRONMENT?.trim() || 'sandbox';

    if (!Object.hasOwn(hosts, environment)) {
        throw httpError(503, 'MIDTRANS_ENVIRONMENT harus sandbox atau production');
    }

    const serverKey = env.MIDTRANS_SERVER_KEY?.trim();
    const prefix = environment === 'sandbox' ? 'SB-Mid-server-' : 'Mid-server-';

    if (!serverKey || !serverKey.startsWith(prefix) || serverKey.length <= prefix.length
        || /[\s:]/.test(serverKey) || /dummy|placeholder|isi[_-]|your[_-]|change[_-]me/i.test(serverKey)) {
        throw httpError(503, 'MIDTRANS_SERVER_KEY belum valid atau tidak sesuai environment');
    }

    let mappings;

    try {
        mappings = JSON.parse(env.MIDTRANS_ORDER_IDS || '{}');
    } catch {
        throw configurationError();
    }

    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
        throw configurationError();
    }

    const orders = new Map();
    const orderIds = new Set();
    const transactionIds = new Set();

    for (const [id, entry] of Object.entries(mappings)) {
        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
            throw configurationError();
        }

        const order = typeof entry === 'string' ? { order_id: entry } : entry;

        if (!order || typeof order !== 'object' || Array.isArray(order)
            || Object.keys(order).some(key => !['order_id', 'transaction_id'].includes(key))
            || !validIdentifier(order.order_id)
            || (Object.hasOwn(order, 'transaction_id') && !validIdentifier(order.transaction_id))
            || orderIds.has(order.order_id)
            || (order.transaction_id && transactionIds.has(order.transaction_id))) {
            throw configurationError();
        }

        orderIds.add(order.order_id);
        if (order.transaction_id) transactionIds.add(order.transaction_id);
        orders.set(id, order);
    }

    const order = orders.get(String(userId));

    if (!order) {
        throw httpError(503, 'Order Midtrans untuk user ini belum dikonfigurasi');
    }

    return { environment, baseUrl: hosts[environment], serverKey, order };
};

const providerStatusError = status => {
    if (Number(status) === 404) {
        return httpError(404, 'Order user belum ditemukan di Midtrans pada environment ini');
    }

    if ([401, 403].includes(Number(status))) {
        return httpError(502, 'Autentikasi Midtrans ditolak; periksa Server Key dan environment');
    }

    return null;
};

const mapMidtransError = error => {
    if (axios.isAxiosError(error)) {
        const mapped = providerStatusError(error.response?.status);
        if (mapped) return mapped;
    }

    return mapUpstreamError(error);
};

const optionalText = value => typeof value === 'string' && value.trim() ? value : null;

const getUserPaymentStatus = async userId => {
    const { baseUrl, serverKey, order } = getMidtransConfig(userId);
    const identifier = order.transaction_id || order.order_id;
    const response = await requestUpstream({
        method: 'GET',
        url: `${baseUrl}/v2/${encodeURIComponent(identifier)}/status`,
        headers: {
            Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }
    }, mapMidtransError);

    const data = response.data;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw httpError(502, 'Respons layanan Midtrans tidak valid');
    }

    // Get Status juga dapat membawa error di JSON walaupun HTTP-nya 200.
    const providerError = providerStatusError(data.status_code);
    if (providerError) throw providerError;

    if (data.order_id !== order.order_id
        || (order.transaction_id && data.transaction_id !== order.transaction_id)) {
        throw httpError(502, 'Respons Midtrans tidak cocok dengan order user');
    }

    const status = typeof data.transaction_status === 'string'
        ? data.transaction_status.toLowerCase() : '';

    if (!transactionStatuses.has(status) || Number(data.status_code) >= 500) {
        throw httpError(502, 'Respons layanan Midtrans tidak valid');
    }

    // Hanya field terpilih. Tidak mengirim signature_key, key, atau payload mentah.
    // Status pembayaran tidak otomatis menentukan masa aktif langganan.
    return {
        id_order: data.order_id,
        id_transaksi: optionalText(data.transaction_id),
        status_pembayaran: status,
        status_fraud: optionalText(data.fraud_status),
        metode_pembayaran: optionalText(data.payment_type),
        waktu_transaksi: optionalText(data.transaction_time),
        sumber_data: 'Midtrans API'
    };
};

module.exports = { getUserPaymentStatus, getMidtransConfig };
