-- SOA-20261106-05: additive only; run AFTER Gabungan.sql.
-- No DROP, reset, modification to wallet/tier, or automatic demo seeding.
CREATE TABLE IF NOT EXISTS token_bundles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  token_quota INT UNSIGNED NOT NULL,
  price_idr DECIMAL(15,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL DEFAULT NULL,
  CONSTRAINT chk_bundle_quota CHECK (token_quota BETWEEN 1 AND 2147483647),
  CONSTRAINT chk_bundle_price CHECK (price_idr > 0),
  CONSTRAINT chk_bundle_active CHECK (is_active IN (0,1)),
  INDEX idx_token_bundle_active (is_active, deletedAt)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS token_purchases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id INT NOT NULL,
  token_bundle_id INT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('pending','paid','failed','cancelled','expired') NOT NULL DEFAULT 'pending',
  bundle_name_snapshot VARCHAR(100) NOT NULL,
  price_idr_snapshot DECIMAL(15,2) NOT NULL,
  token_quota_snapshot INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_purchase_order (order_id),
  UNIQUE KEY uq_token_purchase_owner_key (user_id, idempotency_key),
  INDEX idx_token_purchase_owner_date (user_id, createdAt),
  INDEX idx_token_purchase_bundle (token_bundle_id),
  CONSTRAINT fk_token_purchase_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_token_purchase_bundle FOREIGN KEY (token_bundle_id) REFERENCES token_bundles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_purchase_quota CHECK (token_quota_snapshot BETWEEN 1 AND 2147483647),
  CONSTRAINT chk_purchase_price CHECK (price_idr_snapshot > 0),
  CONSTRAINT chk_purchase_currency CHECK (currency = 'IDR')
) ENGINE=InnoDB;
