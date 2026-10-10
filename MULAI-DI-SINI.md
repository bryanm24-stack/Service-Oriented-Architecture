# Proyek terintegrasi: Transactions dan Budget

Budget sudah terhubung ke aplikasi utama. Gunakan `npm start`; Users, Categories, Transactions, Budget, dan endpoint materi berjalan pada server yang sama.

## Jalankan dari folder Service-Oriented-Architecture

Gunakan Node.js 24 sesuai package.json. Salin konfigurasi `.env` Anda ke folder proyek, atau buat dari `.env.example`. Isi koneksi MySQL dan pastikan `DB_NAME=asisten_keuangan`.

```bash
npm ci
npm run db:migrate
npm start
```

Port default 3001, mengikuti PORT pada .env. Hentikan server sebelumnya jika memakai port yang sama. Tidak ada kredensial .env pengguna dalam ZIP ini.

## SQL gabungan

**Gunakan satu file: `sql/Gabungan.sql`.** File ini memuat database, delapan tabel, foreign key, indeks unik, dan seed lama yang belum tersedia. Urutannya mencakup Buku, Karakter, Penulis, Users, Categories, Transactions, Budget, dan Budget Categories.

- Impor manual melalui phpMyAdmin/MySQL membuat dan memilih `asisten_keuangan`.
- `npm run db:migrate` membuat dan memilih database dari DB_NAME. Blok pemilihan database untuk impor manual dilewati agar tidak menimpa pilihan .env.
- CREATE TABLE IF NOT EXISTS menjaga tabel yang sudah ada. Seed memakai NOT EXISTS agar data yang sudah ditemukan tidak ditimpa.
- Tidak ada DROP, TRUNCATE, DELETE, UPDATE, atau ALTER dalam SQL aktif.
- CREATE TABLE IF NOT EXISTS tidak memperbaiki struktur tabel lama yang berbeda. Struktur tabel harus sesuai dengan definisi pada Gabungan.sql.

Tidak perlu mengimpor Budget-Tambahan.sql atau schema/seed lama setelah Gabungan.sql. File SQL lama tetap tersimpan sebagai referensi; beberapa seed materi lama menggunakan TRUNCATE dan bukan jalur instalasi paket ini.

## Budget

| Method | Endpoint | Hasil |
|---|---|---|
| POST | /api/v1/budgets | Buat Budget dan alokasi kategori, 201 |
| GET | /api/v1/budgets | Daftar beserta kategori/pivot, 200 |
| GET | /api/v1/budgets/:id | Detail, 200 |
| PUT | /api/v1/budgets/:id | Ganti lengkap Budget dan alokasi, 200 |
| DELETE | /api/v1/budgets/:id | Hapus Budget yang dituju beserta alokasinya, 204 |

GET daftar mendukung filter opsional `?user_id=1`. POST dan PUT menggunakan bentuk body berikut; ID harus tersedia pada database:

```json
{
    "user_id": 1,
    "month": 10,
    "year": 2026,
    "budget_categories": [
        {
            "category_id": 1,
            "allocated_amount": "500000.00"
        }
    ]
}
```

PUT wajib lengkap dan mengganti daftar alokasi. Periode user/month/year duplikat menghasilkan 409. Input salah 400; ID atau referensi tidak tersedia 404. Month 1–12, year 2000–2100, 1–100 kategori tanpa duplikat. Nilai allocated_amount lebih dari nol, maksimal 99999999.99 dengan dua angka desimal.

Respons daftar/detail menyertakan `categories[].Budget_categories.allocated_amount`. Relasi Budget–Category N:M, melalui pivot Budget_categories. Budget juga belongsTo User. Modul ini belum menghitung sisa Budget dari Transactions secara otomatis.

## File aktif

| Bagian | Lokasi |
|---|---|
| Aplikasi utama | index.js |
| Registrasi router | src/routes/index.js |
| Router Budget | src/routes/budget.js |
| Controller Budget | src/controllers/budget.js |
| Model Budget | src/models/Budget.js |
| Model pivot | src/models/Budget_categories.js |
| Registrasi model dan relasi | src/models/index.js |
| Joi dan pesan Budget | src/utils/validation/budgetSchemas.js |
| SQL lengkap | sql/Gabungan.sql |

src/budget/* sekarang hanya meneruskan impor ke implementasi utama. index-budget.js memakai aplikasi utama yang sama untuk kompatibilitas perintah lama. Tidak ada dua model/router Budget aktif.

## Postman dan tes

Import `postman/Budgets-Terhubung.postman_collection.json` untuk Budget atau koleksi Transactions sebelumnya untuk transaksi. Isi base_url, user_id, category_id, month, year. Koleksi Budget membuat lalu menghapus Budget percobaan sendiri; gunakan periode yang belum dipakai. Jika POST pertama gagal, Runner dihentikan.

```bash
npm test
```

Tes HTTP memakai database simulasi. Tes SQL memeriksa delapan definisi tabel dan pemilihan DB_NAME pada migrasi tanpa koneksi MySQL. Belum ada pengujian pada MySQL pengguna.

Untuk bukti satu SELECT JOIN pada database nyata yang sudah dikonfigurasi:

```bash
node scripts/bukti-budget-join.js
```

Skrip melakukan GET daftar dan membuat `BUKTI-BUDGET-JOIN-<waktu>.md` berisi SQL yang benar-benar dieksekusi. Bukti aktual belum tersedia sampai skrip berhasil dijalankan. Hasilnya dapat menjadi lampiran RANCANGAN.md.

## Cadangan

Semua file dari paket sebelumnya tetap tersedia. File yang disesuaikan memiliki salinan byte asli pada `backup-sebelum-penggabungan/` dengan struktur path yang sama. Cadangan tidak dipakai oleh aplikasi. Lihat HASIL-PENGGABUNGAN.md untuk daftar perubahan dan hasil verifikasi.
