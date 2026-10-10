const axios = require('axios');
const httpError = require('../utils/httpError');

const getTimeout = () => {
    const configured = Number(process.env.API_TIMEOUT_MS || 5000);

    if (!Number.isInteger(configured) || configured < 100 || configured > 30000) {
        return 5000;
    }

    return configured;
};

const mapUpstreamError = error => {
    if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code)) {
        return httpError(504, 'Layanan pihak ketiga melewati batas waktu');
    }

    if (axios.isAxiosError(error) && (error.response || error.request)) {
        return httpError(502, 'Layanan pihak ketiga gagal dihubungi atau mengembalikan kesalahan');
    }

    return httpError(500, 'Terjadi kesalahan pada integrasi layanan');
};

const requestUpstream = async config => {
    const timeout = getTimeout();

    try {
        return await axios.request({
            ...config,
            timeout,
            signal: AbortSignal.timeout(timeout),
            maxRedirects: 0,
            maxContentLength: 1024 * 1024,
            validateStatus: status => status >= 200 && status < 300
        });
    } catch (error) {
        // Jangan mengirim/log error.config: URL provider dapat memuat API key.
        throw mapUpstreamError(error);
    }
};

module.exports = {
    requestUpstream,
    getTimeout,
    mapUpstreamError
};
