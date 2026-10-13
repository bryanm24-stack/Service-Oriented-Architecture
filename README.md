# Paket terintegrasi Users, Categories, Transactions, dan Budget

Baca [MULAI-DI-SINI.md](MULAI-DI-SINI.md). Jalankan `npm run db:migrate`, lalu `npm start`. SQL aktif adalah `sql/Gabungan.sql`. Dokumentasi materi di bawah tetap dipertahankan.

# SOA Minggu 6 — 3rd Party API dengan Axios

Starter praktikum Mata Kuliah Arsitektur Berbasis Layanan (SOA)
S1 Sistem Informasi Bisnis — ISTTS

Lanjutan dari Minggu 5: endpoint buku tidak berubah. Yang baru — service
kita menjadi **client**: memanggil API pihak ketiga (Kitsu) dengan
axios, meresponse-nya sesuai kontrak sendiri, dan gagal dengan sopan saat
upstream gagal. Butuh **koneksi internet** untuk endpoint baru ini.

## Menjalankan

```bash
npm install
cp .env.example .env        # sesuaikan kredensial MySQL
npm run db:migrate          # buat database sesuai DB_NAME, tabel, data awal
npm run dev
```

Buka http://localhost:3001

## Menguji

Impor `postman/SOA-Minggu6.postman_collection.json` dan
`postman/local.postman_environment.json`, pilih environment `local`,
jalankan Runner.

```bash
npx newman run postman/SOA-Minggu6.postman_collection.json \
  -e postman/local.postman_environment.json
```

Folder lama hijau seperti Minggu 5; folder baru **5 - ContohAxios**
butuh internet (upstream Kitsu).

## Daftar endpoint

Endpoint buku sama persis dengan Minggu 5; yang baru ditandai:

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/contoh` | req.query + jebakan tipe string |
| POST | `/api/v1/contoh` | req.body |
| GET | `/api/v1/contoh/array-function` | review map/find/filter/reduce |
| POST | `/api/v1/contoh/validasi` | demo Joi — userSchema (Minggu 5) |
| GET | `/api/v1/contoh/:nama/umur/:umur/jk/:jk?` | req.params, parameter opsional |
| PUT, POST | `/api/v1/contoh/gabungan/:id` | ketiga sumber input sekaligus |
| GET | `/api/v1/buku` | keyword, kategori, sort, order, limit, offset |
| POST | `/api/v1/buku` | 201 + header Location (+ webhook notifikasi) |
| GET | `/api/v1/buku/statistik` | agregat — perhatikan urutan route |
| GET | `/api/v1/buku/:bukuId` | 404 kalau tidak ada |
| PUT | `/api/v1/buku/:bukuId` | ganti seluruhnya |
| PATCH | `/api/v1/buku/:bukuId` | ubah sebagian |
| DELETE | `/api/v1/buku/:bukuId` | hapus |
| GET | `/api/v1/buku/:bukuId/karakter/:karakterId?` | nested resource |
| **GET** | **`/api/v1/contohAxios?q=jojo&limit=3`** | **cari anime via Kitsu (Minggu 6)** |
| **POST** | **`/api/v1/contohAxios/webhook`** | **latihan webhook — `{ pesan }` (Minggu 6)** |

Method lain pada path di atas menghasilkan **405** beserta header `Allow`.

## Panduan lengkap

Baca **[PANDUAN.md](PANDUAN.md)** — service sebagai client, reshape kontrak,
null-safe mapping, `timeout`, peta gagal `504/502/429/500`, rahasia di
`.env`, dan webhook yang tidak boleh menggagalkan operasi utama.

Latihan dan tugas yang dikumpulkan ada di **[TUGAS.md](TUGAS.md)**.

## Catatan versi

- Node 24 LTS · Express 4 · Sequelize 6 · Joi 17 — sama seperti sebelumnya.
- **Axios 1** — klien HTTP untuk panggilan keluar. Satu-satunya dependensi
  baru minggu ini.
- Upstream contoh: `kitsu.io/api/edge` (tanpa key, ideal untuk belajar).
  Di project kalian nanti: API dengan key, agar latihan pengelolaan
  rahasianya nyata.
