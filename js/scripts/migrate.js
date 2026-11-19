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


    // SOA wallet + AI metering: additive migration, preserves existing purchased balances.
    const addColumn = async (table, name, definition) => {
      const [found] = await connection.query(`SHOW COLUMNS FROM ${mysql.escapeId(table)} LIKE ?`, [name]);
      if (!found.length) await connection.query(`ALTER TABLE ${mysql.escapeId(table)} ADD COLUMN ${mysql.escapeId(name)} ${definition}`);
    };
    await addColumn('token_wallets', 'available_tokens', 'BIGINT UNSIGNED NOT NULL DEFAULT 0');
    await addColumn('token_wallets', 'reserved_tokens', 'BIGINT UNSIGNED NOT NULL DEFAULT 0');
    await connection.query('UPDATE token_wallets SET available_tokens = balance WHERE available_tokens = 0 AND balance > 0');
    await addColumn('token_ledgers', 'event_key', 'VARCHAR(120) NULL');
    await addColumn('token_ledgers', 'entry_type', "ENUM('credit','debit','reserve','release') NOT NULL DEFAULT 'credit'");
    await addColumn('token_ledgers', 'status', "ENUM('completed','reserved','failed','needs_reconciliation') NOT NULL DEFAULT 'completed'");
    await addColumn('token_ledgers', 'available_after', 'BIGINT UNSIGNED NOT NULL DEFAULT 0');
    await addColumn('token_ledgers', 'reserved_after', 'BIGINT UNSIGNED NOT NULL DEFAULT 0');
    await addColumn('token_ledgers', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    const [purchaseColumn] = await connection.query("SHOW COLUMNS FROM token_ledgers LIKE 'token_purchase_id'");
    if (purchaseColumn.length && String(purchaseColumn[0].Null).toUpperCase() === 'NO') {
      await connection.query('ALTER TABLE token_ledgers MODIFY token_purchase_id INT UNSIGNED NULL');
    }
    await connection.query("UPDATE token_ledgers SET available_after = balance_after WHERE available_after = 0 AND reserved_after = 0 AND entry_type = 'credit'");
    const [eventIndex] = await connection.query("SHOW INDEX FROM token_ledgers WHERE Key_name = 'uq_token_ledger_event'");
    if (!eventIndex.length) await connection.query('ALTER TABLE token_ledgers ADD UNIQUE KEY uq_token_ledger_event (event_key)');
    await connection.query(`CREATE TABLE IF NOT EXISTS ai_usages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL, idempotency_key VARCHAR(80) NOT NULL, prompt_hash CHAR(64) NOT NULL,
      provider VARCHAR(40) NULL, model VARCHAR(120) NULL,
      status ENUM('reserved','completed','failed','needs_reconciliation') NOT NULL DEFAULT 'reserved',
      reserved_tokens INT UNSIGNED NOT NULL DEFAULT 0, input_tokens INT UNSIGNED NULL, output_tokens INT UNSIGNED NULL,
      provider_total_tokens INT UNSIGNED NULL, thinking_tokens INT UNSIGNED NULL,
      cache_tokens INT UNSIGNED NULL, tool_tokens INT UNSIGNED NULL,
      actual_tokens INT UNSIGNED NULL, response_text LONGTEXT NULL, error_code VARCHAR(64) NULL,
      dispatch_started_at DATETIME NULL, reservation_expires_at DATETIME NOT NULL, completed_at DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ai_usage_owner_idempotency (user_id, idempotency_key),
      INDEX idx_ai_usage_owner_created (user_id, createdAt),
      INDEX idx_ai_usage_status_expiry (status, reservation_expires_at),
      CONSTRAINT fk_ai_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
    const [apiKeyIndex] = await connection.query("SHOW INDEX FROM api_clients WHERE Key_name = 'uq_api_client_key_hash'");
    if (!apiKeyIndex.length) await connection.query('ALTER TABLE api_clients ADD UNIQUE KEY uq_api_client_key_hash (key_hash)');
    await connection.query(`INSERT INTO api_tiers (name, rate_limit, window_seconds, is_active)
      SELECT 'AI Basic', 10, 60, 1 WHERE NOT EXISTS (SELECT 1 FROM api_tiers WHERE is_active = 1)`);

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
