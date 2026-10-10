# Menjalankan proyek hasil perbaikan

1. Ekstrak folder ini.
2. Salin `.env.example` menjadi `.env`, lalu isi koneksi MySQL dan API key.
3. Jalankan MySQL.
4. Jalankan perintah berikut dari folder yang memuat `package.json`:

```bash
npm ci
npm run db:migrate
npm test
npm start
```

Gunakan Node.js 24. SQL aktif hanya `sql/Gabungan.sql`. Jangan menjalankan seed materi lama yang mengandung TRUNCATE. Database baru pada `.env.example` adalah `soa_keuangan_fix`; migrasi tidak mengubah struktur tabel lama yang berbeda.

Endpoint transaksi: `/api/v1/transactions`.
Endpoint gabungan database dan API: `/api/v1/transactions/:id/conversion?currency=USD`.

Isi `EXCHANGE_RATE_API_KEY` untuk memakai konversi kurs. Tanpa key, CRUD tetap tersedia dan konversi memberi status 503.

Perbaikan mencakup Users, Categories, Transactions, validasi dan integrasi API nomor 4–5. Modul Budgets masih belum aktif. Matriks hak akses di `RANCANGAN.md` masih berupa rancangan; autentikasi/otorisasi belum diterapkan.

76 pemeriksaan HTTP dengan database simulasi telah lulus. MySQL nyata dan API dengan key asli belum diuji. Dokumen ini dan RANCANGAN.md menjadi acuan versi perbaikan; dokumen materi lama tetap disertakan sebagai referensi.
