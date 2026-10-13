# Perubahan dari versi (7)

23 endpoint keuangan yang sudah terdaftar dipertahankan. Tujuh endpoint baru:

- GET /api/v1/users/:id/transactions
- GET /api/v1/users/:id/budgets
- PUT /api/v1/categories/:id
- GET /api/v1/transactions/:id
- PUT /api/v1/transactions/:id
- PATCH /api/v1/budgets/:id
- GET /api/v1/budgets/:id/summary

Tidak ada endpoint contoh yang dihitung dalam total 30. GET / hanya metadata server. Semua method yang tidak terdaftar ditangani 405 pada URL yang ada.

Koleksi aktif baru berisi 52 request karena memuat pengulangan untuk kasus negatif dan verifikasi. Jumlah request berbeda dari jumlah endpoint. Jumlah 30 diverifikasi dari router Express aktual dan cakupannya diperiksa terhadap koleksi.

Midtrans kini membutuhkan key dan pemetaan order per user pada environment; fallback order tetap dari template dihapus.

SQL hanya memuat lima tabel domain keuangan. File SQL template di folder proyek dihapus; tidak ada DROP pada database pengguna. Kontrak transaksi lama tetap tersedia, termasuk mode ORM/raw dan konversi kurs. Perekam SQL otomatis disertakan; harus dijalankan pada MySQL untuk menghasilkan bukti nyata.

## Dihapus dari salinan proyek

- src/controllers/buku.js
- src/controllers/contoh.js
- src/controllers/contohAxios.js
- src/routes/buku.js
- src/routes/contoh.js
- src/routes/contohAxios.js
- src/models/Buku.js
- src/models/Karakter.js
- src/utils/notifikasi.js
- src/utils/validation/bukuSchema.js
- src/utils/validation/userSchema.js
- src/utils/validation/validateJoi.js
- src/budget/
- scripts/migrate-budget.js

Koleksi Postman lama diganti satu koleksi aktif. Dokumentasi lama dipindahkan ke arsip-dokumentasi. Upload versi (7) asli tidak diubah. node_modules, metadata repository, dan .env pribadi tidak disertakan di ZIP.

## Verifikasi

17 tes kode lulus. Newman: 52 request dan 128 assertion lulus, 0 gagal, menggunakan database simulasi. Semua endpoint baru diuji pada aplikasi utama. MySQL/provider nyata belum diuji. Tidak ada data pada database pengguna yang dibuat, diperbarui, atau dihapus saat penyusunan paket.
