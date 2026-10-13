const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });

const {
    EvidenceError,
    captureBudget,
    renderEvidence,
    saveEvidence
} = require('./lib/budget-evidence');

const main = async () => {
    const app = require('../index');
    const { sequelize } = require('../src/models');

    try {
        const evidence = await captureBudget(app, sequelize);
        const report = renderEvidence(evidence);
        const saved = await saveEvidence(root, report);

        console.log(`[BUKTI] HTTP 200; ${evidence.budgetCount} Budget; ${evidence.selectCount} SELECT JOIN.`);
        console.log('[BUKTI] Log aktual telah dimasukkan ke RANCANGAN.md.');
        console.log(`[BUKTI] Salinan: ${path.basename(saved.evidenceFile)}`);
        console.log(`[BUKTI] Cadangan: backup-bukti-sql/${path.basename(saved.backup)}`);
    } finally {
        await sequelize.close();
    }
};

if (require.main === module) {
    main().catch(error => {
        console.error(error instanceof EvidenceError
            ? `[BUKTI] ${error.message}`
            : '[BUKTI] Gagal merekam/menyimpan bukti. Periksa MySQL, konfigurasi .env, RANCANGAN.md, dan izin tulis folder.');
        process.exitCode = 1;
    });
}

module.exports = main;
