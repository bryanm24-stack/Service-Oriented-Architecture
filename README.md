# Asisten Keuangan — 30 endpoint

Proyek ini memiliki tepat **30 kombinasi method + path bisnis di /api/v1**. GET `/` adalah informasi server dan tidak dihitung. Parameter query ORM/raw serta request negatif bukan endpoint tambahan.

Pembagian: Users 9, Categories 6, Transactions 8 (termasuk nested kategori), Budgets 7. Semua modul menyediakan GET, POST, PUT, PATCH, DELETE.

## Instalasi

Gunakan Node.js 24 dan MySQL. Ekstrak sebagai folder proyek baru. Pasang dependensi dengan `npm ci`, salin `.env.example` menjadi `.env`, kemudian isi DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD. `.env` pribadi tidak disertakan.

```bash
npm ci
npm run db:migrate
npm start
```

Server menggunakan PORT pada .env (default 3001). SQL aktif hanya `sql/Gabungan.sql`, berisi users, categories, transactions, budget, budget_categories. Migrasi mengikuti DB_NAME dan tidak menghapus data lama. CREATE TABLE IF NOT EXISTS tidak mengubah struktur tabel lama yang berbeda. Tabel Buku yang sudah ada di MySQL tidak dihapus otomatis.

## Import Postman

Import kedua JSON dari folder postman:

1. Asisten-Keuangan-30-Endpoint.postman_collection.json
2. Asisten-Keuangan-Local.postman_environment.json

Pilih environment **Asisten Keuangan Local**, isi `baseUrl`, lalu jalankan semua 52 request secara berurutan pada Collection Runner. Semua request memakai `{{baseUrl}}` dan memiliki test. Tidak perlu mengisi ID secara manual: ID User, Category, Transaction, dan Budget disimpan dari POST lalu dipakai request berikutnya.

Runner membuat data dengan email/nama unik dan menghapus data percobaannya pada akhir. User dihapus secara soft delete. Request pertama menghapus variable ID lama dan menghentikan alur bila setup gagal. Gunakan database pengujian; request memang melakukan CRUD. Data di luar ID hasil POST tidak dijadikan target pembersihan.

Kasus gagal yang diuji: beberapa field invalid sekaligus (400), data hilang (404), method salah beserta Allow (405), email/periode ganda dan kategori masih terpakai (409), PUT tidak lengkap, serta isAdmin ditolak dan tidak tersimpan.

## Dua integrasi API

Endpoint konversi memakai EXCHANGE_RATE_API_KEY. Default environment Postman `conversionExpectedStatus=503` untuk kondisi API belum dikonfigurasi. Setelah key benar diisi pada .env, ubah menjadi `200` untuk menguji jalur sukses. Tidak ada key dalam collection.

Endpoint subscription-status dipertahankan dari versi sebelumnya. Order ID yang sama untuk semua user dan fallback key dummy telah dihapus. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_ORDER_IDS pada .env. MIDTRANS_ORDER_IDS adalah objek JSON berisi pemetaan ID user ke order milik user tersebut, misalnya `{"1":"ORDER-USER-1"}`. Ini konfigurasi prototipe; aplikasi produksi perlu tabel order dan verifikasi kepemilikan.

Default `subscriptionExpectedStatus=503` menguji user yang belum memiliki pemetaan order. Untuk jalur sukses, isi `midtransUserId` di environment dengan user yang memiliki order terkonfigurasi, lalu atur `subscriptionExpectedStatus=200`. Perekaman sukses provider nyata belum dilakukan dalam paket ini. Status 503 yang sesuai konfigurasi tidak dianggap bukti API sukses.

Server harus direstart setelah mengubah .env. Jangan mengubah expected status menjadi 502/500 hanya agar tes hijau; kegagalan tersebut perlu diperiksa.

## Kontrak endpoint tambahan

- PUT Category wajib mengirim `name` dan `icon` (icon boleh null).
- PUT Transaction wajib mengirim `id_user`, `id_category`, `nominal`, `catatan` (catatan boleh null). Referensi diperiksa dan penulisan memakai transaksi DB.
- PATCH Budget menerima `month`, `year`, dan/atau `budget_categories`; user_id tidak dapat diubah melalui PATCH. Jika daftar kategori dikirim, seluruh alokasi diganti. Jika tidak dikirim, alokasi lama tetap utuh. Perubahan atomik dan periode ganda ditolak 409.
- Summary Budget menghitung transaksi user pada bulan/tahun `transactions.createdAt`, hanya untuk kategori yang dialokasikan dalam Budget. Setiap nominal transaksi dianggap pengeluaran; belum ada jenis pemasukan. Nominal hasil dikembalikan sebagai string dua desimal dengan aritmetika BigInt. Tidak ada foreign key langsung Transaction ke Budget.
- Summary memakai dua SELECT (Budget/include + agregasi pengeluaran), bukan query per kategori. Endpoint daftar Budget tetap satu SELECT JOIN untuk bukti nomor 3.

## Pengujian dan bukti SQL

```bash
npm test
node scripts/bukti-budget-join.js
```

`npm test` menggunakan database simulasi, tanpa mengubah MySQL pengguna. 17 tes lulus. Koleksi 52 request juga dijalankan dengan Newman terhadap aplikasi Express asli dengan database simulasi: 128 assertion lulus. Ini belum membuktikan eksekusi pada MySQL atau provider API asli.

Perekam SQL memerlukan MySQL serta Budget berisi kategori. Ia menulis log nyata ke RANCANGAN.md hanya setelah pemeriksaan lolos. Runner Postman membersihkan Budget percobaannya, jadi data untuk bukti harus tersedia saat perekam dijalankan. Baca BUKTI-SQL-MULAI.md.

## Pembersihan

Buku, Karakter, Contoh, anime/Kitsu, webhook, schema validasi template, dan router template di src telah dihapus. Folder src/budget yang hanya berisi alias dihapus; implementasi aktif berada di models/controllers/routes. Koleksi Postman lama yang berulang diganti oleh satu koleksi aktif. SQL template serta migrate-budget.js yang menunjuk file SQL hilang juga dihapus.

Dokumentasi versi lama berada di arsip-dokumentasi dan bukan petunjuk menjalankan versi ini. Lihat PERUBAHAN-30-ENDPOINT.md untuk daftar perubahan. File ZIP unggahan asli tetap terpisah.

## Daftar seluruh endpoint

| No | Method | Path | Fungsi | Sukses | Gagal |
|---|---|---|---|---|---|
| 1 | GET | `/api/v1/users` | Daftar user aktif; pencarian, sort, pagination | 200 | 400, 404, 405, 503, 500 |
| 2 | POST | `/api/v1/users` | Buat user | 201 | 400, 404, 405, 409, 503, 500 |
| 3 | GET | `/api/v1/users/:id/transactions` | Transaksi milik user | 200 | 400, 404, 405, 503, 500 |
| 4 | GET | `/api/v1/users/:id/budgets` | Budget milik user | 200 | 400, 404, 405, 503, 500 |
| 5 | GET | `/api/v1/users/:id/subscription-status` | Status pembayaran Midtrans untuk order user | 200 | 400, 404, 405, 502, 503, 504, 500 |
| 6 | GET | `/api/v1/users/:id` | Detail user | 200 | 400, 404, 405, 503, 500 |
| 7 | PUT | `/api/v1/users/:id` | Ganti lengkap user | 200 | 400, 404, 405, 409, 503, 500 |
| 8 | PATCH | `/api/v1/users/:id` | Ubah sebagian user | 200 | 400, 404, 405, 409, 503, 500 |
| 9 | DELETE | `/api/v1/users/:id` | Soft delete user | 200 | 400, 404, 405, 409, 503, 500 |
| 10 | GET | `/api/v1/categories` | Daftar kategori | 200 | 400, 404, 405, 503, 500 |
| 11 | POST | `/api/v1/categories` | Buat kategori | 201 | 400, 404, 405, 409, 503, 500 |
| 12 | GET | `/api/v1/categories/:id` | Detail kategori | 200 | 400, 404, 405, 503, 500 |
| 13 | PUT | `/api/v1/categories/:id` | Ganti nama dan ikon kategori | 200 | 400, 404, 405, 409, 503, 500 |
| 14 | PATCH | `/api/v1/categories/:id` | Ubah sebagian kategori | 200 | 400, 404, 405, 409, 503, 500 |
| 15 | DELETE | `/api/v1/categories/:id` | Hapus kategori jika tidak dipakai | 204 | 400, 404, 405, 409, 503, 500 |
| 16 | GET | `/api/v1/transactions` | Daftar transaksi ORM/raw; filter, sort, pagination | 200 | 400, 404, 405, 503, 500 |
| 17 | POST | `/api/v1/transactions` | Buat transaksi | 201 | 400, 404, 405, 409, 503, 500 |
| 18 | GET | `/api/v1/transactions/:id/conversion` | Gabungkan transaksi dan kurs API | 200 | 400, 404, 405, 502, 503, 504, 500 |
| 19 | GET | `/api/v1/categories/:id/transactions` | Transaksi kategori | 200 | 400, 404, 405, 503, 500 |
| 20 | GET | `/api/v1/transactions/:id` | Detail transaksi dan relasi | 200 | 400, 404, 405, 503, 500 |
| 21 | PUT | `/api/v1/transactions/:id` | Ganti lengkap transaksi | 200 | 400, 404, 405, 409, 503, 500 |
| 22 | PATCH | `/api/v1/transactions/:id` | Ubah nominal/catatan | 200 | 400, 404, 405, 409, 503, 500 |
| 23 | DELETE | `/api/v1/transactions/:id` | Hapus transaksi | 200 | 400, 404, 405, 409, 503, 500 |
| 24 | GET | `/api/v1/budgets` | Daftar Budget dengan kategori/pivot | 200 | 400, 404, 405, 503, 500 |
| 25 | POST | `/api/v1/budgets` | Buat Budget dan alokasi | 201 | 400, 404, 405, 409, 503, 500 |
| 26 | GET | `/api/v1/budgets/:id/summary` | Ringkasan alokasi, pengeluaran, dan sisa | 200 | 400, 404, 405, 503, 500 |
| 27 | GET | `/api/v1/budgets/:id` | Detail Budget dan pivot | 200 | 400, 404, 405, 503, 500 |
| 28 | PUT | `/api/v1/budgets/:id` | Ganti lengkap Budget dan alokasi | 200 | 400, 404, 405, 409, 503, 500 |
| 29 | PATCH | `/api/v1/budgets/:id` | Ubah periode atau daftar alokasi | 200 | 400, 404, 405, 409, 503, 500 |
| 30 | DELETE | `/api/v1/budgets/:id` | Hapus Budget dan pivot | 204 | 400, 404, 405, 409, 503, 500 |
