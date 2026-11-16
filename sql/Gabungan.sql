-- DATABASE ASISTEN KEUANGAN
-- Lima tabel keuangan: users, categories, transactions, budget, budget_categories.
-- Merge menambahkan api_tiers, api_clients dan api_log; belum ada endpoint API key.
-- Seluruh struktur aktif, termasuk token, wish, recurring, dan payment, berada di file ini.
-- Tidak menyertakan tabel dan seed template buku, karakter, atau penulis.
-- CREATE TABLE IF NOT EXISTS tidak mengubah struktur tabel yang sudah ada.
-- Impor manual memakai asisten_keuangan; npm run db:migrate mengikuti DB_NAME.
-- Data lama tidak dihapus atau ditimpa. Seed ditambah hanya jika belum tersedia.
-- Tabel template yang sudah ada di server tidak dihapus oleh skrip ini.

-- BEGIN DATABASE SELECTION
CREATE DATABASE IF NOT EXISTS `asisten_keuangan` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `asisten_keuangan`;
-- END DATABASE SELECTION

-- ============================================================
-- 1. STRUKTUR TABEL ASISTEN KEUANGAN
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    icon VARCHAR(255) NULL,

    createdAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updatedAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id_transaction INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_category INT UNSIGNED NOT NULL,
  id_user INT NOT NULL,
  type ENUM('income','expense') NOT NULL DEFAULT 'expense',
  nominal DECIMAL(15, 2) NOT NULL,
  catatan TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_category FOREIGN KEY (id_category)
    REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_user FOREIGN KEY (id_user)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_transactions_category (id_category),
  INDEX idx_transactions_user (id_user),
  INDEX idx_transactions_nominal (nominal)
) ENGINE=InnoDB;

-- ============================================================
-- TABEL BUDGET DAN PIVOT (modul Rafael aktif)
-- user_id memakai INT signed, sama dengan users.id.
-- Model Budget aktif sudah memakai tipe FK yang sama dengan tabel users.
-- ============================================================

CREATE TABLE IF NOT EXISTS budget (
    budget_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    month INT UNSIGNED NOT NULL,
    year INT UNSIGNED NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_user_period (user_id, month, year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(10, 2) NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_categories_budget
        FOREIGN KEY (budget_id) REFERENCES budget(budget_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_budget_categories_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_category (budget_id, category_id),
    INDEX idx_budget_categories_category (category_id)
) ENGINE=InnoDB;

-- ============================================================
-- MODEL API KEY DARI OCTAVIUS (additive, tanpa reset tabel lama)
-- users.id bertipe signed; FK API client wajib mengikuti tipe tersebut.
-- Belum ada seed paket/harga atau endpoint penerbitan/rate limit API key.
-- ============================================================

CREATE TABLE IF NOT EXISTS api_tiers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rate_limit INT UNSIGNED NOT NULL,
  window_seconds INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_clients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  api_tier_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  revoked_at DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_clients_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_api_clients_tier FOREIGN KEY (api_tier_id)
    REFERENCES api_tiers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_user_api_tier_name (user_id, api_tier_id, name),
  INDEX idx_api_clients_tier (api_tier_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  api_client_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  status_code INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_log_client FOREIGN KEY (api_client_id)
    REFERENCES api_clients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_api_log_client_created (api_client_id, created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 2. DATA AWAL USER DAN KATEGORI
-- ============================================================

INSERT INTO users (name, email, password)
SELECT 'Kenneth', 'kenneth@istts.edu', 'scrypt$11223344556677889900aabbccddeeff$e6eecf435dcb2ba3b9c5938582bf995eed54ce59125f87fde483ccc69b8e6b02d2ad43084134e8011a25fc80ca29d1b6d41084e3491d6cafc666c023efd63a80'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kenneth@istts.edu');

INSERT INTO categories (name, icon)
SELECT 'Makanan', 'food'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Makanan');

INSERT INTO categories (name, icon)
SELECT 'Transportasi', 'transport'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportasi');

INSERT INTO categories (name, icon)
SELECT 'Hiburan', 'entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hiburan');

-- Sesi W7: refresh token disimpan sebagai hash, bukan token mentah.
CREATE TABLE IF NOT EXISTS auth_sessions (
 id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, token_hash VARCHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME NOT NULL, revoked_at DATETIME NULL,
 createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 INDEX idx_auth_session_user(user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. TOKEN, WISH, RECURRING, DAN PAYMENT
-- ============================================================

-- SOA-20261106-05: additive only; no reset or automatic demo seeding.

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
  status ENUM('pending','paid','failed','cancelled','expired','needs_review') NOT NULL DEFAULT 'pending',
  bundle_name_snapshot VARCHAR(100) NOT NULL,
  price_idr_snapshot DECIMAL(15,2) NOT NULL,
  token_quota_snapshot INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  provider_transaction_id VARCHAR(255) NULL,
  provider_transaction_status VARCHAR(32) NULL,
  provider_fraud_status VARCHAR(32) NULL,
  provider_response JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_purchase_order (order_id),
  UNIQUE KEY uq_token_purchase_owner_key (user_id, idempotency_key),
  INDEX idx_token_purchase_owner_date (user_id, createdAt),
  INDEX idx_token_purchase_bundle (token_bundle_id),
  INDEX idx_token_purchase_provider_transaction (provider_transaction_id),
  CONSTRAINT fk_token_purchase_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_token_purchase_bundle FOREIGN KEY (token_bundle_id) REFERENCES token_bundles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_purchase_quota CHECK (token_quota_snapshot BETWEEN 1 AND 2147483647),
  CONSTRAINT chk_purchase_price CHECK (price_idr_snapshot > 0),
  CONSTRAINT chk_purchase_currency CHECK (currency = 'IDR')
) ENGINE=InnoDB;

-- SOA-20261108-06: wish cash/cicilan dan jadwal pembayaran.
CREATE TABLE IF NOT EXISTS wishes (
  id_wish INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  payment_method ENUM('cash','installment') NOT NULL,
  down_payment DECIMAL(15,2) NOT NULL DEFAULT 0,
  tenor_months INT UNSIGNED NULL,
  installment_amount DECIMAL(15,2) NULL,
  status ENUM('planned','paid') NOT NULL DEFAULT 'planned',
  paid_transaction_id INT UNSIGNED NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_wishes_paid_transaction FOREIGN KEY (paid_transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_wishes_price CHECK (price > 0),
  CONSTRAINT chk_wishes_down_payment CHECK (down_payment >= 0 AND down_payment <= price),
  CONSTRAINT chk_wishes_tenor CHECK ((payment_method='cash' AND tenor_months IS NULL AND down_payment=0) OR (payment_method='installment' AND tenor_months BETWEEN 1 AND 120)),
  INDEX idx_wishes_user_status (user_id, status, createdAt)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS installment_schedules (
  id_installment INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wish_id INT UNSIGNED NOT NULL,
  period_number INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount_snapshot DECIMAL(15,2) NOT NULL,
  status ENUM('planned','paid') NOT NULL DEFAULT 'planned',
  transaction_id INT UNSIGNED NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_installment_wish FOREIGN KEY (wish_id) REFERENCES wishes(id_wish) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_installment_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_installment_amount CHECK (amount_snapshot > 0),
  UNIQUE KEY uq_installment_period (wish_id, period_number),
  INDEX idx_installment_due_status (wish_id, status, due_date)
) ENGINE=InnoDB;

-- SOA-20261111-08: recurring templates and immutable occurrence snapshots.
CREATE TABLE IF NOT EXISTS recurring_costs (
  id_recurring_cost INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  `interval` ENUM('monthly','yearly') NOT NULL,
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL,
  status ENUM('active','paused') NOT NULL DEFAULT 'active',
  end_date DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  CONSTRAINT fk_recurring_cost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recurring_cost_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_recurring_cost_owner_status (user_id, status, next_due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recurring_occurrences (
  id_occurrence INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recurring_cost_id INT UNSIGNED NOT NULL,
  scheduled_for DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_snapshot DECIMAL(15,2) NOT NULL,
  status ENUM('planned','paid','locked') NOT NULL DEFAULT 'planned',
  transaction_id INT UNSIGNED NULL,
  locked_at DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recurring_occurrence_cost FOREIGN KEY (recurring_cost_id) REFERENCES recurring_costs(id_recurring_cost) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recurring_occurrence_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_recurring_occurrence_schedule (recurring_cost_id, scheduled_for),
  INDEX idx_recurring_occurrence_status_date (recurring_cost_id, status, due_date)
) ENGINE=InnoDB;

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
