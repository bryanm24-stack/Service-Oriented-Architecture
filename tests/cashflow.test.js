const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const crypto = require('node:crypto');
const enabled = process.env.RUN_MYSQL_TESTS === '1';
test(
  'HTTP + MySQL: migrasi, auth, ownership, CRUD, ORM/raw, Budget dan arus kas nyata',
  { skip: !enabled, timeout: 120000 },
  async (t) => {
    const name = process.env.TEST_DB_NAME || `soa_test_${crypto.randomBytes(6).toString('hex')}`;
    assert.match(name, /^soa_test_[a-z0-9_]+$/i, 'Database tes wajib berawalan soa_test_');
    process.env.DB_NAME = name;
    process.env.DB_PORT = process.env.TEST_DB_PORT || process.env.DB_PORT || '3306';
    process.env.DB_HOST = process.env.TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1';
    process.env.JWT_ACCESS_SECRET = crypto.randomBytes(48).toString('hex');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    const db = require('../src/models');
    const app = require('../index');
    const migrate = require('../scripts/migrate');
    const { hashPassword } = require('../src/utils/password');
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    let a, b, admin, category, expense, income, budget, oldId;
    const call = async (method, url, body, token, expected) => {
      const response = await fetch(base + url, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw Error(raw);
      }
      if (expected !== undefined)
        assert.equal(response.status, expected, `${method} ${url}: ${raw}`);
      return { status: response.status, data, response };
    };
    const register = async (label) => {
      const email = `${label}-${Date.now()}@example.com`,
        password = 'Password123!';
      const created = await call(
        'POST',
        '/auth/register',
        { name: label, email, password, konfirmasi_password: password },
        null,
        201,
      );
      const login = await call(
        'POST',
        '/auth/login',
        { email: email.toUpperCase(), password },
        null,
        200,
      );
      return {
        id: created.data.user.id,
        email,
        password,
        token: login.data.accessToken,
        cookie: login.response.headers.get('set-cookie').split(';')[0],
      };
    };
    try {
      await connection.query(`CREATE DATABASE \`${name}\`; USE \`${name}\``);
      // Real upgrade from a table without type and without role; preserve historical bytes/IDs.
      const legacy = fs
        .readFileSync(path.join(__dirname, '../sql/Gabungan.sql'), 'utf8')
        .replace(/-- BEGIN DATABASE SELECTION[\s\S]*?-- END DATABASE SELECTION/, '')
        .replace("  type ENUM('income','expense') NOT NULL DEFAULT 'expense',", '')
        .replace("  role VARCHAR(50) NOT NULL DEFAULT 'user',", '');
      await connection.query(legacy);
      const [insert] = await connection.query(
        "INSERT INTO transactions(id_user,id_category,nominal,catatan,createdAt,updatedAt) SELECT u.id,c.id,123.45,'legacy-kept','2026-10-01 00:00:00','2026-10-01 00:00:00' FROM users u CROSS JOIN categories c LIMIT 1",
      );
      oldId = insert.insertId;
      await t.test('Migrasi dua kali mempertahankan data lama dan default expense', async () => {
        await migrate();
        await migrate();
        const [[row]] = await connection.query(
          'SELECT * FROM transactions WHERE id_transaction=?',
          [oldId],
        );
        assert.equal(row.type, 'expense');
        assert.equal(row.nominal, '123.45');
        assert.equal(row.catatan, 'legacy-kept');
        const [[count]] = await connection.query('SELECT COUNT(*) AS n FROM transactions');
        assert.equal(count.n, 1);
      });
      await t.test(
        'Register masuk database, password hash, login, duplicate dan validasi',
        async () => {
          a = await register('UserA');
          b = await register('UserB');
          admin = await register('Admin');
          const stored = await db.User.scope('withPassword').findByPk(a.id);
          assert.match(stored.password, /^scrypt\$/);
          assert.notEqual(stored.password, a.password);
          await db.User.update({ role: 'admin' }, { where: { id: admin.id } });
          assert.equal((await call('GET', '/auth/me', undefined, a.token, 200)).data.user.id, a.id);
          await call(
            'POST',
            '/auth/register',
            {
              name: 'Duplicate',
              email: a.email,
              password: a.password,
              konfirmasi_password: a.password,
            },
            null,
            409,
          );
          await call('POST', '/auth/login', { email: a.email, password: 'incorrect' }, null, 401);
          await call(
            'POST',
            '/auth/register',
            { name: 'x', email: 'bad', password: 'short', konfirmasi_password: 'wrong' },
            null,
            400,
          );
          await call(
            'POST',
            '/auth/register',
            {
              name: 'x',
              email: 'x@example.com',
              password: a.password,
              konfirmasi_password: a.password,
              role: 'admin',
            },
            null,
            400,
          );
          await call('GET', '/transactions', undefined, null, 401);
        },
      );
      await t.test(
        'Kategori admin, create transaksi menentukan owner, nominal nonnegatif',
        async () => {
          await call('POST', '/categories', { name: 'Denied' }, a.token, 403);
          await call('GET', '/users', undefined, a.token, 403);
          category = (
            await call(
              'POST',
              '/categories',
              { name: "  Test   O'Connor  ", icon: 'food' },
              admin.token,
              201,
            )
          ).data.data;
          assert.equal(category.name, "Test O'Connor");
          expense = (
            await call(
              'POST',
              '/transactions',
              { id_category: category.id, type: 'expense', nominal: '15000.10', catatan: 'Lunch' },
              a.token,
              201,
            )
          ).data.data;
          income = (
            await call(
              'POST',
              '/transactions',
              { id_category: category.id, type: 'income', nominal: '100000.20', catatan: 'Salary' },
              a.token,
              201,
            )
          ).data.data;
          assert.equal(expense.id_user, a.id);
          await call(
            'POST',
            '/transactions',
            { id_user: b.id, id_category: category.id, nominal: '1' },
            a.token,
            403,
          );
          for (const nominal of ['-1', '1.234', '99999999999999', '1; DROP TABLE users'])
            await call(
              'POST',
              '/transactions',
              { id_category: category.id, nominal },
              a.token,
              400,
            );
          await call(
            'POST',
            '/transactions',
            { id_category: category.id, nominal: '1', type: 'invalid' },
            a.token,
            400,
          );
          await call('POST', '/transactions', { id_category: 999999, nominal: '1' }, a.token, 404);
          const zero = await call(
            'POST',
            '/transactions',
            { id_category: category.id, nominal: '0' },
            a.token,
            201,
          );
          await call(
            'DELETE',
            '/transactions/' + zero.data.data.id_transaction,
            undefined,
            a.token,
            204,
          );
          await call(
            'POST',
            '/transactions',
            {
              id_category: category.id,
              type: 'income',
              nominal: '900000.00',
              catatan: 'PRIVATE-B',
            },
            b.token,
            201,
          );
        },
      );
      await t.test(
        'Semua jalur baca/tulis user lain termasuk konversi dan nested ditolak',
        async () => {
          for (const url of [
            `/transactions/${expense.id_transaction}`,
            `/transactions/${expense.id_transaction}/conversion`,
            `/users/${a.id}`,
            `/users/${a.id}/transactions`,
            `/users/${a.id}/transactions?mode=raw`,
            `/users/${a.id}/budgets`,
            `/users/${a.id}/subscription-status`,
          ])
            await call('GET', url, undefined, b.token, 404);
          await call(
            'PATCH',
            '/transactions/' + expense.id_transaction,
            { nominal: '1' },
            b.token,
            404,
          );
          await call(
            'PUT',
            '/transactions/' + expense.id_transaction,
            { id_category: category.id, type: 'expense', nominal: '1', catatan: null },
            b.token,
            404,
          );
          await call('DELETE', '/transactions/' + expense.id_transaction, undefined, b.token, 404);
          await call('PATCH', '/users/' + a.id, { name: 'stolen' }, b.token, 404);
          await call('DELETE', '/users/' + a.id, undefined, b.token, 404);
          for (const mode of ['orm', 'raw']) {
            const list = await call(
              'GET',
              `/categories/${category.id}/transactions?mode=${mode}`,
              undefined,
              b.token,
              200,
            );
            assert(list.data.data.every((x) => x.id_user === b.id));
            const normal = await call('GET', `/transactions?mode=${mode}`, undefined, b.token, 200);
            assert(normal.data.data.every((x) => x.id_user === b.id));
            await call(
              'GET',
              `/transactions?mode=${mode}&user_id=${a.id}`,
              undefined,
              b.token,
              404,
            );
          }
        },
      );
      await t.test(
        'ORM/raw setara untuk filter, sort, pagination, injection dan batas tanggal Jakarta',
        async () => {
          await connection.execute('UPDATE transactions SET createdAt=? WHERE id_transaction=?', [
            '2026-11-01 02:00:00',
            expense.id_transaction,
          ]);
          await connection.execute('UPDATE transactions SET createdAt=? WHERE id_transaction=?', [
            '2026-11-01 03:00:00',
            income.id_transaction,
          ]);
          for (const suffix of [
            '',
            '&type=income',
            '&type=expense',
            '&category_id=' + category.id,
            '&search=Salary',
            '&start_date=2026-11-01&end_date=2026-11-01',
            '&minNominal=1&maxNominal=99999',
            '&sort=asc&sort_by=nominal',
            '&limit=1&offset=1',
          ]) {
            const orm = await call(
                'GET',
                '/transactions?mode=orm' + suffix,
                undefined,
                a.token,
                200,
              ),
              raw = await call('GET', '/transactions?mode=raw' + suffix, undefined, a.token, 200);
            assert.deepEqual(orm.data, raw.data, suffix);
          }
          const unsafe = encodeURIComponent("'; DROP TABLE users; --");
          for (const mode of ['orm', 'raw'])
            assert.equal(
              (
                await call(
                  'GET',
                  `/transactions?mode=${mode}&search=${unsafe}`,
                  undefined,
                  a.token,
                  200,
                )
              ).data.meta.total,
              0,
            );
          for (const query of [
            'sort=desc%3BDROP',
            'start_date=2026-02-30',
            'start_date=2026-11-03&end_date=2026-11-01',
            'sort_by=nominal%3BDROP',
            'limit=0',
            'offset=-1',
          ])
            await call('GET', '/transactions?' + query, undefined, a.token, 400);
          const edge = (
            await call(
              'POST',
              '/transactions',
              { id_category: category.id, nominal: '0.10', catatan: 'UTC-boundary' },
              a.token,
              201,
            )
          ).data.data;
          await connection.execute('UPDATE transactions SET createdAt=? WHERE id_transaction=?', [
            '2026-10-31 17:00:00',
            edge.id_transaction,
          ]);
          for (const mode of ['orm', 'raw'])
            assert.equal(
              (
                await call(
                  'GET',
                  `/transactions?mode=${mode}&start_date=2026-11-01&end_date=2026-11-01&search=UTC-boundary`,
                  undefined,
                  a.token,
                  200,
                )
              ).data.meta.total,
              1,
            );
          await call('DELETE', '/transactions/' + edge.id_transaction, undefined, a.token, 204);
        },
      );
      await t.test(
        'Agregasi penuh sama pada dashboard dan daftar meskipun limit satu',
        async () => {
          const summary = (
            await call(
              'GET',
              '/transactions/summary?period=2026-11&limit=1',
              undefined,
              a.token,
              200,
            )
          ).data.data;
          assert.equal(summary.income, '100000.20');
          assert.equal(summary.expense, '15000.10');
          assert.equal(summary.difference, '85000.10');
          assert.equal(summary.total_transactions, 2);
          assert.equal(summary.label, 'Arus kas tercatat');
          assert.deepEqual(
            (
              await call(
                'GET',
                '/dashboard/summary?period=2026-11&limit=1',
                undefined,
                a.token,
                200,
              )
            ).data.data,
            summary,
          );
          const ownB = (await call('GET', '/transactions/summary', undefined, b.token, 200)).data
            .data;
          assert.equal(ownB.income, '900000.00');
          for (let i = 0; i < 12; i++)
            await call(
              'POST',
              '/transactions',
              { id_category: category.id, type: 'expense', nominal: '0.10', catatan: 'pagination' },
              a.token,
              201,
            );
          const list = (await call('GET', '/transactions?limit=10', undefined, a.token, 200)).data;
          assert.equal(list.meta.total, 14);
          assert.equal(list.data.length, 10);
          const s = (await call('GET', '/transactions/summary', undefined, a.token, 200)).data.data;
          assert.equal(s.expense, '15001.30');
        },
      );
      await t.test('Budget N:M, hanya expense, ownership seluruh CRUD/summary', async () => {
        const payload = {
          month: 11,
          year: 2026,
          budget_categories: [{ category_id: category.id, allocated_amount: '20000.00' }],
        };
        budget = (await call('POST', '/budgets', payload, a.token, 201)).data.data;
        assert.equal(budget.user_id, a.id);
        const summary = (
          await call('GET', `/budgets/${budget.budget_id}/summary`, undefined, a.token, 200)
        ).data.data;
        assert.equal(summary.total_spent, '15001.30');
        assert.equal(summary.total_remaining, '4998.70');
        await call('POST', '/budgets', payload, a.token, 409);
        for (const url of [
          `/budgets/${budget.budget_id}`,
          `/budgets/${budget.budget_id}/summary`,
          `/budgets?user_id=${a.id}`,
        ])
          await call('GET', url, undefined, b.token, 404);
        await call('PATCH', `/budgets/${budget.budget_id}`, { month: 12 }, b.token, 404);
        await call('PUT', `/budgets/${budget.budget_id}`, payload, b.token, 404);
        await call('DELETE', `/budgets/${budget.budget_id}`, undefined, b.token, 404);
        assert.equal((await call('GET', '/budgets', undefined, b.token, 200)).data.data.length, 0);
        await call(
          'PUT',
          `/budgets/${budget.budget_id}`,
          { ...payload, user_id: b.id },
          a.token,
          403,
        );
        await call('PUT', `/budgets/${budget.budget_id}`, payload, a.token, 200);
        await call('PATCH', `/budgets/${budget.budget_id}`, { year: 2027 }, a.token, 200);
        await call('PATCH', `/budgets/${budget.budget_id}`, { year: 2026 }, a.token, 200);
        assert.equal(
          (await call('GET', `/users/${a.id}/budgets`, undefined, a.token, 200)).data.data.length,
          1,
        );
      });
      await t.test(
        'Edit type, kategori, PUT/PATCH dan total selalu berubah dari database',
        async () => {
          await call(
            'PATCH',
            `/transactions/${expense.id_transaction}`,
            { type: 'income', nominal: '15000.10', id_category: category.id },
            a.token,
            200,
          );
          const s = (
            await call('GET', '/transactions/summary?period=2026-11', undefined, a.token, 200)
          ).data.data;
          assert.equal(s.income, '115000.30');
          assert.equal(s.expense, '1.20');
          assert.equal(
            (await call('GET', `/budgets/${budget.budget_id}/summary`, undefined, a.token, 200))
              .data.data.total_spent,
            '1.20',
          );
          await call(
            'PATCH',
            `/transactions/${expense.id_transaction}`,
            { id_user: b.id },
            a.token,
            400,
          );
          await call(
            'PUT',
            `/transactions/${expense.id_transaction}`,
            {
              id_user: b.id,
              id_category: category.id,
              type: 'expense',
              nominal: '1',
              catatan: null,
            },
            a.token,
            403,
          );
          await call(
            'PUT',
            `/transactions/${expense.id_transaction}`,
            { id_category: category.id, type: 'expense', nominal: '15000.10', catatan: 'restored' },
            a.token,
            200,
          );
          await call('PATCH', `/transactions/${expense.id_transaction}`, {}, a.token, 400);
        },
      );
      await t.test(
        'Matriks admin, kategori konflik, user update dan method/status REST',
        async () => {
          const list = (await call('GET', '/transactions?limit=100', undefined, admin.token, 200))
            .data;
          assert(list.data.some((x) => x.id_user === a.id));
          assert(list.data.some((x) => x.id_user === b.id));
          await call('GET', `/users/${a.id}/transactions`, undefined, admin.token, 200);
          await call('GET', '/users', undefined, admin.token, 200);
          await call('PATCH', '/users/' + a.id, { name: "User A O'Connor" }, a.token, 200);
          await call(
            'PUT',
            '/users/' + a.id,
            { name: 'User A', email: a.email, password: a.password },
            a.token,
            200,
          );
          const user = (
            await call(
              'POST',
              '/users',
              { name: 'temporary', email: 'temporary@example.com', password: a.password },
              admin.token,
              201,
            )
          ).data;
          await call('DELETE', '/users/' + user.id, undefined, admin.token, 200);
          await call('GET', '/users/' + user.id, undefined, admin.token, 404);
          await call('DELETE', '/categories/' + category.id, undefined, admin.token, 409);
          const c = (
            await call('POST', '/categories', { name: 'Disposable', icon: null }, admin.token, 201)
          ).data.data;
          await call('GET', '/categories/' + c.id, undefined, a.token, 200);
          await call(
            'PUT',
            '/categories/' + c.id,
            { name: 'Renamed', icon: null },
            admin.token,
            200,
          );
          await call('PATCH', '/categories/' + c.id, { name: 'Final' }, admin.token, 200);
          await call('DELETE', '/categories/' + c.id, undefined, admin.token, 204);
          await call('POST', '/transactions/' + expense.id_transaction, {}, a.token, 405);
          await call('GET', '/transactions/abc', undefined, a.token, 400);
          await call('GET', '/transactions/999999', undefined, a.token, 404);
        },
      );
      await t.test(
        'Refresh cookie berotasi, logout mencabut JWT, akun soft-delete tidak dapat login',
        async () => {
          const refresh = await fetch(base + '/auth/refresh', {
            method: 'POST',
            headers: { Cookie: a.cookie },
          });
          assert.equal(refresh.status, 200);
          const body = await refresh.json();
          const nextCookie = refresh.headers.get('set-cookie').split(';')[0];
          assert.notEqual(nextCookie, a.cookie);
          assert.equal(
            (await fetch(base + '/auth/refresh', { method: 'POST', headers: { Cookie: a.cookie } }))
              .status,
            401,
          );
          const logout = await fetch(base + '/auth/logout', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + body.accessToken, Cookie: nextCookie },
          });
          assert.equal(logout.status, 204);
          await call('GET', '/auth/me', undefined, body.accessToken, 401);
          assert.equal(
            (
              await fetch(base + '/auth/refresh', {
                method: 'POST',
                headers: { Cookie: nextCookie },
              })
            ).status,
            401,
          );
          await call('DELETE', '/users/' + b.id, undefined, b.token, 200);
          await call('GET', '/transactions', undefined, b.token, 401);
          await call('POST', '/auth/login', { email: b.email, password: b.password }, null, 401);
        },
      );
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await db.sequelize.close();
      await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
      await connection.end();
    }
  },
);
