# Verifikasi milestone arus kas — 6 November 2026

Pengujian dilakukan pada salinan proyek dan database uji terisolasi. Database pengguna tidak diakses atau diubah. Tidak ada push GitHub.

| Pemeriksaan | Hasil aktual |
|---|---|
| Unit/model/evidence Node | 11 lolos; 1 suite MySQL dilewati pada npm test standar dan dijalankan terpisah |
| HTTP + database nyata | 11 tes (10 subtes + suite induk), semuanya lolos, tidak ada skip |
| Laravel/PHPUnit | 13 tes, 80 assertion, semuanya lolos |
| Postman/Newman | 68 request, 85 assertion, 0 kegagalan |
| Form web hidup | Register → login → tambah income/expense → edit → hapus → logout lolos melalui HTTP dengan CSRF/session cookie |
| SQL register | User baru benar-benar ada di users; password berbentuk hash scrypt, bukan plaintext |
| Migrasi legacy | Tabel tanpa role/type di-upgrade; transaksi lama tetap ada, menjadi expense; migrasi kedua tidak menggandakan data |
| Ownership | User lain ditolak untuk detail, update, delete, nested user/category, Budget, konversi, status Midtrans dan agregasi; ORM/raw sama-sama diperiksa |
| Kesetaraan ORM/raw | Filter type/kategori/search/nominal/tanggal, sort dan pagination menghasilkan data/meta identik |
| Batas tanggal | Awal hari Jakarta 2026-11-01 = UTC 2026-10-31 17:00; termasuk pada kedua mode |
| Presisi dan total | 0.10 + 0.20 presisi; agregasi tetap seluruh data walau limit=1; daftar web >10 transaksi membaca total API |
| Budget | Income tidak menambah total_spent; mengubah expense ke income mengurangi penggunaan Budget |
| Auth | Wrong password, duplikat email, role injection, refresh rotation, logout/revocation dan soft-deleted user diuji |
| UI data kosong/gagal | Empty state dan upstream 502 diperiksa; error provider/SQL internal tidak bocor |
| Bukti N+1 | Dua Budget, satu SELECT bisnis JOIN + dua SELECT autentikasi tetap; log aktual tercantum di RANCANGAN.md |
| Composer | composer.json valid; tidak ada build frontend NPM/Vite atau migrasi user Laravel kedua |

## Lingkungan dan batas

Node 24.22.1; PHP 8.3.6; framework mengikuti composer.lock; database uji MariaDB 10.11.14 melalui driver MySQL2/Sequelize. SQL/DDL menggunakan sintaks MySQL yang juga didukung MariaDB. Koneksi MySQL pengguna di SQLyog baru dapat diperiksa setelah .env diisi dan proyek dijalankan pada komputernya.

Pengujian web hidup menggunakan request form HTTP, CSRF, cookie session dan backend/database asli; bukan mock data. Pengujian klik/visual dengan Chromium belum berhasil dijalankan karena lingkungan menolak socket lokal yang diperlukan browser. Karena itu tidak ada klaim screenshot atau klik browser otomatis sudah lolos. Dialog hapus dan layout responsif tersedia pada sumber; perlu pemeriksaan visual pada browser lokal pengguna.

Midtrans/kurs asli tidak dipanggil dengan kredensial operasional. Status 503 pada konfigurasi kosong adalah perilaku terkontrol, bukan bukti keberhasilan provider. Checkout/AI/wallet/wish/recurring/PDF/bank tetap di luar milestone ini.

Koleksi Postman dan suite lama sebelum ownership diarsipkan sebagai referensi. Suite aktif memakai auth serta pengujian database nyata yang menggantikannya. Hasil 4xx skenario negatif memang diharapkan dan seluruh assertion koleksi aktif lolos.
