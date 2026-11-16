# Tampilan ProjectSOA

Laravel 13 + Blade/PWA, terhubung ke API Express yang sama. Login/register/logout aktif. Ikuti [README root](../README.md) untuk instalasi, konfigurasi MySQL Node, migrasi, login dan pemeriksaan SQLyog.

`composer install`, salin `.env.example` hanya jika `.env` belum ada, `php artisan key:generate`, lalu `php artisan serve --host=127.0.0.1 --port=8000`. Tidak ada npm/Vite build atau tabel user Laravel kedua. Jalankan Node terpisah pada port 3001.

Halaman: `/login`, `/register`, `/app/dashboard`, `/app/transactions`, `/anggaran`, `/kategori`, `/aplikasi`. Seluruh halaman privat memakai EnsureApiAuthenticated; CurrentUserContext mengambil identitas dari sesi login. Flag preview tidak dipakai lagi. FinanceApi meneruskan Bearer JWT dari server dan AuthApi merotasi cookie refresh saat diperlukan.

Komponen/layout bersama berada di `resources/views/layouts`, `partials` dan `components`. Aset lokal di `public/assets`; login/register mengikuti warna/komponen yang sama. `php artisan test` untuk suite feature/unit.
