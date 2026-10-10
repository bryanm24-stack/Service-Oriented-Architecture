const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

test('Migrasi gabungan memilih DB_NAME dan tidak berpindah ke database impor manual', async () => {
    const migrate = require('../scripts/migrate');
    const originalConnect = mysql.createConnection;
    const previousName = process.env.DB_NAME;

    try {
        for (const name of [undefined, 'uji_budget_khusus']) {
            if (name === undefined) delete process.env.DB_NAME;
            else process.env.DB_NAME = name;

            const calls = [];
            let closed = false;
            mysql.createConnection = async () => ({
                query: async sql => calls.push(sql),
                end: async () => { closed = true; }
            });

            await migrate();

            const expected = name || 'asisten_keuangan';
            assert.equal(calls.length, 3);
            assert.match(calls[0], new RegExp('CREATE DATABASE IF NOT EXISTS `' + expected + '`'));
            assert.equal(calls[1], 'USE `' + expected + '`');
            assert.doesNotMatch(calls[2], /^\s*(USE|CREATE DATABASE)\b/im);
            const tables = [...calls[2].matchAll(/^CREATE TABLE IF NOT EXISTS (\w+)/gm)].map(match => match[1]);
            assert.equal(tables.length, 8);
            assert.equal(new Set(tables).size, 8);
            assert(tables.indexOf('users') < tables.indexOf('budget'));
            assert(tables.indexOf('budget') < tables.indexOf('budget_categories'));
            assert(closed);
        }
    } finally {
        mysql.createConnection = originalConnect;
        if (previousName === undefined) delete process.env.DB_NAME;
        else process.env.DB_NAME = previousName;
    }
});

test('Jalur kompatibilitas memakai aplikasi dan model Budget utama yang sama', () => {
    const db = require('../src/models');
    assert.equal(require('../index-budget'), require('../index'));
    assert.equal(require('../src/budget/models').Budget, db.Budget);
    assert.equal(require('../src/models/Budget'), db.Budget);
    assert.equal(require('../src/models/Budget_categories'), db.BudgetCategory);
    assert.equal(require('../src/budget/routes'), require('../src/routes/budget'));
    assert.equal(db.Budget.associations.categories.target, db.Category);
    assert.equal(db.Budget.associations.categories.through.model, db.BudgetCategory);
});
