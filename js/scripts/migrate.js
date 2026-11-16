require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const main = async () => {
  const database = process.env.DB_NAME || 'asisten_keuangan';
  // Pemilihan DB dilakukan dari .env; blok untuk impor manual dilewati.
  const sql = fs
    .readFileSync(path.join(__dirname, '..', '..', 'sql', 'Gabungan.sql'), 'utf8')
    .replace(/-- BEGIN DATABASE SELECTION[\s\S]*?-- END DATABASE SELECTION/, '');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const quoted = mysql.escapeId(database);

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    await connection.query(`USE ${quoted}`);

    await connection.query(sql);

    // CREATE TABLE IF NOT EXISTS tidak menambah kolom pada DB lama.
    // Role sudah ada di model User branch-baru; tambahkan hanya jika belum ada.
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
    if (columns.length === 0) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'",
      );
    }

    const [typeColumns] = await connection.query("SHOW COLUMNS FROM transactions LIKE 'type'");
    if (typeColumns.length === 0) {
      await connection.query(
        "ALTER TABLE transactions ADD COLUMN type ENUM('income','expense') NOT NULL DEFAULT 'expense' AFTER id_user",
      );
    } else if (
      !String(typeColumns[0].Type).toLowerCase().includes("'income'") ||
      !String(typeColumns[0].Type).toLowerCase().includes("'expense'")
    ) {
      throw new Error(
        'Kolom transactions.type sudah ada dengan definisi berbeda; audit sebelum upgrade.',
      );
    }
    const [indexes] = await connection.query(
      "SHOW INDEX FROM transactions WHERE Key_name = 'idx_transactions_owner_type_date'",
    );
    if (indexes.length === 0)
      await connection.query(
        'ALTER TABLE transactions ADD INDEX idx_transactions_owner_type_date (id_user,type,createdAt)',
      );

    const [purchaseStatus] = await connection.query("SHOW COLUMNS FROM token_purchases LIKE 'status'");
    if (purchaseStatus.length > 0 && !String(purchaseStatus[0].Type).toLowerCase().includes("'needs_review'")) {
      await connection.query(
        "ALTER TABLE token_purchases MODIFY status ENUM('pending','paid','failed','cancelled','expired','needs_review') NOT NULL DEFAULT 'pending'",
      );
    }

    const paymentColumns = [
      ['provider_transaction_id', 'VARCHAR(255) NULL'],
      ['provider_transaction_status', 'VARCHAR(32) NULL'],
      ['provider_fraud_status', 'VARCHAR(32) NULL'],
      ['provider_response', 'JSON NULL'],
    ];
    for (const [name, definition] of paymentColumns) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM token_purchases LIKE '${name}'`);
      if (columns.length === 0) {
        await connection.query(`ALTER TABLE token_purchases ADD COLUMN ${name} ${definition}`);
      }
    }
    const [paymentIndexes] = await connection.query(
      "SHOW INDEX FROM token_purchases WHERE Key_name = 'idx_token_purchase_provider_transaction'",
    );
    if (paymentIndexes.length === 0) {
      await connection.query(
        'ALTER TABLE token_purchases ADD INDEX idx_token_purchase_provider_transaction (provider_transaction_id)',
      );
    }

    console.log('[migrate] Gabungan.sql selesai. Data lama tidak dikosongkan.');
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[migrate] Gagal:', error.message);

    process.exitCode = 1;
  });
}

module.exports = main;
