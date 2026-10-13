const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const { installStore } = require('./support/finance-store');
const db = require('../src/models');
const app = require('../index');

const withStore = async callback => {
    const store = installStore();
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const request = async (method, url, expected, value) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${url}`, {
            method, headers: { 'Content-Type': 'application/json' },
            body: value === undefined ? undefined : JSON.stringify(value)
        });
        const text = await response.text();
        assert.equal(response.status, expected, `${method} ${url}: ${text}`);
        return text ? JSON.parse(text) : null;
    };
    try { await callback(request, store); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.restore(); }
};

test('Tepat 30 method/path keuangan dan semuanya tercakup koleksi Postman', () => {
    const routers = require('../src/routes');
    const collection = require('../postman/Asisten-Keuangan-30-Endpoint.postman_collection.json');
    const registered = [];
    for (const [name, prefix] of [['userRouter', '/users'], ['categoryRouter', '/categories'], ['transactionRouter', ''], ['budgetRouter', '/budgets']]) {
        for (const layer of routers[name].stack) {
            if (!layer.route) continue;
            for (const method of Object.keys(layer.route.methods)) {
                if (method !== '_all') registered.push(`${method.toUpperCase()} ${prefix}${layer.route.path === '/' ? '' : layer.route.path}`);
            }
        }
    }
    assert.equal(registered.length, 30);
    assert.equal(new Set(registered).size, 30);
    const covered = new Set(collection.item.map(item => {
        const url = item.request.url.split('?')[0].replace('{{baseUrl}}/api/v1', '').replace(/\{\{(?:userId|categoryId|transactionId|budgetId|subscriptionUserId)\}\}/g, ':id');
        assert(item.request.url.startsWith('{{baseUrl}}/api/v1/'));
        assert(item.event.some(event => event.listen === 'test' && event.script.exec.length));
        return `${item.request.method} ${url}`;
    }));
    for (const endpoint of registered) assert(covered.has(endpoint), endpoint);
    assert(!db.Buku && !db.Karakter);
    for (const name of ['buku', 'contoh', 'contohAxios']) assert(!fs.existsSync(path.join(__dirname, '../src/routes', `${name}.js`)));
});

test('Nested user terisolasi, PATCH mempertahankan alokasi, summary hanya periode dan kategori Budget', async () => {
    await withStore(async request => {
        const u1 = await request('POST', '/users', 201, { name: 'A', email: 'a@example.com', password: 'Password123!' });
        const u2 = await request('POST', '/users', 201, { name: 'B', email: 'b@example.com', password: 'Password123!' });
        const c1 = (await request('POST', '/categories', 201, { name: 'Makanan' })).data;
        const c2 = (await request('POST', '/categories', 201, { name: 'Lainnya' })).data;
        await request('POST', '/transactions', 201, { id_user: u1.id, id_category: c1.id, nominal: '0.10' });
        await request('POST', '/transactions', 201, { id_user: u1.id, id_category: c1.id, nominal: '0.20' });
        await request('POST', '/transactions', 201, { id_user: u1.id, id_category: c2.id, nominal: '999.00' });
        await request('POST', '/transactions', 201, { id_user: u2.id, id_category: c1.id, nominal: '888.00' });
        const date = new Date();
        const payload = { user_id: u1.id, month: date.getUTCMonth() + 1, year: date.getUTCFullYear(), budget_categories: [{ category_id: c1.id, allocated_amount: '1.00' }] };
        const b = (await request('POST', '/budgets', 201, payload)).data;
        const list = await request('GET', `/users/${u2.id}/transactions?mode=raw`, 200);
        assert.equal(list.data.length, 1);
        assert.equal(list.data[0].id_user, u2.id);
        assert.equal((await request('GET', `/users/${u2.id}/budgets`, 200)).data.length, 0);
        await request('GET', `/users/${u1.id}/budgets?user_id=${u2.id}`, 400);
        let summary = (await request('GET', `/budgets/${b.budget_id}/summary`, 200)).data;
        assert.equal(summary.total_spent, '0.30');
        assert.equal(summary.total_remaining, '0.70');
        const changed = (await request('PATCH', `/budgets/${b.budget_id}`, 200, { year: 2000 })).data;
        assert.equal(changed.categories.length, 1);
        assert.equal(changed.categories[0].Budget_categories.allocated_amount, '1.00');
        summary = (await request('GET', `/budgets/${b.budget_id}/summary`, 200)).data;
        assert.equal(summary.total_spent, '0.00');
        const originalBulk = db.BudgetCategory.bulkCreate;
        db.BudgetCategory.bulkCreate = async () => { throw new Error('simulated failure'); };
        try { await request('PATCH', `/budgets/${b.budget_id}`, 500, { year: 2001, budget_categories: [{ category_id: c2.id, allocated_amount: '2.00' }] }); }
        finally { db.BudgetCategory.bulkCreate = originalBulk; }
        const restored = (await request('GET', `/budgets/${b.budget_id}`, 200)).data;
        assert.equal(restored.year, 2000);
        assert.equal(restored.categories[0].id, c1.id);
        await request('PUT', '/transactions/1', 404, { id_user: 999, id_category: c1.id, nominal: '2.00', catatan: null });
        assert.equal((await request('GET', '/transactions/1', 200)).data.nominal, '0.10');
    });
});

test('Midtrans memakai order milik user, tidak memakai order tetap atau key dummy', async () => {
    const keys = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_ORDER_IDS'];
    const previous = keys.map(key => process.env[key]);
    const original = axios.defaults.adapter;
    try {
        await withStore(async request => {
            const user = await request('POST', '/users', 201, { name: 'Order', email: 'order@example.com', password: 'Password123!' });
            process.env.MIDTRANS_SERVER_KEY = 'TEST_KEY';
            process.env.MIDTRANS_ORDER_IDS = JSON.stringify({ [user.id]: 'order/user-1' });
            axios.defaults.adapter = async config => {
                assert(config.url.endsWith('/order%2Fuser-1/status'));
                return { status: 200, data: { transaction_status: 'settlement', payment_type: 'bank_transfer', transaction_time: '2026-10-13 10:00:00', secret: 'SHOULD_NOT_LEAK' }, config };
            };
            const result = await request('GET', `/users/${user.id}/subscription-status`, 200);
            assert.equal(result.data.profil_pengguna.id_pengguna, user.id);
            assert.equal(result.data.info_langganan.status_pembayaran, 'settlement');
            assert(!JSON.stringify(result).includes('SHOULD_NOT_LEAK'));
            process.env.MIDTRANS_ORDER_IDS = '{}';
            await request('GET', `/users/${user.id}/subscription-status`, 503);
        });
    } finally {
        axios.defaults.adapter = original;
        keys.forEach((key, index) => previous[index] === undefined ? delete process.env[key] : process.env[key] = previous[index]);
    }
});
