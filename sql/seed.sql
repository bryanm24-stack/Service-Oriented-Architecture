-- DATA AWAL GABUNGAN. Hanya tambah record yang belum ada.
-- Tidak ada DROP, TRUNCATE, DELETE, REPLACE, atau UPDATE.
-- Jalankan melalui npm run db:migrate.

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
SELECT 'Kenneth', 'kenneth@istts.edu', 'Password123!'
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
