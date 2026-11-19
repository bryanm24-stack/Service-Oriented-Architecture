# Kontrak API aktif — milestone arus kas

Sumber utama implementasi: [README](../README.md) dan [RANCANGAN](../RANCANGAN.md). Prefix `/api/v1`. Auth aktif melalui Bearer JWT HS256 dengan issuer/audience/expiry dan sesi DB yang belum dicabut. Identitas `req.user={id,role,sessionId}` diisi middleware setelah verifikasi token dan user aktif; tidak dipercaya dari body.

Owner Transaction `id_user`; Budget `user_id`; seluruh baca/update/delete/nested/conversion/summary dibatasi owner. Resource user lain 404; spoofing owner create/PUT 403; owner pada PATCH ditolak 400. Admin lintas akun mengikuti matriks RANCANGAN; kategori write dan daftar/create user khusus admin.

JSON uang string dua desimal; type income/expense. Filter tanggal Jakarta dikonversi menjadi batas UTC; tanggal akhir inklusif. ORM/raw/agregasi memakai satu query plan. Raw memakai `replacements`, sort hanya whitelist. Meta daftar memuat total,count,limit,offset,page,sort,sort_by. Summary tidak dipaginasi.

Status: 200 baca/update/login, 201 create + Location, 204 hapus transaksi/kategori/Budget/logout, 400 validasi, 401 sesi, 403 izin, 404 resource tidak tersedia untuk pemilik, 409 konflik, 502/503/504 integrasi. DELETE user tetap 200 dan soft delete.

Format respons legacy dipertahankan per modul. Transaction list/detail `success,data,meta`; Budget `status,data`; Users objek/array; Categories `data`; auth `user,accessToken`. Laravel mengadaptasinya melalui satu FinanceApi/AuthApi.

Wallet atomik dan AI usage aktif pada milestone [SOA-20261118-09](SOA-20261118-09.md). API key AI dimiliki user, disimpan sebagai hash, dan diperiksa setelah JWT; W8 rate limit/log berjalan melalui api_tiers/api_clients/api_log.

Pembelian token aktif memakai snapshot `token_purchases` dan `Idempotency-Key`. `POST /token-purchases` mengembalikan `201` + `Location` untuk order baru, sedangkan replay aman mengembalikan `200`; checkout Snap memakai order DB dan harga snapshot. `POST /payments/midtrans/notifications` tidak memakai JWT: signature SHA-512 Midtrans, order, currency, dan gross amount wajib cocok. Hanya settlement/capture dengan fraud yang diterima yang mengubah order menjadi paid dan menambah wallet dalam transaksi yang sama; ledger unik mencegah replay. Pending/expire/deny tidak mengkredit, dan refund/chargeback menjadi `needs_review` tanpa debit otomatis.


## Wallet dan AI (SOA-20261118-09)

- `GET /token-wallet` mengembalikan `available_tokens`, `reserved_tokens`, `total_tokens` (serta alias `balance` untuk kompatibilitas). `GET /token-ledger` menerima `type`, `start_date`, `end_date`, `limit`, `offset`.
- `POST /ai/api-key` (JWT) menerbitkan API key satu kali; database hanya menyimpan SHA-256. Jangan pernah mengirim provider key ke browser.
- `POST /ai/analyze` membutuhkan JWT, `X-API-Key`, dan `Idempotency-Key`; body `question`, `period=YYYY-MM`, `answer_length=short|normal|detailed`. GET `/ai/usages`, `/ai/usage-summary?period=YYYY-MM`, `/ai/wallet`, `/ai/ledger` memerlukan JWT dan API key milik user yang sama.
- Reservasi memakai prompt lengkap + output limit + margin 20%. Debit aktual MVP adalah `prompt_tokens + completion_tokens`; cached/thinking/tool metadata hanya transparansi. Replay completed mengembalikan jawaban lama.
- `POST /admin/ai/reconcile-expired` khusus admin menandai reservasi kedaluwarsa pasca-dispatch untuk pemeriksaan dan hanya melepas reservasi yang belum dispatch.
