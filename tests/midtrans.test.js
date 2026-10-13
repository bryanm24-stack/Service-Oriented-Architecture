const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { getUserPaymentStatus, getMidtransConfig } = require('../src/services/midtrans');
const { installStore } = require('./support/finance-store');
const db = require('../src/models');
const app = require('../index');

const sampleConfig = {
    MIDTRANS_ENVIRONMENT: 'sandbox',
    MIDTRANS_SERVER_KEY: 'Mid-server-1xUor__AjW-aPDXMJveMb6wb',
    MIDTRANS_ORDER_IDS: JSON.stringify({ '1': 'order-user-1', '2': 'order-user-2' })
};

// Seluruh request provider dalam file ini memakai adapter simulasi.
const withProvider = async (adapter, run, overrides = {}) => {
    const entries = Object.entries({ ...sampleConfig, ...overrides });
    const previous = entries.map(([key]) => process.env[key]);
    const originalAdapter = axios.defaults.adapter;

    try {
        for (const [key, value] of entries) process.env[key] = value;
        axios.defaults.adapter = adapter;
        await run();
    } finally {
        axios.defaults.adapter = originalAdapter;
        entries.forEach(([key], index) => {
            if (previous[index] === undefined) delete process.env[key];
            else process.env[key] = previous[index];
        });
    }
};

const payload = (order, extra = {}) => ({
    status_code: '200',
    order_id: order,
    transaction_id: `transaction-${order}`,
    transaction_status: 'settlement',
    fraud_status: 'accept',
    payment_type: 'bank_transfer',
    transaction_time: '2026-10-13 12:00:00',
    ...extra
});

test('Midtrans: konfigurasi kosong, key salah lingkungan, pemetaan cacat/duplikat ditolak', () => {
    const invalid = [
        { MIDTRANS_SERVER_KEY: '' },
        { MIDTRANS_SERVER_KEY: 'SB-Mid-server-dummy' },
        { MIDTRANS_SERVER_KEY: 'SB-Mid-client-example' },
        { MIDTRANS_SERVER_KEY: 'Mid-server-unit-test-only' },
        { MIDTRANS_ENVIRONMENT: 'other' },
        { MIDTRANS_ORDER_IDS: '{' },
        { MIDTRANS_ORDER_IDS: 'null' },
        { MIDTRANS_ORDER_IDS: '[]' },
        { MIDTRANS_ORDER_IDS: '{}' },
        { MIDTRANS_ORDER_IDS: '{"1":null}' },
        { MIDTRANS_ORDER_IDS: '{"01":"ORDER"}' },
        { MIDTRANS_ORDER_IDS: '{"1":"ORDER","2":"ORDER"}' },
        { MIDTRANS_ORDER_IDS: '{"1":{"order_id":"A","transaction_id":"X"},"2":{"order_id":"B","transaction_id":"X"}}' }
    ];

    for (const config of invalid) {
        assert.throws(() => getMidtransConfig(1, { ...sampleConfig, ...config }),
            error => error.status === 503 && !error.message.includes(sampleConfig.MIDTRANS_SERVER_KEY));
    }
});

test('Midtrans: HTTP menggabungkan user yang benar dan order berbeda tanpa bocor payload', async () => {
    const store = installStore();
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/users`;
    const seen = [];

    try {
        await db.User.create({ name: 'User A', email: 'a@example.com', password: 'private-a' });
        await db.User.create({ name: 'User B', email: 'b@example.com', password: 'private-b' });

        await withProvider(async config => {
            assert.equal(config.method, 'get');
            assert.equal(config.headers.Authorization,
                `Basic ${Buffer.from(`${sampleConfig.MIDTRANS_SERVER_KEY}:`).toString('base64')}`);
            assert.equal(config.headers.Accept, 'application/json');
            assert.equal(config.headers['Content-Type'], 'application/json');
            assert.equal(config.maxRedirects, 0);
            const order = decodeURIComponent(new URL(config.url).pathname.split('/')[2]);
            seen.push(order);
            return { status: 200, config, data: payload(order, {
                signature_key: 'private-signature', customer_details: { secret: 'private-detail' }
            }) };
        }, async () => {
            for (const id of [1, 2]) {
                const response = await fetch(`${baseUrl}/${id}/subscription-status?order_id=ATTACKER-ORDER`);
                assert.equal(response.status, 200);
                const body = await response.json();
                assert.equal(body.data.profil_pengguna.id_pengguna, id);
                assert.equal(body.data.info_langganan.id_order, `order-user-${id}`);
                assert.equal(body.data.info_langganan.status_pembayaran, 'settlement');
                assert(!JSON.stringify(body).includes('private'));
                assert(!JSON.stringify(body).includes(sampleConfig.MIDTRANS_SERVER_KEY));
            }

            assert.deepEqual(seen, ['order-user-1', 'order-user-2']);
            assert.equal((await fetch(`${baseUrl}/999/subscription-status`)).status, 404);
            assert.equal((await fetch(`${baseUrl}/abc/subscription-status`)).status, 400);
            await (await db.User.findByPk(1)).destroy();
            assert.equal((await fetch(`${baseUrl}/1/subscription-status`)).status, 404);
            assert.equal(seen.length, 2);
        });
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        store.restore();
    }
});

test('Midtrans: identitas order/respons kosong tidak boleh dianggap sebagai status valid', async () => {
    for (const data of [null, [], 'html', {}, payload('order-user-2'),
        payload('order-user-1', { transaction_status: null }),
        payload('order-user-1', { transaction_status: 'unknown' }),
        payload('order-user-1', { status_code: '500' })]) {
        await withProvider(async config => ({ status: 200, config, data }), async () => {
            await assert.rejects(getUserPaymentStatus(1), error => error.status === 502);
        });
    }
});

test('Midtrans: transaction_id dapat dipakai untuk lookup dan harus cocok dengan hasil provider', async () => {
    const overrides = {
        MIDTRANS_ORDER_IDS: JSON.stringify({ '1': {
            order_id: 'order-user-1', transaction_id: 'provider-id/with#characters'
        } })
    };

    await withProvider(async config => {
        assert.equal(config.url, 'https://api.sandbox.midtrans.com/v2/provider-id%2Fwith%23characters/status');
        return { status: 200, config, data: payload('order-user-1', {
            transaction_id: 'provider-id/with#characters', transaction_status: 'PENDING', status_code: '201'
        }) };
    }, async () => {
        assert.equal((await getUserPaymentStatus(1)).status_pembayaran, 'pending');
    }, overrides);

    await withProvider(async config => ({ status: 200, config, data: payload('order-user-1') }), async () => {
        await assert.rejects(getUserPaymentStatus(1), error => error.status === 502);
    }, overrides);
});

test('Midtrans: error HTTP dan status_code dalam JSON dipetakan tanpa membocorkan rahasia', async () => {
    for (const [upstream, expected] of [[404, 404], [401, 502], [403, 502], [500, 502]]) {
        await withProvider(async config => {
            throw new axios.AxiosError('private-provider-error', 'ERR_BAD_RESPONSE', config, {}, {
                status: upstream, data: { signature_key: 'private-signature' }, config
            });
        }, async () => {
            await assert.rejects(getUserPaymentStatus(1), error => {
                assert.equal(error.status, expected);
                assert(!error.message.includes('private'));
                return true;
            });
        });
    }

    for (const [code, expected] of [['404', 404], ['401', 502], ['403', 502]]) {
        await withProvider(async config => ({ status: 200, config, data: { status_code: code } }), async () => {
            await assert.rejects(getUserPaymentStatus(1), error => error.status === expected);
        });
    }

    // status_code adalah hasil transaksi; 407/expire dan 202/deny tetap status yang sah.
    for (const [code, status] of [['407', 'expire'], ['202', 'deny']]) {
        await withProvider(async config => ({ status: 200, config,
            data: payload('order-user-1', { status_code: code, transaction_status: status })
        }), async () => assert.equal((await getUserPaymentStatus(1)).status_pembayaran, status));
    }
});

test('Midtrans: timeout menjadi 504 dan koneksi terputus menjadi 502', async () => {
    for (const [code, status] of [['ECONNABORTED', 504], ['ETIMEDOUT', 504], ['ERR_CANCELED', 504], ['ECONNRESET', 502]]) {
        await withProvider(async config => {
            throw new axios.AxiosError('private-error', code, config, {});
        }, async () => {
            await assert.rejects(getUserPaymentStatus(1), error => error.status === status);
        });
    }
});

test('Midtrans: production memakai domain dan key environment yang sesuai', async () => {
    await withProvider(async config => {
        assert.equal(new URL(config.url).origin, 'https://api.midtrans.com');
        return { status: 200, config, data: payload('order-user-1') };
    }, async () => {
        assert.equal((await getUserPaymentStatus(1)).id_order, 'order-user-1');
    }, { MIDTRANS_ENVIRONMENT: 'production', MIDTRANS_SERVER_KEY: 'Mid-server-unit-test-only' });
});
