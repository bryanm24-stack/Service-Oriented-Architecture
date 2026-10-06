# TUGAS PRAKTIKUM MINGGU 6

Mata Kuliah Arsitektur Berbasis Layanan (SOA) · S1 Sistem Informasi Bisnis, ISTTS

Dua bagian: **Latihan** (melatih satu konsep kecil dari bacaan di
[PANDUAN.md](PANDUAN.md)) dan **Tugas** (menguji semuanya sekaligus).
Nomor Latihan 2 dan 8 ditulis jawabannya di `LATIHAN.md`; nomor lainnya
cukup dikerjakan langsung, tidak perlu ditulis ulang.

---

## Latihan

### Latihan 1 — Rasakan bug-nya

Lakukan EMPAT hal berikut satu per satu di `controllers/contohAxios.js`,
catat perilakunya, kembalikan semua perubahan:

1. Hapus `timeout: 5000`. (Jangan tunggu selamanya — batalkan dengan
   Ctrl+C setelah ~10 detik.) Cari upstream yang lambat, misalnya
   `https://httpstat.us/200?sleep=20000` sementara. Kenapa service
   "sehat" tapi request menggantung?
2. Hapus `?.` pada trailer (`item.trailer.url`). Cari anime yang tidak
   punya trailer (coba `q=berserk`). Apa status code yang muncul — dan
   apakah itu jujur?
3. Ganti `petakanKeKontrak` menjadi `return res.status(200).json(perintah.data.data)`
   (teruskan mentah). Jalankan test Postman **Kontrak field dipatuhi**.
   Test mana yang merah — dan mengapa test itu dibuat?
4. Hapus `await` pada `axios.get` (panggil tanpa await). Apa yang
   dikembalikan endpoint? Kaitkan dengan Minggu 1.

### Latihan 2 — Kontrak eksplisit, bukan passthrough

Starter ini SUDAH memisahkan nama parameter kita (`q`, `limit`, `page`)
dari nama parameter upstream (`filter[text]`, `page[limit]`) lewat
`susunParams()`. Tugas kalian di latihan ini: tambahkan DUA parameter baru
milik kalian sendiri — misalnya `?min_episode=` (filter sisi server: buang
item dengan episode di bawah nilai itu, TANPA bertanya ke upstream lagi)
dan `?urutkan=judul|rating` (urutkan hasil di controller). Upstream tidak
perlu tahu keduanya ada.

**Tulis di `LATIHAN.md`:** satu paragraf — kenapa nama parameter consumer
harus berbeda dari nama parameter upstream? (petunjuk: kalau Kitsu mengganti
nama parameternya, siapa yang rusak — dan berapa file yang berubah?)

### Latihan 3 — 504, dibuktikan

Set `timeout: 1` (1 ms) sementara di controller, panggil endpoint. Catat
status code dan pesannya. Kembalikan ke 5000. Satu kalimat: kenapa ini
`504` dan bukan `500`?

### Latihan 4 — 502, dibuktikan

Ganti `UPSTREAM` sementara menjadi `https://kitsu.io/api/edge/endpoint-salah`.
Panggil endpoint. Catat status code dan pesannya. Kembalikan. Satu kalimat:
kenapa `502` dan bukan `404` — siapa yang sebenarnya salah?

### Latihan 5 — Webhook yang tidak boleh menggagalkan

1. Buat server Discord pribadi → channel → ikon gear → Integrations →
   Webhooks → New Webhook → Copy Webhook URL.
2. Isi `DISCORD_WEBHOOK_URL` di `.env` (restart `npm run dev`).
3. `POST /api/v1/contohAxios/webhook` dengan `{ "pesan": "tes" }` —
   pesan muncul di Discord.
4. Rusak URL-nya (tambah satu huruf acak di token), kirim lagi:
   response tetap **200**, error hanya di log terminal.
5. POST buku baru di `/api/v1/buku` — notifikasi ikut terkirim tanpa
   mengubah bentuk response 201.

Jalankan test Postman **Webhook - kirim pesan** dengan URL rusak untuk
melihat assertion-nya tetap hijau.

### Latihan 6 — API dengan key (untuk yang ingin lebih)

Pilih satu API gratis yang pakai key (OpenWeatherMap, TMDB, RajaOngkir
starter, dsb). Tambahkan endpoint kedua di `contohAxios` yang memanggilnya
dengan `headers: { Authorization: ... }` atau `X-API-Key` — nilainya dari
`.env` dengan placeholder di `.env.example`. Pastikan:

```bash
git diff --cached | grep -iE "api[_-]?key|token|secret"
# kosong
```

### Latihan 7 — Menelusuri jalur 429, secara deterministik

Menunggu upstream asli mengirim 429 itu belum tentu mungkin (limit Kitsu
longgar). Jadikan deterministik dengan mock lokal:

```bash
node -e "require('http').createServer((q,s)=>{s.writeHead(429);s.end('limit')}).listen(4599)"
```

Lalu di `.env`: `UPSTREAM_ANIME=http://localhost:4599`, restart, dan
panggil endpoint. Catat status code yang diterima consumer dan pesannya.
Kembalikan `.env`. Minggu 8 kalian ada di sisi sebaliknya — catat bagaimana
RASA-nya menjadi client yang kena limit, dan kenapa response 429 kita
menyertakan pesan (ide: header `Retry-After`, dipakai lagi Minggu 8).

### Latihan 8 — Refleksi

Tulis jawabannya di `LATIHAN.md`:

1. Delapan field kontrak kita dibatasi sadar. Kalau besok ada consumer
   minta field `studios`, apa yang harus berubah — dan apa yang TIDAK
   boleh berubah?
2. Kenapa kegagalan webhook sengaja "ditelan diam-diam" sedangkan
   kegagalan upstream Kitsu dilaporkan dengan 502/504? Kapan menelan
   error itu salah?
3. `timeout` mencegah outage yang bukan salah kita. Contoh nyata lain
   di mana "salah orang lain tapi tetap tanggung"?
4. Satu hal dari minggu ini yang menurut kalian berlebihan untuk project
   sekecil ini — dan alasannya. (Jawaban jujur bernilai lebih dari
   jawaban sopan.)

---

## Tugas yang dikumpulkan

**Integrasikan API pihak ketiga ke studi kasus rental.** Backend rental
kendaraan (Minggu 3-5) kini punya dependensi keluar yang masuk akal
secara bisnis — bukan passthrough.

Pilih SATU integrasi yang cocok dengan studi kasus kalian, contoh:

| Kebutuhan bisnis | API yang mungkin |
|---|---|
| Alamat pelanggan → koordinat untuk area antar | Nominatim/OpenStreetMap, Google Geocoding |
| Estimasi biaya kirim ke lokasi penyewaan | RajaOngkir (starter), Distance Matrix |
| Kurs untuk tarif kendaraan premium | exchangerate-api, frankfurter.app |
| Notifikasi owner saat ada transaksi baru | Discord webhook (sudah disiapkan di starter) |

Persyaratan:

- [ ] Minimal satu endpoint baru di resource rental kalian yang memanggil
      API pihak ketiga lewat axios — dengan `timeout` eksplisit.
- [ ] Response endpoint adalah KONTRAK kalian sendiri (field dipilih,
      payload upstream tidak diteruskan mentah) — diproteksi oleh test
      Postman yang menegakkan daftar field.
- [ ] Akses field upstream dilakukan null-safe (`?.` / `?? null`).
- [ ] Peta gagal lengkap: `504` (timeout), `502` (upstream error),
      `500` (kalian) — masing-masing dibuktikan oleh minimal satu test
      Postman (boleh dengan URL upstream sengaja salah, seperti Latihan 3-4).
- [ ] Kalau API-nya butuh key: di `.env`, placeholder di `.env.example`,
      dan `git diff --cached | grep -iE "key|token|secret"` kosong sebelum
      commit.
- [ ] Satu webhook yang benar-benar terpasang (Discord atau semacamnya)
      pada satu kejadian bisnis kalian — dengan bukti kegagalannya
      tidak menggagalkan operasi (response tetap sukses).
- [ ] README: API apa, untuk apa secara bisnis, dan satu paragraf
      kenapa kalian BUKAN passthrough.

Kriteria penilaian:

| Kriteria | Bobot | Nilai penuh berarti |
|---|---|---|
| Integrasi jalan | 25% | Panggilan sukses, parameter diteruskan dengan benar |
| Kontrak respons | 25% | Field dipilih sadar; test anti-bocor ada dan hijau |
| Peta gagal | 25% | `504`/`502`/`500` benar dan teruji |
| Rahasia | 15% | Key di `.env`, riwayat git bersih |
| Webhook | 10% | Terpasang pada kejadian bisnis; gagalnya terkendali |
