# Hasil penggabungan proyek

Sumber:

- `Service-Oriented-Architecture (2).zip`: modul Users.
- `Service-Oriented-Architecture.zip`: modul Categories.

Semua 4.204 lokasi file unik dari kedua sumber tersedia dalam proyek gabungan.
File yang sama dipakai satu kali. File yang berbeda digabungkan sesuai fungsi;
kedua versi aslinya tetap tersedia dalam ZIP sumber di `merge-backup/`.
Kedua ZIP cadangan identik byte demi byte dengan lampiran awal, termasuk
konfigurasi, dependensi, koleksi Postman, dan metadata Git.
`merge-backup/manifest.json` mencatat sumber, lokasi, SHA-256, dan apakah
file aktif masih identik dengan sumbernya.

## Integrasi yang dilakukan

| File | Hasil |
| --- | --- |
| `index.js` | Memasang Users dan Categories bersama Contoh, Buku, dan ContohAxios. |
| `src/routes/index.js` | Mengekspor semua router kedua proyek. |
| `src/models/index.js` | Mendaftarkan User, Category, Buku, dan Karakter pada koneksi yang sama. User sudah berupa model, sehingga tidak dipanggil sebagai factory. |
| `src/routes/userRoutes.js` | Memanggil factory `methodNotAllowed` dengan daftar metode yang benar agar respons 405 tidak menggantung. |
| `src/middlewares/methodNotAllowed.js` | Mempertahankan implementasi bersama serta komentar penjelasan dari versi Users. |
| `sql/schema.sql` | Menggabungkan tabel users, categories, buku, karakter, dan penulis. Tidak memindahkan koneksi ke database lain. |
| `sql/seed.sql` | Menggabungkan seluruh data contoh. Hanya menambah data yang belum ada, tanpa menghapus atau menimpa data lama. Relasi karakter mengikuti ID buku sebenarnya. |
| `scripts/migrate.js` | Memakai versi Categories: DB_NAME dari .env, dengan fallback soa_minggu6 yang konsisten dengan koneksi aplikasi. |
| `package-lock.json` | Memakai versi Categories. Versi paket kedua sumber sama; perbedaannya hanya satu flag peer. |

File konfigurasi asli dan seluruh koleksi Postman JSON/YAML tetap disertakan.
File `schema(materi).sql` dan `seed(materi).sql` juga dipertahankan apa adanya.
Perintah migrasi utama hanya menjalankan `schema.sql` dan `seed.sql` gabungan.
`seed(materi).sql` tetap merupakan versi reset lama yang mengandung TRUNCATE.

## Menjalankan hasil

Ekstrak ZIP ke folder baru agar hasil tidak bercampur dengan working tree lama.
Dari folder `Service-Oriented-Architecture`, gunakan Node.js 24 sesuai package.json:

```bash
npm install
npm run db:migrate
npm start
```

MySQL harus berjalan dan nilai DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
di `.env` harus sesuai lingkungan lokal. `.env` asli tidak diubah.
Migrasi membuat tabel yang belum ada; migrasi ini tidak mengubah struktur
tabel yang sudah ada dan berbeda dari skema proyek.

Endpoint terpasang:

- `/api/v1/users`
- `/api/v1/categories`
- `/api/v1/buku`
- `/api/v1/contoh`
- `/api/v1/contohAxios`

## Pemeriksaan

- Sintaks 29 file JavaScript lulus; JSON proyek valid.
- 11 pemeriksaan HTTP lulus, termasuk root, daftar Users/Categories, 404,
  dan 405. Operasi database digantikan stub selama pemeriksaan ini.
- Seed dijalankan dua kali dalam harness SQLite dengan data lama yang sengaja
  berbeda. Tidak ada duplikasi atau perubahan data lama; relasi karakter benar.
  Ini menguji perilaku seed, bukan kompatibilitas penuh MySQL.
- Metadata Git aktif berasal dari ZIP tanpa `(2)`, dengan branch Bryan tetap
  sebagai basis working tree. Objek dan referensi Git diperiksa dengan fsck;
  tidak ada objek hilang atau rusak. Objek dangling bawaan tetap dipertahankan.
- Hasil ini merupakan penggabungan isi proyek lokal. Tidak dibuat merge commit
  dan tidak dilakukan push ke remote. Kedua snapshot Git asli ada di ZIP cadangan.
- Integrasi database MySQL nyata dan panggilan API pihak ketiga belum diuji.

`HASIL-MERGE.md` menjadi acuan untuk hasil gabungan ini. Dokumen pembelajaran
lama tetap disimpan tanpa perubahan walaupun masih menyebut seed sebagai reset.
