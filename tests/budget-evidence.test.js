const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const {
    checkEvidence,
    captureBudget,
    updateSection,
    saveEvidence
} = require('../scripts/lib/budget-evidence');

// Seluruh SQL/data pada tes ini adalah fixture, bukan bukti MySQL aktual.
const sql = 'Executing (default): SELECT `Budget`.`budget_id`, `categories->Budget_categories`.`allocated_amount` FROM `budget` AS `Budget` LEFT OUTER JOIN (`budget_categories` AS `categories->Budget_categories` INNER JOIN `categories` AS `categories` ON `categories`.`id` = `categories->Budget_categories`.`category_id`) ON `Budget`.`budget_id` = `categories->Budget_categories`.`budget_id`;';
const body = {
    data: [1, 2, 3].map(id => ({
        budget_id: id,
        categories: [{ id: 1, Budget_categories: { allocated_amount: '1000.00' } }]
    }))
};

test('Perekam menerima satu JOIN dan menolak pola N+1, data kosong, dan pivot hilang', () => {
    const result = checkEvidence(200, body, [sql]);
    assert.equal(result.selectCount, 1);
    assert.equal(result.budgetCount, 3);
    assert.equal(result.allocations, 3);
    assert.throws(() => checkEvidence(200, body, [sql, 'SELECT * FROM categories']), /2 SELECT/);
    assert.throws(() => checkEvidence(200, body, []), /0 SELECT/);
    assert.throws(() => checkEvidence(503, {}, []), /HTTP 503/);
    assert.throws(() => checkEvidence(200, { data: [] }, [sql]), /masih kosong/);
    assert.throws(() => checkEvidence(200, { data: [{ categories: [{ id: 1 }] }] }, [sql]), /pivot/);
    assert.throws(() => checkEvidence(200, body, ['SELECT * FROM budget']), /JOIN/);
});

test('Capture melakukan HTTP GET lokal dan mengembalikan konfigurasi logger', async () => {
    const sequelize = { options: { logging: false, benchmark: true } };
    const app = express();
    app.get('/api/v1/budgets', (req, res) => {
        sequelize.options.logging(sql);
        res.json(body);
    });
    const result = await captureBudget(app, sequelize);
    assert.equal(result.budgetCount, 3);
    assert.equal(sequelize.options.logging, false);
    assert.equal(sequelize.options.benchmark, true);
});

test('Capture HTTP gagal tetap memulihkan logger dan tidak menghasilkan bukti', async () => {
    const sequelize = { options: { logging: false, benchmark: false } };
    const app = express();
    app.get('/api/v1/budgets', (req, res) => res.status(503).json({ msg: 'DB tidak tersedia' }));
    await assert.rejects(captureBudget(app, sequelize), /HTTP 503/);
    assert.equal(sequelize.options.logging, false);
});

test('Penyimpanan mencadangkan bytes asli, mempertahankan teks lain, dan tidak menggandakan bagian bukti', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'budget-proof-test-'));
    const original = Buffer.from('# RANCANGAN\r\n\r\nIsi anggota kelompok tetap utuh.\r\n');
    const target = path.join(root, 'RANCANGAN.md');

    try {
        await fs.writeFile(target, original);
        const first = await saveEvidence(root, 'LAPORAN SIMULASI PERTAMA\n');
        assert.deepEqual(await fs.readFile(first.backup), original);
        let content = await fs.readFile(target, 'utf8');
        assert(content.startsWith(original.toString()));
        const tail = '\n## Catatan manual\nTidak boleh hilang.\n';
        await fs.appendFile(target, tail);
        await saveEvidence(root, 'LAPORAN SIMULASI KEDUA\n');
        content = await fs.readFile(target, 'utf8');
        assert.equal(content.split('<!-- MULAI BUKTI SQL BUDGET OTOMATIS -->').length - 1, 1);
        assert(!content.includes('SIMULASI PERTAMA'));
        assert(content.includes('SIMULASI KEDUA'));
        assert(content.endsWith(tail));
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('Penanda rusak ditolak sebelum membuat file bukti atau mengubah RANCANGAN', async () => {
    const broken = '# Rancangan\n<!-- MULAI BUKTI SQL BUDGET OTOMATIS -->\n';
    assert.throws(() => updateSection(broken, 'fixture'), /tidak valid/);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'budget-proof-test-'));

    try {
        await fs.writeFile(path.join(root, 'RANCANGAN.md'), broken);
        await assert.rejects(saveEvidence(root, 'fixture'), /tidak valid/);
        assert.deepEqual(await fs.readdir(root), ['RANCANGAN.md']);
        assert.equal(await fs.readFile(path.join(root, 'RANCANGAN.md'), 'utf8'), broken);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});
