const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const START = '<!-- MULAI BUKTI SQL BUDGET OTOMATIS -->';
const END = '<!-- SELESAI BUKTI SQL BUDGET OTOMATIS -->';

class EvidenceError extends Error {}

const checkEvidence = (status, body, logs) => {
    if (status !== 200 || !Array.isArray(body?.data)) {
        throw new EvidenceError(`GET Budget gagal (HTTP ${status}). Periksa MySQL, .env, dan tabel Budget.`);
    }

    const queries = logs.map(sql => String(sql)
        .replace(/^(?:Executing|Executed) \([^)]*\):\s*/, '').trim());
    const selects = queries.filter(sql => /^SELECT\b/i.test(sql));

    if (selects.length !== 1) {
        throw new EvidenceError(`Ditemukan ${selects.length} SELECT; bukti membutuhkan tepat satu SELECT.`);
    }

    const sql = selects[0];
    const plain = sql.replace(/`/g, '');

    if (!/\bFROM\s+budget\b/i.test(plain) ||
        !/\bJOIN\s*\(?\s*budget_categories\b/i.test(plain) ||
        !/\bJOIN\s+categories\b/i.test(plain) ||
        !/\ballocated_amount\b/i.test(plain)) {
        throw new EvidenceError('SELECT belum memuat JOIN Budget, kategori, dan kolom allocated_amount.');
    }

    if (body.data.length === 0) {
        throw new EvidenceError('Budget masih kosong. Buat Budget beserta alokasi kategori, lalu jalankan ulang.');
    }

    let allocations = 0;

    for (const budget of body.data) {
        if (!Array.isArray(budget.categories)) {
            throw new EvidenceError('Respons Budget belum menyertakan relasi categories.');
        }

        for (const category of budget.categories) {
            if (category.Budget_categories?.allocated_amount == null) {
                throw new EvidenceError('Respons kategori belum menyertakan pivot allocated_amount.');
            }

            allocations++;
        }
    }

    if (allocations === 0) {
        throw new EvidenceError('Belum ada alokasi kategori dalam respons Budget.');
    }

    return { sql, selectCount: selects.length, budgetCount: body.data.length, allocations };
};

const captureBudget = async (app, sequelize) => {
    const logs = [];
    const previousLogging = sequelize.options.logging;
    const previousBenchmark = sequelize.options.benchmark;
    sequelize.options.logging = sql => logs.push(sql);
    sequelize.options.benchmark = false;

    // Port acak dan loopback: tidak bergantung pada server npm start yang lain.
    const server = app.listen(0, '127.0.0.1');

    try {
        await new Promise((resolve, reject) => {
            server.once('listening', resolve);
            server.once('error', reject);
        });

        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/budgets`, {
            signal: AbortSignal.timeout(20000)
        });
        const body = await response.json();

        return checkEvidence(response.status, body, logs);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        sequelize.options.logging = previousLogging;
        sequelize.options.benchmark = previousBenchmark;
    }
};

const renderEvidence = evidence => [
    '## Bukti aktual SQL Budget: pemeriksaan N+1',
    '',
    `Waktu eksekusi (UTC): ${new Date().toISOString()}`,
    '',
    '| Pemeriksaan | Hasil |',
    '|---|---|',
    '| Endpoint | GET /api/v1/budgets |',
    '| HTTP | 200 |',
    '| Database | MySQL melalui konfigurasi .env |',
    `| Budget dalam respons | ${evidence.budgetCount} |`,
    `| Alokasi kategori dalam respons | ${evidence.allocations} |`,
    `| Jumlah SELECT selama request | ${evidence.selectCount} |`,
    '| Pivot pada respons | categories[].Budget_categories.allocated_amount |',
    '',
    'SQL berikut direkam oleh logger Sequelize saat endpoint dijalankan; bukan SQL contoh atau hasil query generator.',
    '',
    '```sql',
    evidence.sql,
    '```',
    '',
    'Pada request ini, Budget, Category, dan pivot diambil dalam satu SELECT JOIN. Tidak tercatat SELECT tambahan per Budget atau per kategori.',
    'Pemeriksaan ini berlaku untuk endpoint dan data pada eksekusi di atas, bukan jaminan untuk seluruh endpoint.',
    ...(evidence.budgetCount === 1 ? [
        '',
        'Keterbatasan sampel: hanya satu Budget. Ulangi dengan beberapa Budget untuk mendemonstrasikan jumlah query pada daftar yang lebih besar.'
    ] : []),
    '',
    'Isi baris respons dan kredensial tidak dimasukkan ke laporan.',
    ''
].join('\n');

const updateSection = (original, report) => {
    const starts = original.split(START).length - 1;
    const ends = original.split(END).length - 1;
    const block = `${START}\n${report.trimEnd()}\n${END}`;

    if (starts === 0 && ends === 0) {
        return `${original}${original.endsWith('\n') ? '' : '\n'}\n${block}\n`;
    }

    if (starts !== 1 || ends !== 1 || original.indexOf(START) > original.indexOf(END)) {
        throw new EvidenceError('Penanda bukti SQL dalam RANCANGAN.md tidak valid. Dokumen tidak diubah.');
    }

    return original.slice(0, original.indexOf(START)) + block +
        original.slice(original.indexOf(END) + END.length);
};

const saveEvidence = async (root, report) => {
    const target = path.join(root, 'RANCANGAN.md');
    const original = await fs.readFile(target);
    const updated = updateSection(original.toString('utf8'), report);
    const suffix = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const backupDirectory = path.join(root, 'backup-bukti-sql');
    const backup = path.join(backupDirectory, `RANCANGAN-${suffix}.md`);
    const evidenceFile = path.join(root, `BUKTI-BUDGET-JOIN-${suffix}.md`);
    const temporary = path.join(root, `RANCANGAN-${suffix}.tmp`);

    await fs.mkdir(backupDirectory, { recursive: true });
    await fs.writeFile(backup, original, { flag: 'wx' });
    await fs.writeFile(evidenceFile, report, { flag: 'wx' });

    try {
        await fs.writeFile(temporary, updated, { flag: 'wx' });

        if (!(await fs.readFile(target)).equals(original)) {
            throw new EvidenceError('RANCANGAN.md berubah selama perekaman. Versi terbaru tidak ditimpa.');
        }

        await fs.rename(temporary, target);
    } finally {
        await fs.rm(temporary, { force: true });
    }

    return { evidenceFile, backup };
};

module.exports = {
    EvidenceError,
    checkEvidence,
    captureBudget,
    renderEvidence,
    updateSection,
    saveEvidence
};
