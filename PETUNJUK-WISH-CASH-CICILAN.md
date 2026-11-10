# Pembaruan fitur Wish Cash/Cicilan

ZIP ini berisi **file proyek di dalam root repository** (tanpa folder pembungkus), sehingga dapat diekstrak langsung ke folder repository `Service-Oriented-Architecture`.

## Cara menerapkan ke repository lokal
1. Buat backup folder proyek atau commit/stash perubahan pekerjaan yang belum disimpan.
2. Di GitHub Desktop pilih `Repository > Show in Explorer`.
3. Ekstrak ZIP ini langsung ke folder repository yang terbuka. Jika Windows meminta konfirmasi, pilih Replace/Overwrite.
4. Jangan menghapus folder `.git`, file `.env`, `node_modules`, atau `laravel-web/vendor` milik proyek lokal. ZIP ini sengaja tidak membawa file-file tersebut.
5. Kembali ke GitHub Desktop > Changes. File backend, migrasi, controller, route, dan Blade yang berubah seharusnya tampil sebagai local changes.

## Menjalankan pembaruan
Backend:
```bash
npm install
npm run db:migrate
npm run dev
```

Laravel di terminal lain:
```bash
cd laravel-web
composer install
php artisan route:list --name=wishes
php artisan serve
```

Buka aplikasi dan pilih menu **Wish / Cicilan**.

## Alur fitur
- Cash: buat Wish dengan harga; klik `Bayar cash` untuk membuat transaksi pengeluaran dan menyimpan `paid_transaction_id`.
- Cicilan: masukkan harga, uang muka, lalu pilih salah satu tenor bulan atau tahun. Tenor tahun dikonversi ke bulan.
- Jadwal cicilan menyimpan snapshot nominal, periode, tanggal jatuh tempo, dan status.
- Tombol `Bayar` pada jadwal akan membuat transaksi pengeluaran serta menyimpan `transaction_id`.
- Wish menjadi `Paid` setelah seluruh jadwal dibayar.

## Pemeriksaan
Periksa `docs/SOA-20261108-06.md` untuk aturan bisnis dan daftar endpoint. Migrasi tambahan bersifat additive; jangan menjalankan reset database.
