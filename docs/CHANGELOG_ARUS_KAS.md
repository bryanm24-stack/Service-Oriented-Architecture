# Perubahan yang perlu diketahui tim

- Login/register web dan API sudah aktif; gunakan /api/v1/auth/register, bukan POST /users untuk pendaftaran publik.
- Seluruh endpoint keuangan sekarang memerlukan Bearer JWT. POST/GET /users dan write kategori khusus admin. User biasa hanya melihat datanya sendiri.
- Transaksi lama tetap ada dan default expense. Create tanpa type masih expense; PUT wajib menyebut type. PATCH dapat mengubah type/kategori/nominal/catatan, tanpa memindahkan pemilik.
- DELETE transaksi sekarang 204 tanpa JSON. Consumer lama perlu menangani 204; FinanceApi dan Postman paket ini sudah disesuaikan.
- List default berdasarkan createdAt desc. Gunakan sort_by=nominal&sort=asc untuk urutan nominal lama. Total dan pagination berasal dari API.
- Dashboard /app/dashboard dan transaksi /app/transactions memakai agregasi yang sama. SQLyog melihat tabel users/transactions pada DB_NAME backend; Laravel tidak membuat user kedua.
- RANCANGAN (1).md telah dipindahkan menjadi RANCANGAN.md; versi sebelum perubahan ada di docs/legacy. Bukti SQL aktual sudah dimasukkan.
- Suite dan koleksi lama tanpa auth diarsipkan; gunakan tests/ dan Postman aktif pada root postman/.
