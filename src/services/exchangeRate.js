const { requestUpstream } = require('./upstream');
const httpError = require('../utils/httpError');

const getExchangeRate = async currency => {
    const key = process.env.EXCHANGE_RATE_API_KEY?.trim();

    if (!key || key === 'ISI_API_KEY_ANDA') {
        throw httpError(503, 'Layanan kurs belum dikonfigurasi');
    }

    const response = await requestUpstream({
        method: 'GET',
        url: `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/IDR`
    });
    const data = response.data;
    const rate = data?.conversion_rates?.[currency];

    if (data?.result !== 'success' || data?.base_code !== 'IDR'
    || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        throw httpError(502, 'Respons layanan kurs tidak valid');
    }

    const seconds = data.time_last_update_unix;
    const updatedAt = typeof seconds === 'number'
    && Number.isFinite(seconds) && seconds > 0 && seconds < 8640000000000
    ? new Date(seconds * 1000).toISOString()
    : null;

    return {
        provider: 'ExchangeRate-API',
        base_currency: 'IDR',
        target_currency: currency,
        rate,
        updated_at: updatedAt
    };
};

module.exports = {
    getExchangeRate
};
