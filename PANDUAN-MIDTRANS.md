# Menyiapkan checkout Midtrans Sandbox

Paket ini memperbaiki host Snap yang sebelumnya salah. Snap memakai app.sandbox.midtrans.com (sandbox) / app.midtrans.com (production). Inquiry status Core tetap memakai api.sandbox.midtrans.com / api.midtrans.com. Judul checkout dan pesan order juga diperbarui agar tidak lagi mengklaim pembayaran belum tersedia.

## 1. Kredensial sandbox

Login dashboard Midtrans Anda, pastikan mode Sandbox, lalu Settings > Access Keys. Salin Server Key sandbox hanya ke js/.env di komputer Anda. Jangan kirim key ke chat, screenshot, browser JavaScript atau repository.

```dotenv
MIDTRANS_ENVIRONMENT=sandbox
MIDTRANS_SERVER_KEY=ISI_SERVER_KEY_SANDBOX_ANDA
MIDTRANS_FINISH_URL=http://127.0.0.1:8000/app/token-purchases
```

Baris ISI_SERVER_KEY_SANDBOX_ANDA adalah placeholder; wajib diganti nilai yang benar dari dashboard (prefix sandbox SB-Mid-server-). Alur redirect yang digunakan proyek tidak memerlukan Client Key di frontend. MIDTRANS_ORDER_IDS adalah mapping prototipe untuk endpoint subscription-status lama; tidak diperlukan untuk checkout order token.

Restart backend setelah mengubah .env. Jalankan MySQL, backend Node di port 3001 dan Laravel di port 8000 seperti panduan utama. Pakai alamat 127.0.0.1:8000 secara konsisten agar session login tetap sama.

## 2. Membuka checkout

Login aplikasi → Paket token → Beli paket → Detail order → Status checkout → Bayar dengan Midtrans Sandbox.

Gunakan paket dengan harga Rupiah bulat untuk pengujian awal. Uji melalui sandbox, bukan uang atau kartu nyata. Bila muncul konfigurasi belum valid (503), periksa .env yang dibaca proses Node dan restart. Bila autentikasi ditolak (502), pastikan Server Key dan environment sesuai. Bila order sudah pernah dikirim ke provider lalu proses terputus, simpan order ID/pesan error; jangan mengubah status menjadi paid lewat SQL. Jangan membuat replay pembayaran otomatis setelah timeout tanpa memeriksa status provider.

## 3. Agar pembayaran menambah token

Membuka checkout dan menerima webhook adalah dua tahap berbeda. Midtrans tidak dapat mengirim webhook ke localhost/127.0.0.1 komputer Anda. Endpoint backend harus dapat diakses dari internet, misalnya melalui tunnel HTTPS development yang Anda siapkan.

Jika ngrok sudah terpasang dan dikonfigurasi:

```powershell
ngrok http 3001
```

Pada dashboard Sandbox, Settings > Configuration, atur Payment Notification URL ke URL HTTPS tunnel Anda dengan path:

```text
https://DOMAIN-TUNNEL-ANDA/api/v1/payments/midtrans/notifications
```

Ganti domain contoh dengan domain tunnel yang benar. Tunnel diarahkan ke Node port 3001, bukan Laravel port 8000. Ketika domain tunnel berubah, perbarui pengaturan Midtrans. Route webhook proyek memang berada sebelum middleware JWT; keasliannya diperiksa menggunakan signature Midtrans. Jangan menambahkan middleware login aplikasi ke route tersebut.

Finish Redirect URL hanya mengembalikan browser ke aplikasi. Redirect/halaman sukses tidak boleh dijadikan bukti pembayaran untuk menambah saldo. Token hanya dikreditkan sesudah notifikasi pembayaran valid, nominal/mata uang cocok dan status pembayaran memenuhi aturan. Ledger purchase mencegah kredit ulang. Periksa status order dan wallet setelah notifikasi diterima.

## 4. Diagnosis berdasarkan tahap

| Gejala | Yang diperiksa |
|---|---|
| Tidak ada paket | Seed katalog opt-in npm run db:seed:tokens atau buat paket dari admin |
| Gagal sebelum checkout | Pesan error aplikasi, terminal Node, Server Key sandbox dan environment |
| Checkout terbuka, pembayaran belum selesai | Metode dan simulasi pembayaran sandbox sesuai panduan Midtrans |
| Provider sudah paid, order aplikasi pending | Payment Notification URL, tunnel aktif, status notifikasi dashboard dan respons endpoint |
| Order paid, token tidak bertambah | Ledger order, proses webhook dan log error DB; jangan kredit manual sebelum audit |
| 400 webhook | Payload wajib, format/signature, kecocokan snapshot nominal/mata uang |
| 401 webhook | Server Key penandatangan/signature atau environment tidak cocok |

## 5. Hasil verifikasi paket

npm test: 46 lulus, 0 gagal, 4 dilewati. Tes regresi Snap memverifikasi URL sandbox/production, header Basic Auth dan snapshot order, memakai mock provider. Ini belum merupakan bukti pembayaran Midtrans nyata. Tes MySQL dan Laravel/browser belum dijalankan karena runtime tersebut tidak tersedia di lingkungan pengerjaan. Uji end-to-end tetap membutuhkan key sandbox Anda dan URL webhook publik.

Sumber resmi:
- https://docs.midtrans.com/reference/backend-integration
- https://docs.midtrans.com/docs/https-notification-webhooks
