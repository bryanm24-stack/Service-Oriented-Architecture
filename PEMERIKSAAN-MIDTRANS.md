# Pemeriksaan integrasi Midtrans

Pemeriksaan dilakukan terhadap Service-Oriented-Architecture(8).zip pada 13 Oktober 2026. Endpoint dapat dipakai untuk membaca status pembayaran setelah konfigurasi, pengguna MySQL, dan transaksi Midtrans tersedia. Keberhasilan pada akun Midtrans asli belum terverifikasi karena file .env unggahan tidak berisi MIDTRANS_SERVER_KEY maupun MIDTRANS_ORDER_IDS.

## Hasil pemeriksaan ZIP unggahan

| Bagian | Temuan |
|---|---|
| Order ID global tetap | Sudah tidak ada. Kode membaca MIDTRANS_ORDER_IDS berdasarkan ID user. |
| Fallback Server Key dummy | Sudah tidak ada. Key dibaca dari environment. |
| Profil pengguna | Diambil dari User.findByPk; pengguna tidak ditemukan menghasilkan 404. |
| Hubungan user dan order | Sudah ada melalui pemetaan environment manual. Belum berupa relasi tabel pembayaran. |
| Konfigurasi Midtrans dalam .env unggahan | Belum ada, sehingga panggilan sukses belum dapat dilakukan. |
| Pengecekan respons provider | Sebelumnya hanya memeriksa keberadaan transaction_status; belum mencocokkan order_id. |
| Penempatan kode | Logika Midtrans masih berada di UserController.js. |

Pernyataan bahwa ZIP (8) masih memakai order ID global dan key dummy tidak sesuai dengan kode yang diunggah. Kendala yang tersisa adalah konfigurasi dan kelengkapan pemeriksaan respons.

## Pembagian controller dan service

| File | Tanggung jawab |
|---|---|
| src/routes/userRoutes.js | Mendaftarkan URL dan metode HTTP. |
| src/controllers/UserController.js | Memvalidasi ID, mengambil profil pengguna dari database, memanggil service, dan mengirim respons HTTP. |
| src/services/midtrans.js | Memilih order per user, memvalidasi konfigurasi, membuat autentikasi provider, meminta status, memeriksa identitas order, dan memilih field respons. |
| src/services/upstream.js | Menjalankan Axios dengan timeout, batas ukuran respons, larangan redirect, dan pemetaan error. |

Folder services bukan kewajiban teknis Express. Pemisahan ini membuat integrasi provider dapat diuji dan digunakan kembali tanpa bergantung pada req/res Express.

## Perbaikan yang disertakan

- Logika Midtrans dipindahkan ke service, dengan controller tetap menangani HTTP dan profil database.
- Sandbox menjadi pilihan bawaan; MIDTRANS_ENVIRONMENT dapat diisi production untuk konfigurasi akun produksi yang sesuai.
- Key kosong, contoh/dummy yang dikenali, Client Key, dan key dengan awalan environment yang salah ditolak. Pemeriksaan ini hanya memvalidasi konfigurasi; validitas key sebenarnya ditentukan oleh Midtrans.
- Pemetaan wajib berupa objek JSON dengan ID user valid. Order atau transaction_id yang sama tidak boleh dipetakan ke dua pengguna.
- Identitas dari query/body client tidak menggantikan order yang dipilih server. Parameter query order_id diabaikan oleh endpoint ini.
- Respons provider harus memiliki order_id yang sama dengan pemetaan. Jika transaction_id dikonfigurasi, nilainya juga harus cocok.
- Error di dalam JSON provider tetap diperiksa meskipun HTTP provider bernilai 200.
- Respons menambahkan id_order, id_transaksi, dan status_fraud. Password, Server Key, signature_key, dan payload provider lain tidak diteruskan.
- URL endpoint tetap GET /api/v1/users/:id/subscription-status. Jumlah endpoint bisnis tetap 30. Perubahan ini tidak memerlukan migrasi SQL.

## Konfigurasi agar dapat dipakai

Tambahkan konfigurasi berikut pada .env pribadi di folder utama proyek:

```env
MIDTRANS_ENVIRONMENT=sandbox
MIDTRANS_SERVER_KEY=
MIDTRANS_ORDER_IDS={"1":"ORDER-ASLI-USER-1","2":"ORDER-ASLI-USER-2"}
API_TIMEOUT_MS=5000
```

Isi MIDTRANS_SERVER_KEY dengan Server Key dari Settings > Access Keys pada dashboard sandbox. Jangan memakai Client Key. Ganti ID user dan nama order contoh dengan data sebenarnya. Order tersebut harus sudah terbentuk di akun Midtrans dan environment yang sama. Mengetik sebuah order baru ke .env tidak menciptakan transaksi di Midtrans.

Untuk lookup menggunakan transaction_id dari Midtrans, bentuk pemetaan berikut juga didukung:

```env
MIDTRANS_ORDER_IDS={"1":{"order_id":"ORDER-ASLI-USER-1","transaction_id":"ID-TRANSAKSI-DARI-MIDTRANS"}}
```

Service memakai transaction_id sebagai identifier lookup jika tersedia dan tetap mencocokkan order_id pada respons. Dokumentasi Get Transaction Status meminta transaction_id untuk metode pembayaran DANA dan transaksi BI SNAP yang disebut pada dokumentasi tersebut.

Aktifkan MySQL dengan konfigurasi DB_* yang sesuai, kemudian dari folder utama proyek jalankan:

```bash
npm ci
npm run midtrans:check -- 1
npm start
```

Angka 1 adalah ID user yang diuji. Perintah midtrans:check hanya membaca pengguna dan meminta status provider. Ia tidak membuat pembayaran, menagih, mengembalikan dana, atau mengubah tabel. Bila pemeriksaan konfigurasi gagal, proses berhenti sebelum query MySQL dan panggilan provider. Restart server setelah perubahan .env.

Paket unduhan memakai .env.example; .env pribadi tidak disertakan.

## Pengujian Postman

Import ulang kedua JSON dalam folder postman. Pilih environment Asisten Keuangan Local. Untuk request nomor 20, isi:

| Variabel Postman | Nilai |
|---|---|
| baseUrl | http://localhost:3001, atau port API yang digunakan |
| midtransUserId | ID user database yang memiliki pemetaan order |
| midtransOrderId | Order ID asli yang dipetakan ke user tersebut |
| subscriptionExpectedStatus | 200 untuk menguji pengambilan status sukses |

Request yang dijalankan:

```http
GET {{baseUrl}}/api/v1/users/{{subscriptionUserId}}/subscription-status
```

Pre-request script mengisi subscriptionUserId dari midtransUserId. Pengujian sukses memeriksa ID profil, ID order, status pembayaran, dan field rahasia yang tidak boleh muncul.

Default subscriptionExpectedStatus=503 hanya menguji kondisi konfigurasi Midtrans belum siap. Kelulusan pada kondisi tersebut bukan bukti koneksi berhasil ke Midtrans. Status pembayaran pending, deny, atau expire tetap dapat dikembalikan lewat HTTP 200 karena proses membaca statusnya berhasil; hal itu tidak berarti pembayaran lunas.

## Arti respons gagal

| HTTP aplikasi | Kondisi |
|---|---|
| 400 | ID user tidak valid. |
| 404 | User tidak ditemukan/sudah soft delete, atau order belum ditemukan di Midtrans. |
| 503 | Key/environment/pemetaan belum siap, atau database tidak dapat dihubungi; baca pesan respons untuk membedakannya. |
| 502 | Autentikasi provider ditolak, koneksi/provider gagal, payload tidak valid, atau identitas order tidak cocok. |
| 504 | Provider melewati timeout. |

Autentikasi provider gagal menghasilkan 502 karena yang ditolak adalah kredensial server ke provider. Ini tidak diperlakukan sebagai kegagalan login pengguna aplikasi.

## Hasil pengujian dan batas bukti

- Sebelum perubahan, 17 tes pada ZIP unggahan lulus dengan simulasi.
- Setelah perubahan, 24 tes kode lulus, termasuk pemetaan dua user, isolasi order, validasi konfigurasi, identitas respons, soft delete, timeout, error HTTP/JSON, dan field sensitif.
- Koleksi lengkap: 52 request dan 128 assertion lulus dengan database simulasi; integrasi provider default menguji 503.
- Request Midtrans pada jalur HTTP 200: 1 request dan 5 assertion lulus dengan database serta provider simulasi.
- Pemeriksaan menggunakan .env unggahan berhenti dengan 503 karena MIDTRANS_SERVER_KEY belum tersedia. Tidak ada panggilan sukses ke provider asli yang direkam.

Pemetaan environment merupakan konfigurasi prototipe yang harus diisi operator dengan benar; ini bukan bukti kepemilikan otomatis dari Midtrans. Nama endpoint dan field info_langganan dipertahankan, tetapi yang dibaca adalah status pembayaran suatu order. Proyek belum mengelola pembuatan order, webhook, periode/aktivasi langganan, tabel riwayat pembayaran, maupun autentikasi pengguna. Status capture atau settlement tidak otomatis mengaktifkan langganan.

## Referensi resmi

- [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status)
- [API Authorization and Headers](https://docs.midtrans.com/docs/api-authorization-headers)
- [GET Status API Requests](https://docs.midtrans.com/docs/get-status-api-requests)
- [Transaction Status](https://docs.midtrans.com/reference/transaction-status)
- [API Host URL](https://docs.midtrans.com/reference/api-host-url-2)
