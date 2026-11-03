const test = require('node:test');
const assert = require('node:assert/strict');
const { Op, QueryTypes } = require('sequelize');
const app = require('../index');
const db = require('../src/models');

test('SQL injection: nama PATCH/apostrof tetap data, sort dan ID berbahaya ditolak', async () => {
    const originals = [db.User.create, db.User.findAll, db.sequelize.query];
    let raw, userQuery;
    db.User.create = async values => ({ toJSON: () => ({ id: 1, ...values }) });
    db.User.findAll = async options => { userQuery = options; return []; };
    db.sequelize.query = async (sql, options) => { raw = { sql, options }; return []; };
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    try {
        const name = "..PATCH.. O'Connor";
        const created = await fetch(base + '/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: 'literal@example.com', password: 'Password123!' })
        });
        assert.equal(created.status, 201);
        const data = await created.json();
        assert.equal(data.name, name);
        assert.equal(data.password, undefined);
        const payload = "'; DROP TABLE users; -- PATCH";
        const search = new URLSearchParams({ search: payload, mode: 'raw', sort: 'desc' });
        assert.equal((await fetch(base + '/transactions?' + search)).status, 200);
        assert(!raw.sql.includes(payload));
        assert.match(raw.sql, /LIKE \$search/);
        assert.match(raw.sql, /ORDER BY t.nominal DESC/);
        assert.equal(raw.options.bind.search, `%${payload}%`);
        assert.equal(raw.options.replacements, undefined);
        assert.equal((await fetch(base + '/users?' + new URLSearchParams({ search: payload }))).status, 200);
        assert.equal(userQuery.where.name[Op.like], `%${payload}%`);
        for (const path of ['/transactions?sort=desc%3BDROP', '/users?sort=id%3BDROP', '/users/1%20OR%201%3D1']) {
            assert.equal((await fetch(base + path)).status, 400);
        }
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        [db.User.create, db.User.findAll, db.sequelize.query] = originals;
    }
});

test('SQL injection: Sequelize meneruskan nilai terpisah ke execute MySQL', async () => {
    const manager = db.sequelize.connectionManager;
    const originalGet = manager.getConnection;
    const originalRelease = manager.releaseConnection;
    const calls = [];
    manager.getConnection = async () => ({
        execute(sql, parameters, callback) {
            calls.push({ sql, parameters });
            queueMicrotask(() => callback(null, []));
            return { setMaxListeners() {} };
        }
    });
    manager.releaseConnection = async () => {};
    try {
        const payload = "x' OR 1=1; -- PATCH";
        await db.sequelize.query('SELECT id FROM users WHERE name = $name', {
            bind: { name: payload }, type: QueryTypes.SELECT
        });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].sql, 'SELECT id FROM users WHERE name = ?');
        assert.deepEqual(calls[0].parameters, [payload]);
    } finally {
        manager.getConnection = originalGet;
        manager.releaseConnection = originalRelease;
    }
});
