> Update SOA-20261106-05: TokenBundle/TokenPurchase dan UI katalog/order lokal sudah diimplementasikan. Kontrak terkini ada di [docs/SOA-20261106-05.md](docs/SOA-20261106-05.md). Pembayaran, wallet/ledger, tier dan subscription belum diaktifkan.

# Rancangan Asisten Keuangan — milestone arus kas

## Domain dan consumer

Mengelola akun, kategori bersama, pemasukan/pengeluaran, anggaran bulanan dan arus kas tercatat. Consumer pertama adalah web/PWA Laravel; consumer kedua adalah aplikasi/API client seperti Postman. Keduanya memakai backend REST Express dan satu database MySQL melalui Sequelize. Provider kurs/Midtrans hanya melengkapi data lokal, tidak menggantikan pencatatan dan aturan bisnis service.

## Entitas dan relasi

User hasMany Transaction melalui id_user; Transaction belongsTo User dan Category. Category hasMany Transaction. User hasMany Budget melalui user_id. Budget belongsToMany Category dan Category belongsToMany Budget melalui BudgetCategory dengan allocated_amount. User hasMany ApiClient dan AuthSession; ApiClient belongsTo ApiTier dan hasMany ApiLog. Ada sembilan tabel: users, categories, transactions, budget, budget_categories, api_clients, api_tiers, api_log, auth_sessions.

Transaction.type ENUM(income,expense), default expense; nominal DECIMAL(15,2) >=0. BudgetCategory.allocated_amount DECIMAL(10,2) >0. Unique user/bulan/tahun dan budget/kategori tetap ada. Semua transaksi lama mendapatkan type expense tanpa perubahan ID, nominal, catatan, timestamp atau owner.

User memakai paranoid:true, scope default tanpa password dan withPassword khusus verifikasi; User.profile_info dan Budget.keterangan virtual getter; Category.name setter merapikan spasi serta formatted_name virtual getter. Password di-hash scrypt melalui util bersama, baik register maupun User CRUD.

## REST, validasi dan akses

30 endpoint bisnis lama tetap dipasang dan ditambah dua endpoint agregasi serta tujuh route auth termasuk alias: total 39 method/path di /api/v1. GET / metadata tidak termasuk. PUT lengkap, PATCH sebagian nonkosong, parameter/unknown fields divalidasi Joi, 201+Location untuk create, 204 untuk delete transaksi/kategori/Budget/logout; User tetap soft-delete 200. Error pusat menangani 400/401/403/404/409/502/503/504 tanpa SQL/kredensial.

| Resource | User biasa | Admin | Tamu |
|---|---|---|---|
| /auth/register, /auth/login | Publik; role register selalu user | Publik; role tidak dari body | Publik |
| /auth/me, /auth/logout | Sesi sendiri | Sesi sendiri | 401 |
| /users GET dan POST | 403 | Daftar/create user | 401 |
| /users/:id GET/PUT/PATCH/DELETE | Akun sendiri | Lintas akun | 401 |
| /users/:id/transactions, budgets, subscription-status | Data sendiri | Lintas akun | 401 |
| /categories GET/detail | Baca bersama | Baca bersama | 401 |
| /categories POST/PUT/PATCH/DELETE | 403 | Kelola kategori | 401 |
| /categories/:id/transactions | Hanya transaksi sendiri | Lintas akun | 401 |
| /transactions CRUD/conversion | Hanya milik sendiri | Lintas akun | 401 |
| /budgets CRUD/summary | Hanya milik sendiri | Lintas akun | 401 |
| /transactions/summary, /dashboard/summary | Hanya agregasi sendiri | Lintas akun/target user_id | 401 |

Resource user lain 404. Owner create ordinary diisi dari req.user.id; id_user legacy yang sama masih diterima, ID berbeda 403. PUT tidak memindahkan owner; PATCH owner ditolak 400. Admin tidak mendapatkan bypass selain resource pada matriks. Role pada request create/update user tidak diterima. JWT HS256 diverifikasi secret/issuer/audience/expiry, user aktif dan sesi DB; role efektif dibaca kembali dari database. Refresh token random disimpan sebagai hash, berotasi dengan transaksi+lock; logout mencabut sesi.

## ORM/raw dan ringkasan

src/services/transactionQuery.js adalah satu sumber filter untuk ORM/raw/agregasi: owner, type, kategori, search LIKE, nominal, tanggal, sort whitelist, limit/offset. ORM memakai Op/include User/Category; raw memakai LEFT JOIN yang sama dan named replacements. Raw/ORM setara termasuk user soft-deleted, null catatan, decimal string, timestamps dan urutan tie-breaker ID.

Tanggal bisnis Asia/Jakarta diubah menjadi rentang UTC [awal, sehari setelah tanggal akhir). Parameter tanggal raw berupa string UTC eksplisit agar tidak berubah menurut zona waktu proses Node. Database Sequelize menggunakan timezone +00:00. createdAt mengikuti pencatatan; migrasi tidak menggeser data historis.

GET /transactions/summary dan /dashboard/summary memakai agregasi SQL SUM(CASE...) dan COUNT, bukan jumlah satu halaman. Respons income, expense, difference dan total_transactions; berlabel Arus kas tercatat. Budget summary memakai satu JOIN alokasi dan satu agregasi semua kategori expense dalam periode Jakarta; income tidak menambah total_spent. Selisih bukan saldo bank.

## Arsitektur dan frontend

Browser → Laravel controller → AuthApi/FinanceApi → Express router → verifyJWT/checkRoles → controller → Sequelize/MySQL. Laravel tidak membuat tabel users sendiri. CurrentUserContext diisi dari session yang diverifikasi /auth/me. Seluruh filter/list/summary datang dari API, bukan data demo atau total halaman lokal. Dashboard awal dan halaman transaksi memakai partial kartu arus kas dan daftar bersama. CSP self, CSRF form, HTML escaping Blade, aset lokal, token tetap server-side. Service worker hanya menyimpan static shell, tidak HTML/API/token/keuangan.

## Integrasi dan status lingkup

Kurs ExchangeRate-API untuk estimasi konversi dan Midtrans untuk membaca status order sudah dipertahankan. Provider salah/tidak dikonfigurasi menghasilkan 502/503/504 terkontrol; ini bukan bukti provider asli berhasil. Checkout/token AI/wallet/wish/recurring/PDF/bank tetap rencana lanjutan. Model W8 ada, middleware API key/rate-limit belum diklaim aktif.

## Migrasi dan bukti

scripts/migrate.js menjalankan CREATE IF NOT EXISTS tanpa reset, guarded users.role, guarded transactions.type dan indeks owner/type/createdAt. auth_sessions ditambah, tidak mengganti user. Uji nyata mempertahankan satu transaksi legacy dan menjalankan upgrade dua kali. Hasil pemeriksaan ada di docs/VERIFIKASI_ARUS_KAS.md.

Untuk bukti SQL N+1 gunakan npm run evidence:budget dengan BUDGET_EVIDENCE_TOKEN berisi JWT user uji yang mempunyai Budget beserta alokasi. Perekam memisahkan dua SELECT autentikasi yang tetap dari query bisnis; bukti bisnis menuntut satu JOIN, bukan query kategori per baris. Token tidak ditulis pada laporan.

<!-- MULAI BUKTI SQL BUDGET OTOMATIS -->
## Bukti aktual SQL Budget: pemeriksaan N+1

Waktu eksekusi (UTC): 2026-11-06T14:28:20.164Z

| Pemeriksaan | Hasil |
|---|---|
| Endpoint | GET /api/v1/budgets |
| HTTP | 200 |
| Database | MySQL melalui konfigurasi .env |
| Budget dalam respons | 2 |
| Alokasi kategori dalam respons | 2 |
| SELECT bisnis Budget | 1 |
| SELECT autentikasi tetap (User/session) | 2 |
| Pivot pada respons | categories[].Budget_categories.allocated_amount |

SQL berikut direkam oleh logger Sequelize saat endpoint dijalankan; bukan SQL contoh atau hasil query generator.

```sql
SELECT `Budget`.`budget_id`, `Budget`.`user_id`, `Budget`.`month`, `Budget`.`year`, `Budget`.`createdAt`, `Budget`.`updatedAt`, `categories`.`id` AS `categories.id`, `categories`.`name` AS `categories.name`, `categories`.`icon` AS `categories.icon`, `categories->Budget_categories`.`id` AS `categories.Budget_categories.id`, `categories->Budget_categories`.`allocated_amount` AS `categories.Budget_categories.allocated_amount` FROM `budget` AS `Budget` LEFT OUTER JOIN ( `budget_categories` AS `categories->Budget_categories` INNER JOIN `categories` AS `categories` ON `categories`.`id` = `categories->Budget_categories`.`category_id`) ON `Budget`.`budget_id` = `categories->Budget_categories`.`budget_id` WHERE `Budget`.`user_id` = 5 ORDER BY `Budget`.`budget_id` ASC;
```

Pada request ini, Budget, Category, dan pivot diambil dalam satu SELECT JOIN. Tidak tercatat SELECT tambahan per Budget atau per kategori; query autentikasi tetap dihitung terpisah.
Pemeriksaan ini berlaku untuk endpoint dan data pada eksekusi di atas, bukan jaminan untuk seluruh endpoint.

Isi baris respons dan kredensial tidak dimasukkan ke laporan.
<!-- SELESAI BUKTI SQL BUDGET OTOMATIS -->
