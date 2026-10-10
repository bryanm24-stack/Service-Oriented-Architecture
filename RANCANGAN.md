# Rancangan Asisten Keuangan — perbaikan nomor 4 dan 5

## Cakupan dan status

Implementasi ini menghubungkan Users, Categories, Transactions, dan endpoint konversi kurs. Endpoint materi Buku, Contoh, serta ContohAxios dipertahankan. File Budgets dari unggahan tetap ada tetapi belum terdaftar sebagai endpoint aktif; penyelesaian modul tersebut berada di luar paket nomor 4–5 ini. Jangan menganggap seluruh soal UTS sudah selesai.

Kontrol akses di bawah adalah **rancangan**, sesuai pembahasan nomor 4. Kode belum menerapkan login, JWT, pemeriksaan peran, atau pembatasan pemilik data. Endpoint lokal masih dapat dipanggil tanpa autentikasi. Hash password tidak sama dengan autentikasi maupun otorisasi.

## Nomor 4 — validasi dan perlindungan data

POST/PUT/PATCH yang aktif memakai Joi: Users, Categories, Transactions, Buku, contoh body, demo validasi user, dan webhook. Helper memakai `abortEarly: false`, sehingga semua kesalahan dilaporkan sekaligus. Pesan menyebut field dan menggunakan bahasa Indonesia. Resource utama menolak field asing; Buku serta demo schema memakai `stripUnknown: true`, lalu hanya menggunakan `value` hasil validasi. PATCH resource utama menolak body kosong. Endpoint Transactions menyediakan PATCH, bukan PUT; metode yang tidak tersedia mendapat 405 dan header Allow.

SQL raw memakai replacements untuk nilai dan daftar pilihan sorting yang dibatasi Joi. Model menggunakan satu instance Sequelize. Foreign key menghubungkan `transactions.id_user` ke `users.id` serta `transactions.id_category` ke `categories.id`. Kategori yang masih terpakai ditolak dengan 409. User dihapus secara soft delete sehingga transaksi historis tetap tersimpan.

Password pada create/update Users di-hash memakai scrypt dengan salt acak. Password dan hash tidak dikirim pada respons. Seed user pada SQL menggunakan hash untuk password demo `Password123!`; ini akun latihan, bukan kredensial produksi. Password plaintext yang sudah tersimpan di database lama tidak otomatis dikonversi: perubahan password melalui PUT/PATCH akan menghasilkan hash baru. Belum ada fitur login.

Error handler menyaring error sebelum dikirim: validasi 400, data hilang 404, konflik 409, database tidak tersedia 503, dan error internal generik 500. SQL, nama tabel, stack trace, konfigurasi Axios, URL yang memuat key, dan payload upstream tidak diteruskan kepada client. SQL logging dinonaktifkan secara default.

## Matriks peran × endpoint (rancangan, belum diberlakukan)

Semua jalur diawali `/api/v1`.

| Endpoint | Admin | Pengguna terautentikasi | Tamu |
|---|---|---|---|
| GET /users | Daftar semua user | Ditolak | Ditolak |
| POST /users | Membuat akun | Ditolak | Ditolak |
| GET /users/:id | Semua akun | Akun sendiri | Ditolak |
| PUT/PATCH /users/:id | Semua akun | Akun sendiri | Ditolak |
| DELETE /users/:id | Menghapus secara soft delete | Ditolak | Ditolak |
| GET /categories dan /categories/:id | Boleh | Boleh | Ditolak |
| POST /categories | Boleh | Ditolak | Ditolak |
| PATCH/DELETE /categories/:id | Boleh | Ditolak | Ditolak |
| GET /transactions (termasuk mode=raw) | Semua transaksi | Transaksi sendiri | Ditolak |
| POST /transactions | Boleh, pemilik harus valid | Pemilik diambil dari sesi sendiri | Ditolak |
| PATCH/DELETE /transactions/:id | Semua transaksi | Transaksi sendiri | Ditolak |
| GET /categories/:id/transactions | Semua transaksi kategori | Transaksi sendiri dalam kategori | Ditolak |
| GET /transactions/:id/conversion | Semua transaksi | Transaksi sendiri | Ditolak |
| Semua endpoint /buku, /contoh, /contohAxios | Khusus lingkungan latihan | Ditolak | Ditolak |

Rancangan Admin menjaga pengelolaan akun dan kategori tetap terpusat. Perubahan atau penghapusan data perlu audit identitas admin, waktu, dan ID resource. Rancangan Pengguna melindungi catatan keuangan pribadi: setiap pencarian, perubahan, dan penghapusan harus memeriksa `id_user` milik identitas terverifikasi. Jangan mempercayai `id_user` atau `role` dari body sebagai bukti hak akses. Endpoint nested kategori, raw query, dan konversi kurs wajib mendapat filter kepemilikan yang sama. Tamu tidak boleh membaca data keuangan, email, ataupun memicu penggunaan kuota API.

Implementasi lanjutan memerlukan middleware autentikasi, middleware peran, dan pemeriksaan kepemilikan pada controller/query. Untuk pengguna biasa, isi `id_user` dari identitas terverifikasi. Jangan memakai header buatan sendiri seperti `X-Role: admin` sebagai autentikasi. Endpoint latihan dibatasi lingkungan pengembangan atau akses admin.

## Kredensial lokal dan cloud

Kredensial MySQL, `EXCHANGE_RATE_API_KEY`, dan URL webhook hanya di `.env`. `.gitignore` mengabaikan `.env` dan turunannya, kecuali `.env.example` yang berisi placeholder. `.gitignore` tidak menghapus file yang sudah pernah terlacak: periksa `git ls-files .env`; jika muncul, jalankan `git rm --cached .env` untuk melepasnya dari indeks tanpa menghapus file lokal. Riwayat commit belum diperiksa dalam paket ini. Jika kredensial asli pernah tersebar, ganti kredensial tersebut.

Saat dipasang di cloud, konfigurasi rahasia dipindahkan dari file `.env` lokal ke secret manager atau environment secret platform. Beri akses hanya pada identitas layanan yang membutuhkannya; pisahkan kredensial development dan production, gunakan akun database dengan hak minimum, rotasi key, dan jangan menaruhnya dalam repository, image build, respons, maupun log. Aktifkan TLS untuk akses aplikasi dan koneksi database sesuai konfigurasi penyedia.

## Nomor 5 — menggabungkan database dan API

Endpoint:

```http
GET /api/v1/transactions/:id/conversion?currency=USD
```

Mata uang asal nominal transaksi adalah IDR. Target yang diterima: USD, EUR, SGD, JPY, IDR. Default USD. Sistem mengambil transaksi beserta user dan kategori menggunakan eager loading, lalu meminta kurs IDR melalui Axios ke Standard endpoint ExchangeRate-API. API key dibaca dari environment. URL upstream bersifat tetap; client tidak boleh mengirim URL upstream atau API key lewat query.

API key memang ditempatkan dalam jalur URL sesuai kontrak provider. Karena itu, kode tidak mencetak URL, `error.config`, atau error Axios mentah. Timeout dan AbortSignal membatasi waktu tunggu, redirect dinonaktifkan, serta ukuran respons dibatasi.

Respons milik aplikasi hanya berisi `data.transaction` dari MySQL dan `data.conversion` hasil pemetaan provider. Field provider dipilih dan diganti namanya: `base_code` menjadi `base_currency`, mata uang yang diminta menjadi `target_currency`, satu nilai `conversion_rates` menjadi `rate`, dan `time_last_update_unix` menjadi `updated_at`. Payload provider lengkap tidak diteruskan.

`estimated_amount` adalah estimasi tampilan dengan dua angka desimal, bukan nominal untuk pembukuan, tagihan, atau settlement. Timestamp menunjukkan waktu pembaruan kurs provider, bukan waktu pembuatan transaksi. Nominal asli tetap dikembalikan sebagai string dan tidak diubah di database. Tidak ada klaim kurs real-time atau kurs historis transaksi. Penambahan konversi memenuhi kebutuhan menampilkan perkiraan biaya transaksi dalam mata uang lain.

| Kondisi | Respons |
|---|---|
| ID/query tidak valid | 400, sebelum memanggil provider |
| Transaksi tidak ditemukan | 404, sebelum memanggil provider |
| API key belum diisi | 503 |
| Timeout atau batas AbortSignal tercapai | 504 |
| Network error / non-2xx provider, termasuk 429 | 502 |
| Provider mengembalikan `result: error`, rate hilang, atau payload tidak valid | 502 |
| Kesalahan kode/configuration internal | 500 generik |

Tidak ada fallback kurs dan tidak memakai angka kurs palsu ketika provider gagal. Operasi CRUD transaksi tetap terpisah dari endpoint kurs; kegagalan kurs tidak mengubah data transaksi. Kegagalan webhook memakai kebijakan berbeda: notifikasi bersifat tambahan sehingga tidak menggagalkan penyimpanan Buku. Endpoint uji webhook mengembalikan `notification.sent` serta alasan kegagalan generik, tanpa mengaku terkirim jika gagal.

## Verifikasi

`npm test` menjalankan lima kelompok uji: CRUD dan hubungan resource; model/relasi/SQL; HTTP validasi dan integrasi API; request Axios ke server lokal; dan hash password. Terdapat 49 pemeriksaan HTTP CRUD dan 27 pemeriksaan HTTP tambahan. Pengujian memakai stub database, adapter Axios untuk skenario provider, serta server HTTP lokal untuk memastikan penanganan status dan timeout sungguhan. Semua lulus pada lingkungan penyusunan. Pengujian MySQL nyata, API provider dengan key asli, pengiriman Discord sungguhan, serta kontrol akses berbasis identitas belum dilakukan.

## Referensi implementasi

- [ExchangeRate-API Standard Requests](https://www.exchangerate-api.com/docs/standard-requests)
- [Axios Handling Errors](https://axios-http.com/docs/handling_errors)
