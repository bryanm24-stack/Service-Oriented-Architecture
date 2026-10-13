require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const main = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'asisten_keuangan',
        multipleStatements: true
    });

    try {
        const sql = fs.readFileSync(path.join(__dirname, '../sql/Budget-Tambahan.sql'), 'utf8');

        await connection.query(sql);

        console.log('[migrate] Tabel Budget dan pivot tersedia; data lama tidak dikosongkan.');
    } finally {
        await connection.end();
    }
};

if (require.main === module) {
    main().catch(() => {
        console.error('[migrate] Gagal. Periksa koneksi dan kesesuaian struktur tabel yang sudah ada.');
        process.exitCode = 1;
    });
}

module.exports = main;
