# Kontrak API v0.1 — rancangan setelah baseline

Dokumen ini mengunci penamaan dan bentuk fitur baru. Endpoint planned di bawah **belum dipasang** pada aplikasi M1.
Baseline tetap 30 endpoint di [inventaris](ENDPOINTS_EXISTING.md); jangan mengklaim JWT atau pembelian sudah bekerja.

## Identitas, ownership dan akses

- Prefix `/api/v1`, Content-Type JSON. JWT Bearer dipakai setelah modul auth diimplementasikan dan diuji.
- Claim `sub` adalah User.id dalam bentuk string; verifikasi signature, algorithm yang diizinkan, issuer, audience dan expiry. Middleware menghasilkan `req.auth.userId` integer dan role user/admin.
- Owner resource baru selalu diisi dari `req.auth.userId`. Body baru berisi `user_id/id_user` ditolak 400 OWNER_FIELD_FORBIDDEN. List/detail/update/delete selalu mempunyai filter kepemilikan.
- Resource user lain menghasilkan 404. Admin memerlukan kebijakan eksplisit; role tidak diterima dari register/body.
- JWT belum ada pada baseline dan User belum mempunyai role. Field rencana: users.role ENUM(user,admin) NOT NULL DEFAULT user; perlu migrasi/backfill, pemeriksaan password scrypt existing dan tes ownership sebelum UI memakai data pribadi sungguhan.
- Saat migrasi auth untuk endpoint lama, nama body/path lama boleh dipertahankan sementara tetapi harus cocok dengan JWT; mismatch menghasilkan 403 OWNER_MISMATCH. Semua query tetap dibatasi user. Rencana ini belum mengubah runtime lama.
- Pendaftaran memakai POST /auth/register kelak dan service create User yang sama; endpoint POST /users lama tidak boleh diam-diam dianggap endpoint login/register ber-JWT.
- Access token di memory frontend. Refresh token melalui cookie HttpOnly; kebijakan Secure/SameSite/CORS dan rotasi diselesaikan Bryan saat milestone auth. Nama environment auth yang dicadangkan: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ISSUER, JWT_AUDIENCE; nilai secret wajib diisi lokal saat auth dibuat, bukan ditambahkan sekarang. Rahasia tidak masuk source, Postman export atau log.
- Satu pengecualian JWT: webhook Midtrans menerima autentikasi provider; pemilik ditentukan dari Purchase yang dicocokkan server, bukan user_id callback.

## Uang, token dan waktu

| Data | Kontrak baru |
|---|---|
| Uang | DECIMAL(15,2), JSON string seperti `"125000.00"`; tidak memakai float untuk pembukuan |
| Currency | IDR untuk pembelian/wish/recurring/income; konversi kurs existing tetap estimasi tampilan |
| Token | Integer; jumlah/reservasi nonnegatif, delta ledger bisa negatif; tolak overflow Number.MAX_SAFE_INTEGER |
| ID | JSON integer positif; id pemilik diambil server |
| Timestamp | ISO 8601 UTC, contoh `2026-10-30T03:00:00.000Z` |
| Tanggal bisnis | YYYY-MM-DD, Asia/Jakarta; tanggal transaksi historis diaudit sebelum backfill |
| Pagination baru | page >=1, page_size 1..100 (default 20); meta memuat page/page_size/total |

Harga pembelian dan jumlah token selalu snapshot katalog server; client hanya mengirim token_package_id.
Contoh nominal pada dokumen bukan harga katalog yang sudah disepakati.

## Format respons fitur baru

```json
{"success":true,"data":{"id":7,"amount":"125000.00","currency":"IDR"},"meta":{"request_id":"contoh-request"}}
```

```json
{"success":false,"data":null,"error":{"code":"VALIDATION_ERROR","message":"Input tidak valid","details":[{"field":"amount","message":"Gunakan maksimal dua angka desimal"}]},"meta":{"request_id":"contoh-request"}}
```

Gunakan 200 baca/update, 201 resource baru + Location, 204 delete tanpa JSON.
400 validasi, 401 JWT hilang/invalid, 403 izin/owner mismatch legacy, 404 resource tidak tersedia untuk pemilik, 409 konflik/idempotency/saldo token tidak cukup, 429 rate limit, 502/503/504 gangguan integrasi.
Kode error fitur baru: OWNER_FIELD_FORBIDDEN, OWNER_MISMATCH, INSUFFICIENT_TOKENS, IDEMPOTENCY_CONFLICT, BANK_INTEGRATION_UNAVAILABLE.
Format 30 endpoint lama **tidak dibungkus ulang pada M1**. Frontend menggunakan adapter DTO per resource, bukan menebak satu envelope untuk semua endpoint.

## Endpoint reserved untuk pekerjaan berikutnya

Semua path di bawah ditulis setelah prefix /api/v1. Setiap baris adalah rencana, bukan penambahan runtime.

| Modul / method + path | Akses rencana | PIC |
|---|---|---|
| POST /auth/register, /auth/login, /auth/refresh, /auth/logout; GET /auth/me | Publik/cookie/JWT sesuai operasi | Bryan |
| GET /dashboard/summary | JWT, data pemilik | Rafael |
| GET/POST /incomes; GET/PATCH/DELETE /incomes/:id | JWT, data pemilik | Dana |
| GET /token-packages | Katalog publik | Bryan |
| POST/GET /purchases; GET /purchases/:id; POST /purchases/:id/cancel | JWT, data pemilik | Bryan |
| POST /payments/midtrans/notifications | Signature provider, tanpa JWT user | Bryan |
| GET /token-wallet; GET /token-ledger | JWT, read-only pemilik | Kenneth |
| POST /ai/requests; GET /ai/usages; GET /ai/usages/:id | JWT, debit server, data pemilik | Dana |
| GET /tips | JWT, tanpa debit token | Dana |
| GET/POST /wishes; GET/PATCH/DELETE /wishes/:id | JWT, data pemilik | Rafael |
| GET /wishes/:id/installments; POST /wishes/:id/realizations | JWT, data pemilik, idempotent realization | Rafael |
| GET/POST /recurring-costs; GET/PATCH/DELETE /recurring-costs/:id | JWT, data pemilik | Dana |
| GET /reports/summary; GET /reports/expenses.pdf | JWT, data pemilik, periode identik | Rafael |
| GET/POST /bank/connections; GET /bank/transactions | Bersyarat, off sampai akses resmi tersedia | Rafael |

Idempotency-Key wajib untuk POST purchases, ai/requests, wish realization. Key sama + payload kanonik sama mengembalikan resource/hasil sama; key sama + payload berbeda =409. Request masih diproses =409 REQUEST_IN_PROGRESS. Percobaan yang benar-benar baru memakai key baru.
Contoh checkout: `{"token_package_id":1}`. Contoh AI: `{"prompt":"Ringkas pengeluaran saya","max_output_tokens":200}`. Client tidak mengirim amount, token_amount, charged_tokens, provider status atau saldo.
POST /ai/requests direncanakan 200 ketika hasil sinkron lengkap tersedia; usage_id selalu disimpan untuk penelusuran. Timeout tidak memberi izin debit ulang; GET usage menampilkan pending/reconciliation sampai hasil provider jelas.

## Kontrak integrasi, ledger dan migrasi

Purchase status awal: pending; transisi menjadi paid/expired/cancelled/failed mengikuti provider terverifikasi. Pembatalan user hanya untuk pending; paid tidak dibalik menjadi cancelled.
Konfirmasi menggunakan signature resmi dan pencocokan order, nominal, currency serta status; verifikasi server ke provider bila perlu. Kredit wallet dan ledger hanya sekali per event/order melalui transaksi + lock + unique constraint. Browser redirect dan callback duplikat tidak menambah saldo.
DELETE resource baru Income/Wish/RecurringCost memakai soft delete/arsip; Purchase/AIUsage/TokenLedger tidak dihapus lewat API. Ini tidak mengubah DELETE Transaction legacy pada M1.
Refund/koreksi wallet memakai ledger kompensasi dan event_key unik, tidak menghapus histori. Rincian mapping metode pembayaran direview pada milestone integrasi, belum menjadi kode M1.
Callback bank dan AI tidak boleh menulis saldo langsung. Service wallet milik Kenneth adalah satu pintu perubahan saldo.
Laporan PDF mengirim application/pdf dengan Content-Disposition; error tetap JSON. UI memakai wrapper blob bersama dan tidak memasukkan JWT ke query URL.
Endpoint bank tetap tidak diimplementasikan ketika akses resminya belum ada; UI menampilkan alasan dan alternatif input manual.
Migrasi upgrade terpisah dari bootstrap. Tidak menjalankan reset data pengguna untuk membuktikan fitur.
