-- ============================================================
-- SKEMA DATABASE — SOA MINGGU 6
-- ============================================================
--
-- Bandingkan file ini dengan sql/schema.sql versi Minggu 3.
-- Tabelnya SAMA — ORM tidak mengganti skema, dia MEMETAKAN skema yang
-- sudah ada. Yang ditambah hanya tiga kolom tanggal di `buku`:
--
--   createdAt  — kapan baris dibuat        (otomatis oleh Sequelize)
--   updatedAt  — kapan terakhir diubah     (otomatis oleh Sequelize)
--   deletedAt  — kapan dihapus (soft delete) — dipakai di Latihan 5,
--                saat kalian menyalakan `paranoid: true`.
--
-- Jalankan file ini via `npm run db:migrate` (scripts/migrate.js).

CREATE TABLE IF NOT EXISTS buku (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul         VARCHAR(150) NOT NULL,
  penulis       VARCHAR(100) NOT NULL,
  tahun_terbit  SMALLINT UNSIGNED NOT NULL,
  harga         INT UNSIGNED NOT NULL,
  stok          INT UNSIGNED NOT NULL DEFAULT 0,
  kategori      ENUM('novel', 'komik', 'non-fiksi', 'referensi') NOT NULL,

  -- Tiga kolom timestamps. Di model (src/models/Buku.js) mereka dipetakan
  -- otomatis karena `timestamps: true` — Sequelize mengisi nilainya
  -- sendiri; controller dan validasi TIDAK menyentuh mereka.
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  deletedAt     DATETIME NULL DEFAULT NULL,

  -- UNIQUE di sini masih jaring pengaman kedua untuk "judul tidak boleh
  -- kembar" — tidak berubah dari Minggu 3. Lapis pertama tetap cek di
  -- controller, lapis ketiga baru muncul minggu ini: `unique: true` di
  -- definisi model. Tiga lapis, tiga tempat, satu aturan.
  UNIQUE KEY uq_buku_judul (judul)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS karakter (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buku_id   INT UNSIGNED NOT NULL,
  nama      VARCHAR(100) NOT NULL,
  peran     VARCHAR(50) NOT NULL,

  -- Sama seperti Minggu 3: penghapusan berantai adalah pekerjaan MySQL.
  -- Di model, relasi ini dinyatakan sebagai hasMany — baca
  -- src/models/Buku.js bagian `static associate`.
  CONSTRAINT fk_karakter_buku
    FOREIGN KEY (buku_id) REFERENCES buku(id)
    ON DELETE CASCADE,

  INDEX idx_karakter_buku_id (buku_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabel untuk LATIHAN 6 (migrasi resource `penulis` ke ORM).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS penulis (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  negara        VARCHAR(100) NOT NULL,
  tahun_lahir   SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;
