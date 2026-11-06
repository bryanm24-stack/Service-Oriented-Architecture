# ProjectSOA — Arus Kas, Login/Register dan Ownership

Express + Sequelize + MySQL sebagai API; Laravel 13 + Blade sebagai web/PWA. Tidak ada database user Laravel kedua. Register pada web memanggil POST /api/v1/auth/register; akun masuk ke tabel users pada database Node yang ditentukan DB_NAME dan dapat dilihat melalui SQLyog.

## Mulai di Windows/Laragon

Prasyarat: Node.js 24, PHP >=8.3, Composer dan MySQL/MariaDB aktif. Ekstensi PHP: curl, mbstring, fileinfo, openssl, xml/dom dan zip. Laravel menjadi HTTP gateway, sehingga tidak membutuhkan koneksi SQL terpisah. Jalankan di terminal yang sudah mengenali node, npm, php dan composer.

1. Ekstrak ZIP ke folder baru. Cadangkan database lama sebelum upgrade. Jangan menimpa .env milik tim dengan contoh kosong.
2. Buka terminal pada root Service-Oriented-Architecture:

```powershell
npm ci
Copy-Item .env.example .env
```

Gunakan Copy-Item hanya jika .env belum ada. Isi .env Node:

```dotenv
PORT=3001
HOST=127.0.0.1
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=asisten_keuangan
DB_USER=root
DB_PASSWORD=
```

Gunakan DB_NAME yang sama dengan database lama tim. DB_PASSWORD mengikuti MySQL lokal. SQLyog adalah aplikasi untuk melihat database, bukan database terpisah.

```powershell
npm run auth:keys
npm run db:migrate
npm start
```

Migrasi mempertahankan tabel/data lama, menambah transactions.type dengan default expense, indeks owner/type/tanggal, users.role bila belum ada, dan auth_sessions. Jalankan runner ini untuk upgrade, bukan hanya impor ulang Gabungan.sql: CREATE TABLE IF NOT EXISTS tidak menambah kolom pada tabel lama. Runner aman diulang; jangan menjalankan sync({force:true}), sync({alter:true}) atau reset database.

3. Terminal kedua, pada laravel-web:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
```

Copy-Item hanya jika .env belum ada. Pastikan SOA_API_BASE_URL=http://127.0.0.1:3001/api/v1. Gunakan alamat web yang konsisten: http://127.0.0.1:8000. Tidak ada perintah npm/Vite di folder Laravel. Tidak perlu php artisan migrate untuk membuat tabel bisnis/user.

4. Buka http://127.0.0.1:8000/register, buat akun, lalu login. Dashboard ada di /app/dashboard; transaksi ada di /app/transactions. Akun seed lama tidak mempunyai password publik; gunakan register. Login baru tetap dapat memverifikasi hash scrypt$... dari versi lama. Akun lama yang pernah tersimpan plaintext tidak dianggap password valid.
5. Di SQLyog, sambungkan ke host/port/database yang sama dengan .env Node. Refresh tabel users lalu jalankan SELECT id,name,email,role,createdAt FROM users ORDER BY id DESC; password tersimpan sebagai hash, bukan teks biasa. Transaksi tersimpan di transactions dengan type income/expense.

Jika tampilan terasa versi lama, bersihkan service worker/cache situs dari browser. Service worker paket ini memakai versi baru dan hanya menyimpan aset statis serta halaman offline, tidak menyimpan HTML/API/transaksi/token.

## Alur dan batas fitur

Browser → route/controller Laravel → AuthApi/FinanceApi → Express /api/v1 → middleware JWT/session/role → controller → Sequelize/MySQL.

- Login/register/logout aktif. JWT disimpan pada session server Laravel; tidak ada access token di sessionStorage/localStorage. Refresh token HttpOnly berotasi dan hash token disimpan di auth_sessions. Logout mencabut sesi API; akun yang dihapus tidak dapat memakai token lama.
- User biasa hanya mengakses datanya. Admin mendapat akses lintas akun pada resource sesuai matriks di RANCANGAN.md. Register tidak menerima role. API key/tier/rate-limit W8 masih model dasar; tidak diklaim sebagai fitur middleware aktif pada milestone ini.
- Transaction.type: income/expense. Create tanpa type mempertahankan kompatibilitas default expense. PUT wajib type, id_category, nominal dan catatan; PATCH menerima perubahan sebagian dan tidak boleh kosong. Owner tidak boleh dipindahkan melalui PUT/PATCH.
- Nominal DECIMAL(15,2), nonnegatif; response berupa string dua desimal. Alokasi Budget tetap DECIMAL(10,2), positif. Tidak ada konversi nominal pembukuan melalui float.
- ORM/raw memakai satu filter plan dan mengembalikan data/meta setara. Raw memakai named replacements. Urutan kolom/arah hanya whitelist; ID/query berbahaya ditolak.
- Tanggal filter adalah tanggal bisnis Asia/Jakarta, inklusif tanggal akhir. Disimpan/dibandingkan dalam UTC. createdAt mengikuti waktu pencatatan; form belum mengubah tanggal transaksi historis. Data lama tidak digeser zona waktunya saat migrasi.
- GET /transactions/summary dan /dashboard/summary memakai agregasi SQL yang sama. Seluruh filter data berlaku pada agregasi; limit/offset tidak membatasi total. Selisih diberi label arus kas tercatat, bukan saldo bank.
- Budget–Category N:M tetap melalui budget_categories. Summary hanya menghitung expense pada kategori yang dialokasikan, periode Jakarta yang sama.
- Dashboard awal: pemasukan, pengeluaran, selisih dan transaksi terbaru dari API. Dashboard lanjutan/grafik/kuota/tagihan tetap pekerjaan milestone Rafael.
- Midtrans masih pembacaan status order dan kurs masih integrasi estimasi. Checkout, wallet, AI, wish, recurring, PDF dan bank tidak ditambahkan pada milestone arus kas ini.

## API dan Postman

Base URL: http://127.0.0.1:3001/api/v1. Endpoint bisnis lama tetap ada dengan proteksi akses baru. Total aktif 39 pasangan method/path di prefix tersebut, termasuk alias auth; GET / adalah metadata.

| Endpoint baru | Fungsi |
|---|---|
| POST /auth/register | Membuat user biasa, hash password |
| POST /auth/login | Access JWT dan cookie refresh |
| POST /auth/refresh | Rotasi refresh, access JWT baru |
| POST /auth/logout | Mencabut sesi, menghapus cookie |
| GET /auth/me | Profil user login |
| GET /transactions/summary | Agregasi income/expense/selisih |
| GET /dashboard/summary | Agregasi yang sama untuk dashboard |

GET /auth/refresh dan GET /auth/profile adalah alias kompatibilitas. Daftar seluruh route: docs/ENDPOINTS_EXISTING.md.

Impor postman/ProjectSOA-ArusKas.postman_collection.json dan postman/ProjectSOA-Local.postman_environment.json. Pilih environment, pastikan baseUrl benar, lalu jalankan SEMUA request berurutan dengan Collection Runner. 68 request membuat akun A/B unik, menyimpan ID/JWT otomatis, menguji positif/negatif, CRUD, agregasi, Budget, ownership ORM/raw, refresh dan logout. Jangan mulai dari request tengah sebelum variabel fixture tersedia. Koleksi meninggalkan akun uji berlabel Postman agar penyimpanan SQL dapat diperiksa; transaksi/Budget fixture dibersihkan.

401 tanpa login, 403 akses admin, 404 resource milik user lain, 400 input tidak valid dan 409 konflik adalah hasil yang BENAR pada skenario negatif. Integrasi provider tanpa key/order menghasilkan 503 yang terkontrol. Lolosnya status ini tidak berarti provider asli berhasil dipanggil.

Postman lama disimpan di postman/legacy sebagai referensi sebelum ownership; jangan menjalankannya sebagai koleksi aktif.

Contoh body create:

```json
{"id_category":1,"type":"income","nominal":"1500000.00","catatan":"Gaji"}
```

Owner biasa selalu dari req.user.id. id_user legacy yang sama masih diterima pada create/PUT; ID user berbeda ditolak, dan PUT/PATCH tidak bisa memindahkan pemilik. user_id pada query admin boleh memilih akun; user biasa hanya boleh ID sendiri.

Filter GET transaksi: search, type, category_id, start_date, end_date, period (YYYY-MM), sort_by=createdAt/nominal/id_transaction, sort=asc/desc, limit 1..100, offset>=0, mode=orm/raw, minNominal, maxNominal, user_id. Gunakan period ATAU rentang tanggal. Nested /users/:id/transactions dan /categories/:id/transactions memakai filter/ownership yang sama.

## Admin dan pemeriksaan

Daftarkan akun operator terlebih dahulu, lalu hanya dari terminal tepercaya:

```powershell
npm run user:admin -- email-operator-anda
```

Tidak ada password/admin default. User biasa tidak dapat menaikkan role lewat API. Operator dapat login lagi untuk memakai Postman dengan bearer JWT miliknya.

```powershell
npm test
npm run test:mysql
cd laravel-web
php artisan test
```

npm test menjalankan unit/model/evidence; suite DB nyata dilewati tanpa RUN_MYSQL_TESTS. npm run test:mysql menjalankan suite nyata menggunakan DB_HOST/DB_PORT/DB_USER/DB_PASSWORD dari .env. Buat izin CREATE/DROP hanya pada database uji soa_test_*; runner membuat nama unik dan menghapus HANYA database uji itu setelah selesai. TEST_DB_PORT/TEST_DB_HOST/TEST_DB_NAME dapat digunakan untuk server uji terpisah; TEST_DB_NAME wajib berawalan soa_test_. Jangan menunjuk database produksi.

Lihat docs/VERIFIKASI_ARUS_KAS.md untuk hasil aktual dan batas pengujian. Rancangan/matriks akses: RANCANGAN.md. Dokumen M1/wireframe lama di docs/legacy dan frontend adalah referensi historis, bukan status runtime terbaru.
