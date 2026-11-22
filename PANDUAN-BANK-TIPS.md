# Menjalankan pembaruan Bank dan Tips Gratis

Gunakan folder proyek dari ZIP ini. Database lama tidak direset. Simpan .env milik Anda dan salin ke js/.env serta laravel/.env pada folder hasil ekstrak; ZIP tidak berisi secret. Gunakan database Node yang sama dengan sebelumnya. Jangan menyalin contoh kosong di atas .env yang sudah terisi.

Terminal backend, MySQL/Laragon aktif:
```powershell
cd js
npm ci
npm run db:migrate
npm test
npm start
```
Jika instalasi benar-benar baru, salin js/.env.example menjadi .env dan isi DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD terlebih dahulu; jalankan `npm run auth:keys` sebelum login. Terminal Laravel:
```powershell
cd laravel
composer install
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
```
Untuk instalasi baru salin laravel/.env.example dan jalankan php artisan key:generate. SOA_API_BASE_URL harus http://127.0.0.1:3001/api/v1. Tidak perlu artisan migrate untuk tabel bisnis. PHP >=8.3, Node 24. Jika tampilan lama, reload service worker/cache situs sekali.

## Demo Bank

1. Login di http://127.0.0.1:8000 lalu buka Bank / Impor mutasi atau /app/bank.
2. Simpan alias rekening dan empat digit terakhir. Ini rekening impor, bukan koneksi bank.
3. Pilih rekening/kategori, JSON, dan DATA SINTETIS. Contoh sudah tersedia; tekan Buat preview. Dua baris menunjukkan kredit 5.000.000 dan debit 150.000. Tidak ada transaksi dibentuk dari preview sintetis.
4. Untuk pencatatan riil, normalisasikan mutasi milik sendiri sesuai header/field pada docs/examples, pilih jenis Mutasi milik saya, buat preview, periksa lalu Konfirmasi. Jangan menandai contoh sintetis sebagai data riil di database pribadi.
5. Ulangi preview mutasi yang sama memakai rekening impor yang sama: referensi akan ditandai duplicate. Konfirmasi ulang batch tidak menggandakan transaksi. Jangan membuat referensi/connection baru untuk baris lama.
6. Tidak ada saldo bank terverifikasi. Client ID BCA tidak dibutuhkan untuk jalur ini. Panduan akses resmi bisa dilanjutkan terpisah.

## Demo Tips Gratis

Buka /app/tips. Periode mengikuti Jakarta. Tambahkan pemasukan lewat tautan Tambah pemasukan, tagihan rutin lewat Berulang, cicilan lewat Wish. Periksa dan centang konfirmasi kelengkapan bila benar lengkap. Isikan sisa target cadangan, tujuan/modal, horizon dan risiko bila diketahui; klik Perbarui tips gratis. Tanpa konfirmasi akan muncul Data belum lengkap. Angka proyeksi bukan saldo bank/kas. Komitmen berreferensi transaksi tidak dikurangi lagi.

Contoh hitung sintetis ada di docs/SOA-20261122-BANK-TIPS.md dan docs/examples/recommendations-synthetic.json. Katalog token dan analisis AI tidak perlu dipanggil untuk fitur tips.

## Pemeriksaan tambahan lokal

`npm test` menjalankan semua file tests/*.test.js; hasil aktual pengerjaan dicatat di docs/verification-bank-tips.json. Tes controller lama memakai fixture admin agar tetap menguji logika bisnis. Tes JWT baru memakai middleware produksi dengan database stub, terpisah dari fixture tersebut. Tidak ada bypass autentikasi pada aplikasi produksi.

`npm run test:mysql` memerlukan MySQL dan izin membuat/menghapus database soa_test_*. Jangan arahkan ke database produksi. Suite membuat database uji unik. `php artisan test` menguji frontend; beberapa ekspektasi katalog dari milestone lama sudah diperbarui pada paket ini. Tes/browser nyata tetap harus dijalankan di komputer yang mempunyai PHP/MySQL; hasil yang belum dijalankan tidak dianggap lulus.
