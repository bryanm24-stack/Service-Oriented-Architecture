# ProjectSOA — Node.js API + Laravel mobile PWA

Aplikasi web ada di `laravel-web/`: Laravel 13 + Blade, CSS/JavaScript lokal, tampilan responsif dan PWA. Backend Node.js/Express di folder utama tetap mengelola 30 endpoint dan MySQL. Laravel tidak mempunyai tabel bisnis atau akun kedua; data diambil melalui HTTP client server ke server.

**Login/register belum dibuat atau diaktifkan. Bagian tampilan dan alur login/register diserahkan ke Dana.** Aplikasi web saat ini hanya untuk akun uji pada APP_ENV=local/testing; akses produksi ditolak sampai autentikasi dan ownership backend diselesaikan.

## Menjalankan di Windows / Laragon

Diperlukan Node.js 24, PHP 8.3 atau lebih baru yang kompatibel dengan Composer lock, Composer, serta MySQL untuk data nyata. Ekstensi PHP standar Laravel harus aktif, termasuk mbstring, openssl, fileinfo, ctype, tokenizer, dom/xml dan curl. Tidak ada NPM build untuk halaman Blade; aset web disediakan lokal di public/assets.

Terminal 1, di folder utama repository:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Periksa DB_NAME dan kredensial MySQL pada .env milik Node. Gunakan database/akun uji. Jika database belum siap, simpan backup terlebih dahulu bila berisi data penting, lalu jalankan:

```powershell
npm run db:migrate
npm run dev
```

Node mendengarkan pada 127.0.0.1:3001 secara default. Bootstrap tidak reset data; jangan mengganti .env yang sudah dikonfigurasi dengan template secara sembarang.

Terminal 2, dari folder utama repository:

```powershell
cd laravel-web
composer install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8000
```

Key generate dijalankan sekali saat menyiapkan aplikasi Laravel baru. Buka http://127.0.0.1:8000. Tidak perlu menjalankan php artisan migrate/db:seed pada Laravel: MySQL dan skema bisnis tetap dimiliki Node.

Konfigurasi Laravel lokal yang perlu diperiksa:

```dotenv
SOA_API_BASE_URL=http://127.0.0.1:3001/api/v1
SOA_LOCAL_PREVIEW=true
SOA_LOCAL_USER_ID=1
```

ID di atas harus menunjuk user uji yang benar-benar ada pada database Node. Ganti melalui konfigurasi server, bukan melalui form/browser. Kredensial MySQL dan provider hanya berada di .env backend Node. Jika Node/MySQL tidak tersedia, halaman menampilkan kegagalan koneksi; tidak mengganti data nyata dengan angka contoh.

## Halaman dan fungsi yang tersedia

| Halaman | Fungsi | API Node |
|---|---|---|
| / | Ringkasan pengeluaran per bulan, kategori, anggaran dan catatan terbaru | /users/:id/transactions, /users/:id/budgets, /budgets/:id/summary |
| /pengeluaran | Pencarian literal, filter kategori/periode, pagination | /users/:id/transactions, /categories |
| /pengeluaran/tambah | Form simpan pengeluaran | POST /transactions |
| /pengeluaran/:id/edit | Edit nominal/catatan; kategori dipertahankan sesuai kontrak PATCH lama | GET/PATCH /transactions/:id |
| Hapus dari daftar | Konfirmasi dahulu, lalu hapus | GET/DELETE /transactions/:id |
| /anggaran dan /anggaran/:id | Daftar dan rincian alokasi/pemakaian | /users/:id/budgets, /budgets/:id/summary |
| /kategori | Daftar kategori bersama, baca saja | /categories |
| /aplikasi | Pemasangan PWA dan penjelasan offline | Tanpa request data bisnis |

Semua endpoint Node pada tabel memakai prefix /api/v1. Dashboard menghitung semua halaman transaksi akun uji, bukan hanya 100 baris pertama. Batas pengambilan 10.000 baris; jika terlampaui, ringkasan ditolak dengan pesan yang jelas, bukan ditampilkan sebagai total lengkap. Nominal dihitung sebagai integer sen dan diformat menjadi string rupiah; total yang melampaui batas integer ditolak. Periode UI menggunakan Asia/Jakarta dan timestamp pencatatan existing, bukan tanggal bisnis baru.

Pembuatan/edit anggaran dan pengelolaan kategori tetap melalui API/Postman existing. Fitur pemasukan, wallet, pembayaran, AI, wish dan recurring belum diimplementasikan oleh pekerjaan PWA ini. Tidak ada halaman atau route login/register baru.

## PWA dan pengujian di HP

Manifest ada di public/manifest.webmanifest, worker di public/sw.js, ikon lokal tersedia dalam ukuran 192/512 dan maskable. Tombol Pasang aplikasi ada di /aplikasi. Browser yang mendukung akan menawarkan pemasangan; Safari memakai Bagikan → Tambah ke Layar Utama. Kemunculan prompt mengikuti dukungan/kebijakan browser.

Service worker hanya menyimpan CSS, JavaScript, ikon dan offline.html. HTML berisi data keuangan, respons API, session/token dan request POST/PATCH/DELETE tidak masuk cache. Tidak ada antrean penyimpanan offline atau pengiriman ulang otomatis. Ketika offline, navigasi menampilkan petunjuk koneksi.

Untuk mencoba tampilan di HP pada LAN tepercaya dengan akun uji saja:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

Buka alamat IP komputer pada port 8000 dari HP. Node tetap di loopback dan hanya dipanggil Laravel. HTTP pada IP LAN dapat dipakai melihat tampilan, tetapi pemasangan/service worker membutuhkan HTTPS; localhost/loopback mendapat pengecualian di perangkat pengembangan. Gunakan HTTPS development yang dipercaya perangkat untuk menguji instalasi dari HP. Jangan mengekspos mode akun uji ke internet.

Untuk pembaruan aset, naikkan versi nama app.v1.css/app.v1.js serta CACHE_NAME/daftar STATIC_ASSETS pada sw.js. Worker hanya menghapus cache bernama projectsoa-pwa-shell miliknya sendiri.

## Perlindungan input dan SQL injection

- Raw SQL memakai bind parameters Sequelize yang diteruskan terpisah ke execute MySQL. Nilai input tidak digabung menjadi sintaks SQL.
- Nama kolom/sort dibatasi validasi dan pilihan tetap di kode; ID, batas pagination dan nominal divalidasi. Tidak ada blacklist kata PATCH/SELECT yang merusak nama sah.
- Field pengguna existing adalah name dan email. Nama seperti `..PATCH.. O'Connor` tetap data teks. HTTP method ditentukan routing, bukan isi nama.
- Laravel mengambil base URL API hanya dari konfigurasi server, tidak menyediakan proxy URL bebas, tidak mengikuti redirect upstream, dan tidak retry otomatis operasi tulis.
- Form memakai CSRF, validasi server dan pemilik dari konteks server. Update/hapus memeriksa pemilik resource terlebih dahulu. Ini batas untuk preview lokal, bukan pengganti JWT backend.
- Blade meng-escape teks; CSP, no-store/private, nosniff dan kebijakan referrer diterapkan. Tidak ada pembacaan data keuangan langsung dari database Laravel.

Binding tidak menggantikan autentikasi/otorisasi. Endpoint Node existing masih belum dilindungi JWT secara menyeluruh. Gunakan user DB runtime dengan hak minimum, jangan akun admin DB untuk deployment. Keamanan produksi harus diperiksa lagi setelah Dana dan PIC backend menyelesaikan autentikasi.

## Handoff untuk Dana

1. Implementasikan halaman login/register di laravel-web menggunakan layout/komponen/gaya bersama. Tidak perlu membuat tabel users Laravel kedua.
2. Koordinasikan endpoint autentikasi Node dan middleware ownership dengan PIC backend. Draft auth sumber masih belum diaktifkan dan format verifikasi passwordnya perlu dicocokkan dengan hash existing `scrypt$salt$hash`.
3. Ganti PreviewUserContext dengan identitas terverifikasi. Field owner tidak boleh diambil dari input/browser. Jika memakai JWT dengan gateway Laravel, token dapat dikelola di sesi server; jangan memasukkan key provider ke frontend.
4. Lengkapi refresh/logout serta penanganan 401/403 sebelum mengganti pembatas EnsureLocalPreview. Jangan hanya mematikan pembatas tersebut untuk membuat production bisa dibuka.
5. Pertahankan CSRF, escaping, no-store dan kebijakan worker yang tidak menyimpan data pribadi.

## Pengujian

```powershell
npm test
cd laravel-web
php artisan test
```

Hasil pekerjaan ini: 28 tes Node lulus, 16 tes Laravel lulus. Browser Chromium memeriksa 7 halaman pada lebar 320/375/820/1440, alur tambah/edit/batal hapus/hapus melalui Laravel ke Node, penolakan CSRF tanpa token, teks SQL-like/XSS sebagai data, cache aset statis dan fallback offline. DB/provider pengujian memakai simulasi; MySQL dan provider pembayaran nyata belum diuji. Tangkapan layar QA tidak disertakan dalam paket.

## Memasukkan perubahan ke repository Git yang sudah ada

Paket menyediakan changes.bundle di luar folder snapshot. Bundle incremental berangkat dari commit sumber `dd3d182` dan hanya dapat dipakai pada repo yang memiliki sejarah sumber tersebut. Pertahankan .git milik repository kamu.
Jika folder ProjectSOA_Laravel_PWA hasil ekstrak diletakkan sejajar folder repo:

```powershell
git fetch "../ProjectSOA_Laravel_PWA/changes.bundle" feat/laravel-mobile-pwa:feat/laravel-mobile-pwa
git switch feat/laravel-mobile-pwa
```

Tinjau branch tersebut sebelum menggabungkannya ke branch kerja tim. Tidak ada push remote dari pekerjaan ini. Server Key yang terisi pada .env.example sumber telah dikosongkan. Bundle hanya membawa objek perubahan baru; riwayat sumber tidak diekspor ulang sebagai arsip Git lengkap. Snapshot dapat dijalankan tanpa Git dengan langkah instalasi di atas.

RANCANGAN.md dan docs/KONTRAK_API.md tetap menjadi kontrak bisnis tim. Kontrak UI telah diperbarui ke Laravel/Blade; frontend/ berisi arsip wireframe untuk acuan visual. Persetujuan empat anggota belum diisikan atas nama mereka.

Referensi teknis: [Laravel HTTP client](https://laravel.com/docs/13.x/http-client), [Sequelize bind parameters](https://sequelize.org/docs/v6/core-concepts/raw-queries/#bind-parameter), [OWASP SQL injection](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [MDN pemasangan PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
