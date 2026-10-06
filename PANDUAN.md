# PANDUAN PRAKTIKUM MINGGU 6

## 3rd Party API dengan Axios

Mata Kuliah Arsitektur Berbasis Layanan (SOA) · S1 Sistem Informasi Bisnis, ISTTS

---

Lima minggu ini service kita hanya MELAYANI. Minggu ini ia juga MENGINJAK —
memanggil API orang lain (Kitsu). Itu mengubah sesuatu yang fundamental:
sekarang ada dependensi yang tidak kita kendalikan, tidak bisa kita
perbaiki, dan tidak bisa kita percepat. Endpoint buku tidak berubah; yang
baru adalah resource `contohAxios` (client) dan notifikasi webhook.

## Daftar Isi

1. [Menjalankan project](#1-menjalankan-project)
2. [Service sebagai client](#2-service-sebagai-client)
3. [Reshape: kontrak milik kita](#3-reshape-kontrak-milik-kita)
4. [Null-safe: data yang bukan buatan kita](#4-null-safe-data-yang-bukan-buatan-kita)
5. [Timeout: jangan pernah menunggu selamanya](#5-timeout-jangan-pernah-menunggu-selamanya)
6. [Gagal dengan sopan: 504, 502, 429, 500](#6-gagal-dengan-sopan-504-502-429-500)
7. [Rahasia di .env](#7-rahasia-di-env)
8. [Webhook: notifikasi yang tidak boleh menggagalkan](#8-webhook-notifikasi-yang-tidak-boleh-menggagalkan)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Menjalankan project

Prasyarat sama seperti Minggu 5 — **plus koneksi internet** (folder
ContohAxios memanggil Kitsu).

```bash
npm install
cp .env.example .env        # sesuaikan kredensial MySQL
npm run db:migrate          # buat database soa_minggu6, tabel, data awal
npm run dev                 # http://localhost:3001
```

## Menguji

Impor `postman/SOA-Minggu6.postman_collection.json` +
`postman/local.postman_environment.json`, pilih environment `local`, jalankan
Runner. Selain koleksi lama, ada folder **5 - ContohAxios (Minggu 6)**.

```bash
npx newman run postman/SOA-Minggu6.postman_collection.json \
  -e postman/local.postman_environment.json
```

Endpoint baru:

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/contohAxios?q=jojo&limit=3` | cari anime via Kitsu |
| GET | `/api/v1/contohAxios?limit=3` (tanpa q) | anime paling populer |
| POST | `/api/v1/contohAxios/webhook` | latihan webhook `{ pesan }` |

## 2. Service sebagai client

Bandingkan dua arah di project ini:

| | Sebelum Minggu 6 | Mulai Minggu 6 |
|---|---|---|
| Kita adalah | server | server **dan** client |
| Yang kita kendalikan | semuanya | kualitas & ketersediaan upstream |
| Yang rusak kalau upstream rusak | — | endpoint kita |

Inilah alasan endpoint `contohAxios` punya penanganan error yang berbeda
dari `buku`: di `buku`, semua kegagalan adalah salah kita atau salah client.
Di `contohAxios`, ada pihak ketiga yang bisa gagal sendirian.

## 3. Reshape: kontrak milik kita

Kitsu mengembalikan puluhan field per anime (format JSON:API:
`data[i].attributes`). Controller TIDAK meneruskan mentah — dia memetakan
ke delapan field yang KITA pilih (`KONTRAK_ANIME` di
`controllers/contohAxios.js`):

```js
const petakanKeKontrak = (item) => ({
  mal_id: item.id,
  title: item.attributes?.canonicalTitle ?? null,
  trailer: item.attributes?.youtubeVideoId
    ? `https://youtu.be/${item.attributes.youtubeVideoId}`
    : null, // lihat bagian 4
  // ... delapan field, tidak lebih
});
```

Perhatikan juga `susunParams()`: consumer mengirim `?q=` dan `?limit=` —
nama milik KITA. Nama parameter upstream (`filter[text]`, `page[limit]`)
disembunyikan di dalam controller. Kalau upstream mengganti nama
parameternya, consumer TIDAK ikut rusak — prinsip yang sama dengan
pertahanan mass assignment, tapi untuk query string.

Ini kerja arsitektur sungguhan, bukan kerapian:

- Consumer kita HANYA bergantung pada delapan field itu. Mereka tidak akan
  pernah menyentuh field yang tidak kita janjikan.
- Kalau Kitsu mengubah payload-nya besok, yang kita perbaiki SATU fungsi
  di satu file. Consumer tidak tahu dan tidak peduli.
- Test Postman **payload upstream tidak bocor** menegakkan kontrak ini —
  test itu merah suatu hari kalau ada yang meneruskan response mentah.

Aturan jangka panjangnya: **responsenya bentuk KITA, bukan bentuk
upstream.** Nanti di project, aturan ini yang membuat API kalian bukan
sekadar passthrough.

## 4. Null-safe: data yang bukan buatan kita

Tidak semua anime punya trailer. Baris ini yang menyelamatkan:

```js
trailer: item.trailer?.url ?? null,
```

Tanpa `?.`, satu anime tanpa trailer = `Cannot read property 'url' of null`
= satu endpoint yang 500 untuk data yang bukan salah kita. Data dari
pihak ketiga TIDAK PERNAH boleh diasumsikan lengkap — optional chaining
(`?.`) dan nullish coalescing (`?? null`) adalah kebiasaan wajib di
setiap pemetaan.

## 5. Timeout: jangan pernah menunggu selamanya

```js
await axios.get(UPSTREAM, { params: req.query, timeout: 5000 });
```

Tanpa `timeout`, axios menunggu SELAMANYA. Upstream yang menggantung
memegang request kalian terbuka — dan cukup banyak request menggantung,
service kalian berhenti menjawab siapa pun. Outage yang bukan salah kalian,
tapi yang kalian tanggung. Satu baris mencegah semuanya. Latihan 3
membuktikan apa yang terjadi tanpanya.

## 6. Gagal dengan sopan: 504, 502, 429, 500

Empat situasi, empat status berbeda — lihat catch di
`controllers/contohAxios.js`:

| Situasi | Status | Artinya |
|---|---|---|
| Upstream tidak menjawab sampai timeout | `504` | Gateway Timeout — tidak ada yang menjawab tepat waktu |
| Upstream menjawab dengan error (4xx/5xx) | `502` | Bad Gateway — upstream yang gagal |
| Upstream melarang kita (`429`) | `429` | diteruskan — consumer harus pelan |
| Bug kita sendiri | `500` | pesan generik, detail di log |

Ini kelanjutan aturan Minggu 1 (`4xx = salah client, 5xx = salah server`),
dunia yang lebih lebar: sekarang ada `5xx` yang BUKAN salah kode kalian —
dan status yang tepat memberi tahu consumer ke mana harus melihat.

## 7. Rahasia di .env

Kalau API pihak ketiga kalian butuh key, tempatnya `.env` — pola yang sama
sejak Minggu 3:

```ini
API_KEY_CUACA=abcdef123456        # .env — TIDAK masuk git
API_KEY_CUACA=isi_api_key_anda    # .env.example — placeholder
```

```js
headers: { "X-API-Key": process.env.API_KEY_CUACA }
```

Key yang pernah di-commit adalah key yang harus kalian ganti — public
repo dipindai bot terus-menerus, dan menghapus file tidak menghapus
riwayat git. Sebelum commit minggu ini:

```bash
git diff --cached | grep -iE "api[_-]?key|token|secret|webhook"
# harus kosong
```

## 8. Webhook: notifikasi yang tidak boleh menggagalkan

Webhook = POST keluar **tanpa response yang ditunggu**. Lihat
`src/utils/notifikasi.js` dan pemakaiannya di `storeBuku()`:

```js
// sengaja TIDAK di-await -- 201 tidak menunggu Discord
kirimNotifikasi(`Buku baru ditambahkan: ${bukuBaru.judul}`);
```

Dua keputusan desain di helper itu:

1. **Catch-nya sengaja tidak melakukan apa-apa** selain log. Buku yang
   berhasil dibuat tetap ada walau Discord sedang down. Menyeret kegagalan
   notifikasi ke dalam operasi utama adalah bug yang nyata dan sering —
   putuskan secara sadar kegagalan mana yang penting.
2. **`DISCORD_WEBHOOK_URL` kosong = dilewati diam-diam**, bukan error.
   Endpoint tetap jalan untuk semua mahasiswa tanpa Discord.

Cara mencobanya (Latihan 5): buat channel Discord → ikon gear →
Integrations → Webhooks → New Webhook → copy URL → isi di `.env` → kirim
`POST /api/v1/contohAxios/webhook`. Lalu **rusak URL-nya** dan kirim lagi:
response tetap `200`. Discord membalas `204 No Content` saat sukses —
jangan salah paham itu kegagalan.

## 9. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `Cannot read property 'data' of undefined` | bentuk upstream bukan yang diasumsikan | `console.log(perintah.data)` dulu, baru mapping |
| `ECONNREFUSED` / `ENOTFOUND` | salah URL atau tidak ada internet | tes URL-nya langsung di Postman |
| `429` saat latihan | rate limit upstream | jeda beberapa detik — ini persis yang kalian buat Minggu 8; simulasi deterministik ada di TUGAS Latihan 7 |
| Request menggantung lama | tidak ada `timeout` | `timeout: 5000` |
| `key works in Postman, fails in code` | key dikirim sebagai param, harusnya header (atau sebaliknya) | ikut dokumentasi upstream persis |
| `error.response` undefined | request tidak pernah sampai | cek `error.code` dulu, baru `error.response` |
| Webhook "gagal" padahal berhasil | `204 No Content` = sukses | baca dokumentasi — 204 adalah sukses tanpa isi |
| Folder ContohAxios merah di Runner | tidak ada internet / upstream down | jalankan folder lain; upstream memang bisa gagal — itulah pelajarannya. Untuk latihan tanpa internet, pakai `UPSTREAM_ANIME` yang menunjuk ke mock lokal (TUGAS Latihan 7) |

---

Latihan dan tugas yang dikumpulkan ada di file terpisah: [TUGAS.md](TUGAS.md).
