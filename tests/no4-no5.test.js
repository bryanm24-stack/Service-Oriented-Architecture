const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const axios = require('axios');
const app = require('../index');
const db = require('../src/models');
const { requestUpstream } = require('../src/services/upstream');
const { hashPassword } = require('../src/utils/password');
const { scryptSync } = require('node:crypto');

// Tidak menggunakan kredensial asli atau memanggil provider sungguhan.
test('No. 4–5: kontrak gabungan DB/API, validasi, dan kegagalan upstream', async () => {
    const originalAdapter = axios.defaults.adapter;
    const originalFind = db.Transaction.findByPk;
    const originalEnv = Object.fromEntries(['EXCHANGE_RATE_API_KEY', 'DISCORD_WEBHOOK_URL', 'API_TIMEOUT_MS'].map(key => [key, process.env[key]]));

    process.env.EXCHANGE_RATE_API_KEY = 'FAKE_TEST_KEY';

    process.env.DISCORD_WEBHOOK_URL = 'https://example.invalid/FAKE_SECRET';

    process.env.API_TIMEOUT_MS = '100';

    let scenario = 'success';
    let calls = 0;
    let lastConfig;

    db.Transaction.findByPk = async id => Number(id) === 999 ? null : {
        toJSON: () => ({
            id_transaction: Number(id),
            id_user: 1,
            id_category: 2,
            nominal: '16000.00',
            catatan: 'Contoh',
            category: {
                id: 2,
                name: 'Makanan'
            },
            user: {
                id: 1,
                name: 'User',
                password: 'SECRET_SHOULD_NOT_LEAK'
            }
        })
    };

    axios.defaults.adapter = async config => {
        calls++;

        lastConfig = config;

        if (scenario === 'timeout') {
            throw new axios.AxiosError('FAKE_SECRET', 'ECONNABORTED', config, {});
        }

        if (scenario === 'network') {
            throw new axios.AxiosError('FAKE_SECRET', 'ENOTFOUND', config, {});
        }

        if (scenario === '429' || scenario === '503') {
            throw new axios.AxiosError('FAKE_SECRET', 'ERR_BAD_RESPONSE', config, {}, {
                status: Number(scenario)
            });
        }

        if (scenario === 'internal') {
            throw new Error('FAKE_SECRET stack sql SELECT users');
        }

        return {
            data: scenario === 'malformed' ? {
                result: 'error',
                'error-type': 'invalid-key'
            } : {
                result: 'success',
                base_code: 'IDR',
                time_last_update_unix: 1791590400,
                conversion_rates: {
                    USD: 0.0000625,
                    IDR: 1,
                    EUR: 0.00006
                },
                secret: 'FAKE_SECRET'
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config
        };
    };

    const server = app.listen(0, '127.0.0.1');

    await new Promise(resolve => server.once('listening', resolve));

    const base = `http://127.0.0.1:${server.address().port}`;
    let checked = 0;

    const request = async (url, status, method = 'GET', body) => {
        const response = await fetch(base + url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(3000)
        });
        const text = await response.text();

        assert.equal(response.status, status, text);

        assert.doesNotMatch(text, /FAKE_SECRET|FAKE_TEST_KEY|SECRET_SHOULD_NOT_LEAK|SELECT users/);

        checked++;

        return text ? JSON.parse(text) : null;
    };

    try {
        const result = await request('/api/v1/transactions/1/conversion?currency=usd', 200);

        assert.deepEqual(Object.keys(result.data).sort(), ['conversion', 'transaction']);

        assert.equal(result.data.transaction.nominal, '16000.00');

        assert.equal(result.data.conversion.estimated_amount, '1.00');

        assert.equal(result.data.conversion.target_currency, 'USD');

        assert.equal(result.data.conversion.is_estimate, true);

        assert.equal(result.data.transaction.user.password, undefined);

        assert.deepEqual(Object.keys(result.data.conversion).sort(), ['base_currency', 'display_decimals', 'estimated_amount', 'is_estimate', 'provider', 'rate', 'target_currency', 'updated_at']);

        assert(lastConfig.url.endsWith('/FAKE_TEST_KEY/latest/IDR'));

        assert.equal(lastConfig.timeout, 100);

        const before = calls;

        await request('/api/v1/transactions/999/conversion', 404);

        await request('/api/v1/transactions/abc/conversion', 400);

        await request('/api/v1/transactions/1/conversion?currency=XXX', 400);

        await request('/api/v1/transactions/1/conversion?currency=USD&url=evil', 400);

        assert.equal(calls, before);

        await request('/api/v1/transactions/1/conversion', 405, 'POST', {});

        for (const [value, status] of [['timeout', 504], ['network', 502], ['429', 502], ['503', 502], ['malformed', 502], ['internal', 500]]) {
            scenario = value;

            await request('/api/v1/transactions/1/conversion', status);
        }

        delete process.env.EXCHANGE_RATE_API_KEY;

        await request('/api/v1/transactions/1/conversion', 503);

        const invalid = await request('/api/v1/users', 400, 'POST', {
            name: '',
            email: 'bad',
            password: 'x',
            role: 'admin'
        });

        assert(invalid.errors.length >= 4);

        assert(invalid.errors.every(item => item.field && !/must |is not allowed/.test(item.message)));

        await request('/api/v1/categories', 400, 'POST', {
            name: '',
            icon: 123
        });

        await request('/api/v1/contoh', 400, 'POST', {
            extra: 1
        });

        await request('/api/v1/contoh', 200, 'POST', {
            nama: 'Tes',
            umur: 20
        });

        await request('/api/v1/contoh/gabungan/1', 400, 'PUT', {});

        await request('/api/v1/contoh/gabungan/1', 200, 'PUT', {
            judul: 'Contoh'
        });

        await request('/api/v1/contohAxios/webhook', 400, 'POST', {
            pesan: ''
        });

        await request('/api/v1/contohAxios/webhook', 400, 'POST', {
            pesan: 'Tes',
            url: 'evil'
        });

        scenario = 'network';

        const webhook = await request('/api/v1/contohAxios/webhook', 200, 'POST', {
            pesan: 'Tes'
        });

        assert.equal(webhook.notification.sent, false);

        scenario = 'success';

        const sent = await request('/api/v1/contohAxios/webhook', 200, 'POST', {
            pesan: 'Tes'
        });

        assert.equal(sent.notification.sent, true);

        assert.equal(lastConfig.timeout, 100);

        const input = JSON.parse(lastConfig.data);

        assert.equal(input.content, 'Tes');

        assert.deepEqual(input.allowed_mentions, {
            parse: []
        });

        scenario = 'timeout';

        await request('/api/v1/contohAxios', 504);

        scenario = 'network';

        await request('/api/v1/contohAxios', 502);

        scenario = 'malformed';

        await request('/api/v1/contohAxios', 502);

        const demo = await request('/api/v1/contoh/validasi', 200, 'POST', {
            pengguna_username: 'Tester',
            pengguna_email: 'test@example.com',
            pengguna_password: 'Password123!',
            pengguna_konfirmasi_password: 'Password123!'
        });

        assert.equal(demo.value.pengguna_password, undefined);

        assert.equal(demo.value.pengguna_konfirmasi_password, undefined);

        console.log(`${checked} pemeriksaan HTTP tambahan nomor 4–5 lulus.`);
    } finally {
        axios.defaults.adapter = originalAdapter;

        db.Transaction.findByPk = originalFind;

        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }

        await new Promise(resolve => server.close(resolve));
    }
});

test('Axios sungguhan ke server lokal: non-2xx, timeout, dan sukses', async () => {
    const previous = process.env.API_TIMEOUT_MS;

    process.env.API_TIMEOUT_MS = '100';

    const server = http.createServer((req, res) => {
        if (req.url === '/slow') {
            const timer = setTimeout(() => res.end('{}'), 500);

            res.on('close', () => clearTimeout(timer));

            return;
        }

        res.writeHead(req.url === '/limit' ? 429 : 200, {
            'Content-Type': 'application/json'
        });

        res.end('{"ok":true}');
    }).listen(0, '127.0.0.1');

    await new Promise(resolve => server.once('listening', resolve));

    const base = `http://127.0.0.1:${server.address().port}`;

    try {
        assert.equal((await requestUpstream({
            method: 'GET',
            url: base,
            proxy: false
        })).data.ok, true);

        await assert.rejects(requestUpstream({
            method: 'GET',
            url: base + '/limit',
            proxy: false
        }), {
            status: 502
        });

        await assert.rejects(requestUpstream({
            method: 'GET',
            url: base + '/slow',
            proxy: false
        }), {
            status: 504
        });
    } finally {
        server.closeAllConnections();

        await new Promise(resolve => server.close(resolve));

        if (previous === undefined) {
            delete process.env.API_TIMEOUT_MS;
        } else {
            process.env.API_TIMEOUT_MS = previous;
        }
    }
});

test('Password baru memakai scrypt dengan salt acak', async () => {
    const first = await hashPassword('Password123!');
    const second = await hashPassword('Password123!');

    assert.notEqual(first, second);

    const [algorithm, salt, digest] = first.split('$');

    assert.equal(algorithm, 'scrypt');

    assert.equal(scryptSync('Password123!', salt, 64).toString('hex'), digest);
});
