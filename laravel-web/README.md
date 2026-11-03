# ProjectSOA mobile web

Laravel 13 + Blade sebagai tampilan mobile/PWA dan HTTP gateway menuju Node.js. Panduan lengkap berada di [README proyek](../README.md).

```powershell
composer install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8000
```

Node harus dijalankan terpisah di port 3001 dengan database uji. Jangan menjalankan migrasi Laravel untuk membuat tabel bisnis/users. Tidak ada frontend NPM/Vite build; CSS/JS/ikon berada di public/.

SOA_LOCAL_PREVIEW hanya berlaku pada environment local/testing. Login/register menunggu Dana. Tidak ada provider akun lokal atau route autentikasi Laravel. Data keuangan tidak dicache dan tidak ada antrean kirim offline.

Komponen bersama: resources/views/layouts/app.blade.php, components/icon.blade.php, components/empty-state.blade.php dan partials/expenses.blade.php. Seluruh halaman memakai public/assets/app.v1.css dan app.v1.js. PreviewUserContext adalah titik penggantian identitas untuk integrasi auth berikutnya.

Jalankan php artisan test untuk feature/unit test. Framework/dev tooling mengikuti composer.lock. Vendor, .env, session, cache Blade dan file log tidak disertakan dalam paket.
