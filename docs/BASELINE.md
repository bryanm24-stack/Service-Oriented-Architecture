# Baseline ProjectSOA M1

- Tanggal penyusunan: 30 Oktober 2026.
- Arsip sumber: Service-Oriented-Architecture.zip.
- SHA-256 arsip: `af390e04202150d428ea48bf43d2d3a9e4d8b5b9834579122c2895f814bddcfb`.
- Commit baseline: `8e6160b9d5bd8ea2de310a1bbd382a8aa6079895`.
- Tag baseline: `baseline/projectsoa-v1.0.0`.
- Branch kerja kontrak: `chore/m1-contract`, dari baseline yang sama.
- Repo lokal baru dibuat dari snapshot arsip. Riwayat .git bawaan tidak diimpor, untuk menghindari membawa histori/kredensial lama. Tidak ada push atau perubahan remote.
- Nama folder kerja dinormalisasi menjadi ProjectSOA; ini tidak mengganti nama tabel, model atau endpoint.

## Peta kode sumber existing

| Lapisan | File / fungsi aktif |
|---|---|
| Entry | index.js; index-budget.js hanya kompatibilitas entry |
| Routes | src/routes/index.js; userRoutes.js, category.js, transactionRoutes.js, budget.js |
| Controllers | UserController.js, category.js, transactionControllers.js, budget.js, budgetSummary.js, transactionConversion.js, service.js |
| Models | User.js, Category.js, Transaction.js, Budget.js, Budget_categories.js; relasi pada models/index.js |
| Services | exchangeRate.js, midtrans.js, upstream.js |
| Database | src/databases/connection.js; config/database.js adalah alias instance yang sama |
| SQL | sql/Gabungan.sql; scripts/migrate.js bootstrap tanpa pengosongan data |
| Validation / money | src/utils/validation/*, money.js (BigInt sen), password.js (scrypt) |
| Postman | Asisten-Keuangan-30-Endpoint.postman_collection.json dan Asisten-Keuangan-Local.postman_environment.json |
| Regression | tests/*.test.js, memakai database/provider simulasi |

## Pembersihan baseline yang sengaja dilakukan

Arsip .env, .git, dependency build dan metadata OS tidak ikut commit atau paket.
.env.example hanya konfigurasi contoh; nilai API key/password dikosongkan dan mapping order menjadi objek kosong.
.gitignore melindungi environment, key/private certificate dan hasil build.
Satu fixture tes Midtrans disesuaikan: mode sandbox memakai awalan sandbox dengan nilai nol sintetis. Ini memperbaiki data uji, tidak mengubah service pembayaran atau memanggil provider.
Fixture tes lain adalah data sintetis untuk adapter, bukan kredensial operasional.

## Batas verifikasi

M1 memeriksa 30 pasangan route, cakupan koleksi, N:M dan kesamaan kode bisnis terhadap baseline; tidak menjalankan migrasi ke MySQL pengguna.
JWT/login/checkout/wallet/AI/recurring/PDF/bank tetap rancangan. Adapter status Midtrans dan kurs yang sudah ada dipertahankan.
Hasil regression terkini ada di [VERIFIKASI_M1.md](VERIFIKASI_M1.md); hasil lama di README arsip bukan hasil eksekusi baru.
Dokumen arsip di [legacy](legacy/README-awal.md) hanya untuk penelusuran. Beberapa tautan dalam dokumen lama menunjuk berkas yang memang tidak ada pada arsip unggahan.
