# Rancangan Asisten Keuangan — pembaruan 22 November 2026

## Arsitektur dan aturan lintas modul

Browser → Laravel 13 Blade/PWA → Express /api/v1 → Sequelize → MySQL. Satu database bisnis pada Node. Identitas owner dari JWT + AuthSession aktif; role efektif dibaca ulang dari database. Register selalu user, password scrypt. Laravel menyimpan access/refresh token pada session server. Admin tidak mengubah owner resource melalui PATCH/PUT. Data pemilik lain 404. Joi whitelist, raw parameter terpisah, error pusat tanpa kredensial/SQL.

Transaksi income/expense, DECIMAL(15,2), operasi uang integer sen. ORM/raw/agregasi memakai filter bersama; periode bisnis Asia/Jakarta disimpan UTC. Dashboard adalah arus kas tercatat, bukan saldo bank. Budget–Category N:M melalui allocated_amount; pemakaian hanya expense. User dan TokenBundle soft delete; histori finansial dipertahankan. Migrasi additive tanpa reset data.

## Entitas saat ini

21 model: User, Category, Transaction, Budget, BudgetCategory, ApiClient, ApiTier, ApiLog, AuthSession, TokenBundle, TokenPurchase, TokenWallet, TokenLedger, AIUsage, Wish, InstallmentSchedule, RecurringCost, RecurringOccurrence, BankConnection, BankImportBatch, BankImportItem.
User memiliki transactions/budgets/wishes/recurring_costs/auth_sessions/api_clients/token_purchases/ai_usages/bank_connections/bank_import_batches dan satu TokenWallet. BankConnection memiliki batches/imported_items, Batch memiliki items, Item belongsTo Transaction. Semua hubungan database ditetapkan di js/src/models/index.js dan sql/Gabungan.sql.

## Status fitur dan batas

CRUD transaksi/kategori/user/Budget dan agregasi aktif; katalog/order snapshot, Midtrans webhook, wallet ledger atomik dan analisis AI telah diimplementasikan pada milestone sebelumnya. Wish pembayaran mencatat expense; recurring masih template/occurrence, belum mesin transaksi otomatis. Tips gratis tidak menggunakan provider atau wallet. Bank memakai impor manual, belum API rekening nyata. PDF belum diimplementasikan.

## Keputusan bank: IMPOR MANUAL, bukan sandbox tim yang sudah tersedia

Diputuskan 22 November 2026. Bukti: Client ID tim belum muncul menurut pengguna; tidak ada token dan respons sandbox terautentikasi yang dapat diperiksa. Portal publik resmi tersedia tetapi tidak membuktikan akses tim. Spike akses dibatasi dua jam; fallback dipilih sekarang. Demo dan target selesai 25 November tidak bergantung pada persetujuan bank.

Sumber resmi, kebutuhan kredensial/otorisasi, kontrak data, batas yang perlu dikonfirmasi, adapter, relasi dan seluruh kriteria penerimaan ada di [docs/SOA-20261122-BANK-TIPS.md](docs/SOA-20261122-BANK-TIPS.md). Dokumentasi BCA: https://developer.bca.co.id/id/Dokumentasi dan https://developer.bca.co.id/id/Sandbox ; biaya dikonfirmasi melalui https://webform.bca.co.id/api/registrasi-api . Tidak ada biaya atau kredensial yang dikarang. Tidak memakai scraper/login bank atau transfer.

BankConnection hanya alias/last4, mode manual_import/status ready_import. Batch preview terkait owner/kategori. Item unique connection+external_ref terkait Transaction; konfirmasi atomik dengan lock, replay tidak menggandakan transaksi. CSV/JSON canonical debit→expense, kredit→income. Data sintetis berlabel hanya preview; saldo verified selalu false dan amount null. UI /app/bank menyatakan sandbox belum terhubung. Rencana adapter getBalance/getStatements mempertahankan field service saat provider resmi ditambahkan.

## Keputusan tips gratis

GET /api/v1/recommendations/free wajib JWT; whitelist periode, konfirmasi data dan preferensi. Tiga query bisnis dengan agregasi/JOIN owner; tidak N+1. Proyeksi income−expense−komitmen tanpa referensi Transaction; tunggakan sampai akhir periode termasuk. Angka ini bukan saldo bank/kas terverifikasi. Tanpa konfirmasi pemasukan/komitmen, data_incomplete dan petunjuk input muncul. Prioritas kebutuhan, cadangan likuid, tujuan/modal, lalu edukasi sesuai horizon/risiko; tidak menjanjikan return atau produk spesifik. Tidak memanggil provider atau mendebit TokenWallet. UI /app/tips mengambil alasan dan nominal dari API.

## Kriteria selesai untuk 25 November 2026

1. Demo dua akun, mode/sumber/status akses jelas; data akun lain tidak terbaca.
2. CSV/JSON valid menghasilkan preview setara; tanggal/referensi/debit-kredit/nominal/error terlihat, rekening tersamarkan.
3. Invalid/sintetis tidak dicatat; konfirmasi/referensi berulang tidak menggandakan transaksi; kegagalan item me-rollback transaksi.
4. Contoh tips positif, defisit dan data tidak lengkap cocok rumus; komitmen yang sudah punya Transaction tidak dihitung ulang.
5. Saldo token sebelum/sesudah tips sama, tanpa panggilan provider AI; halaman/navigasi browser berfungsi setelah migrasi.
6. npm test lolos; jalankan suite MySQL terisolasi dan Laravel di environment yang menyediakan runtime tersebut, serta dokumentasikan hasil aktual.

## Dokumen implementasi

[Bank dan tips](docs/SOA-20261122-BANK-TIPS.md), [panduan demo](PANDUAN-BANK-TIPS.md), [wallet/AI](docs/SOA-20261118-09.md), [Wish](docs/SOA-20261108-06.md), [recurring](docs/SOA-20261111-08.md). Dokumen bertanggal lama menjelaskan milestone saat itu; status terkini mengikuti dokumen ini dan kode.

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
