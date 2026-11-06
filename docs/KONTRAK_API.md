# Kontrak API aktif — milestone arus kas

Sumber utama implementasi: [README](../README.md) dan [RANCANGAN](../RANCANGAN.md). Prefix `/api/v1`. Auth aktif melalui Bearer JWT HS256 dengan issuer/audience/expiry dan sesi DB yang belum dicabut. Identitas `req.user={id,role,sessionId}` diisi middleware setelah verifikasi token dan user aktif; tidak dipercaya dari body.

Owner Transaction `id_user`; Budget `user_id`; seluruh baca/update/delete/nested/conversion/summary dibatasi owner. Resource user lain 404; spoofing owner create/PUT 403; owner pada PATCH ditolak 400. Admin lintas akun mengikuti matriks RANCANGAN; kategori write dan daftar/create user khusus admin.

JSON uang string dua desimal; type income/expense. Filter tanggal Jakarta dikonversi menjadi batas UTC; tanggal akhir inklusif. ORM/raw/agregasi memakai satu query plan. Raw memakai `replacements`, sort hanya whitelist. Meta daftar memuat total,count,limit,offset,page,sort,sort_by. Summary tidak dipaginasi.

Status: 200 baca/update/login, 201 create + Location, 204 hapus transaksi/kategori/Budget/logout, 400 validasi, 401 sesi, 403 izin, 404 resource tidak tersedia untuk pemilik, 409 konflik, 502/503/504 integrasi. DELETE user tetap 200 dan soft delete.

Format respons legacy dipertahankan per modul. Transaction list/detail `success,data,meta`; Budget `status,data`; Users objek/array; Categories `data`; auth `user,accessToken`. Laravel mengadaptasinya melalui satu FinanceApi/AuthApi.

Rencana wallet/AI/wish/recurring/PDF/bank yang BELUM aktif dipertahankan pada [draft M1](legacy/M1-KONTRAK_API.md). Tiga model W8 belum otomatis menjadi middleware API key/rate limit.
