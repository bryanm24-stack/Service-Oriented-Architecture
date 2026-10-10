// Node.js 18+. Hanya membaca database melalui GET /api/v1/budgets.
require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../index');
const { sequelize } = require('../src/models');

const main = async () => {
    const logs = [];
    const originalLogging = sequelize.options.logging;
    sequelize.options.logging = sql => logs.push(sql);
    const server = app.listen(0, '127.0.0.1');

    try {
        await once(server, 'listening');

        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/budgets`);
        const body = await response.json();

        if (response.status !== 200) {
            throw new Error('GET Budget gagal. Periksa koneksi dan struktur database.');
        }

        const selects = logs.filter(sql => /\bSELECT\b/i.test(sql));

        if (selects.length !== 1 || !/JOIN/i.test(selects[0]) ||
            !selects[0].includes('budget_categories') || !selects[0].includes('allocated_amount')) {
            throw new Error('Jumlah/bentuk SELECT belum memenuhi bukti satu query JOIN.');
        }

        const stamp = new Date().toISOString();
        const filename = `BUKTI-BUDGET-JOIN-${stamp.replace(/[:.]/g, '-')}.md`;
        const report = [
            '# Bukti GET Budget pada MySQL',
            '',
            `Waktu: ${stamp}`,
            'Endpoint: GET /api/v1/budgets',
            'HTTP: 200',
            `Jumlah Budget: ${body.data.length}`,
            'Jumlah SELECT: 1',
            '',
            'SQL berikut ditangkap dari request yang benar-benar dijalankan:',
            '',
            '```sql',
            selects[0],
            '```',
            '',
            'Tidak ada isi baris data atau kredensial yang dicantumkan.',
            'Jika jumlah Budget nol, JOIN tetap dijalankan, tetapi contoh pivot perlu Budget yang berisi kategori.',
            ''
        ].join('\n');

        await fs.writeFile(path.join(__dirname, '..', filename), report, { flag: 'wx' });
        console.log(`Bukti tersimpan: ${filename}`);
    } finally {
        sequelize.options.logging = originalLogging;
        await new Promise(resolve => server.close(resolve));
        await sequelize.close();
    }
};

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
