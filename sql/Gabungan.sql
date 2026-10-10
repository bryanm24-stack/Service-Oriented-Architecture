-- DATABASE GABUNGAN
-- Sumber: schema.sql + seed.sql (sudah mencakup isi versi materi).
-- Jalankan pada database yang sama dengan DB_NAME di .env.
-- Pilih database tersebut sebelum mengimpor file ini.
-- Tabel yang sudah ada dan data lama tidak dihapus atau ditimpa.

-- ============================================================
-- 1. STRUKTUR TABEL
-- ============================================================

CREATE TABLE IF NOT EXISTS buku (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul         VARCHAR(150) NOT NULL,
  penulis       VARCHAR(100) NOT NULL,
  tahun_terbit  SMALLINT UNSIGNED NOT NULL,
  harga         INT UNSIGNED NOT NULL,
  stok          INT UNSIGNED NOT NULL DEFAULT 0,
  kategori      ENUM('novel', 'komik', 'non-fiksi', 'referensi') NOT NULL,

  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  deletedAt     DATETIME NULL DEFAULT NULL,

  UNIQUE KEY uq_buku_judul (judul)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS karakter (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buku_id   INT UNSIGNED NOT NULL,
  nama      VARCHAR(100) NOT NULL,
  peran     VARCHAR(50) NOT NULL,

  CONSTRAINT fk_karakter_buku
    FOREIGN KEY (buku_id) REFERENCES buku(id)
    ON DELETE CASCADE,

  INDEX idx_karakter_buku_id (buku_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS penulis (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  negara        VARCHAR(100) NOT NULL,
  tahun_lahir   SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
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
-- 2. DATA AWAL
-- ============================================================

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Jojo''s Bizarre Adventure', 'Hirohiko Araki', 1987, 120000, 8, 'komik'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Jojo''s Bizarre Adventure');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 1997, 95000, 15, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Harry Potter and the Philosopher''s Stone');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Laskar Pelangi', 'Andrea Hirata', 2005, 78000, 0, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Laskar Pelangi');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, 110000, 4, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Bumi Manusia');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Filosofi Teras', 'Henry Manampiring', 2018, 88000, 22, 'non-fiksi'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Filosofi Teras');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Jotaro Kujo', 'protagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Jotaro Kujo' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Dio Brando', 'antagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Dio Brando' AND k.peran = 'antagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Giorno Giovanna', 'protagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Giorno Giovanna' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Harry Potter', 'protagonis' FROM buku AS b
WHERE b.judul = 'Harry Potter and the Philosopher''s Stone'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Harry Potter' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Hermione Granger', 'protagonis' FROM buku AS b
WHERE b.judul = 'Harry Potter and the Philosopher''s Stone'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Hermione Granger' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Ikal', 'protagonis' FROM buku AS b
WHERE b.judul = 'Laskar Pelangi'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Ikal' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Minke', 'protagonis' FROM buku AS b
WHERE b.judul = 'Bumi Manusia'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Minke' AND k.peran = 'protagonis');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Hirohiko Araki', 'Jepang', 1960
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Hirohiko Araki');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'J.K. Rowling', 'Inggris', 1965
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'J.K. Rowling');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Andrea Hirata', 'Indonesia', 1967
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Andrea Hirata');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Pramoedya Ananta Toer', 'Indonesia', 1925
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Pramoedya Ananta Toer');

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
