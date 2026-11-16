-- SOA-20261116-11: payment provider state and idempotent token crediting.
ALTER TABLE token_purchases
  MODIFY status ENUM('pending','paid','failed','cancelled','expired','needs_review') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS provider_transaction_status VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS provider_fraud_status VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS provider_response JSON NULL,
  ADD INDEX IF NOT EXISTS idx_token_purchase_provider_transaction (provider_transaction_id);

CREATE TABLE IF NOT EXISTS token_wallets (
  user_id INT NOT NULL PRIMARY KEY,
  balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_wallet_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_token_wallet_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS token_ledgers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_purchase_id INT UNSIGNED NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  balance_after BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(64) NOT NULL DEFAULT 'purchase',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_ledger_purchase (token_purchase_id),
  INDEX idx_token_ledger_user_date (user_id, createdAt),
  CONSTRAINT fk_token_ledger_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_token_ledger_purchase FOREIGN KEY (token_purchase_id) REFERENCES token_purchases(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_token_ledger_amount CHECK (amount > 0)
) ENGINE=InnoDB;
