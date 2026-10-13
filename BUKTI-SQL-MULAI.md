# Perekaman bukti SQL aktual untuk nomor 3

Paket ini memakai proyek asisten keuangan 30 endpoint. Perubahan terfokus pada skrip bukti SQL dan dokumentasinya. Tidak ada migrasi atau perubahan data database yang dilakukan saat penyusunan paket.

## Persiapan

Gunakan Node.js 24 sesuai package.json. Di folder proyek, jalankan `npm ci` dan gunakan `.env` Anda yang berisi koneksi MySQL. Pastikan MySQL aktif, DB_NAME sesuai, dan tabel sudah tersedia melalui sql/Gabungan.sql. `.env` pribadi tidak disertakan dalam ZIP.

Database harus memiliki minimal satu Budget dengan alokasi kategori. Untuk demonstrasi daftar yang lebih kuat, gunakan beberapa Budget pada periode berbeda. Perekam tidak membuat data percobaan secara otomatis.

Contoh body untuk POST /api/v1/budgets melalui server `npm start` (ganti ID dengan User dan Category yang tersedia, pilih periode yang belum dipakai):

```json
{
    "user_id": 1,
    "month": 10,
    "year": 2026,
    "budget_categories": [
        { "category_id": 1, "allocated_amount": "500000.00" }
    ]
}
```

GET /api/v1/budgets harus menampilkan Budget beserta categories dan pivot allocated_amount. Jika memakai Collection Runner Budget sebelumnya, perhatikan bahwa request DELETE pada akhir koleksi menghapus Budget percobaannya. Simpan data demonstrasi sebelum menjalankan perekam.

## Jalankan dari folder proyek

```bash
node scripts/bukti-budget-join.js
```

Tidak perlu menjalankan npm start untuk proses perekaman. Skrip memuat aplikasi utama yang sama dan membuka server sementara pada port acak di 127.0.0.1, sehingga tidak bentrok dengan port 3001. MySQL tetap harus aktif.

## Yang dilakukan skrip

1. Mengirim satu GET /api/v1/budgets ke aplikasi utama.
2. Merekam SQL dari logger Sequelize selama request tersebut.
3. Memastikan HTTP 200, tepat satu SELECT, JOIN ke budget_categories dan categories, serta allocated_amount pada SQL dan respons.
4. Menolak pembuatan bukti jika Budget kosong atau tidak ada alokasi kategori.
5. Membuat cadangan RANCANGAN.md, lalu memasukkan log ke bagian berpenanda otomatis di RANCANGAN.md.
6. Menyimpan salinan laporan BUKTI-BUDGET-JOIN-<waktu>-<id>.md.

Menjalankan skrip lagi memperbarui bagian bukti otomatis yang sama, tanpa menumpuk bagian identik atau menghapus bagian anggota lain. Cadangan tersimpan di backup-bukti-sql/. Penulisan RANCANGAN memakai file sementara lalu rename. Log hanya memuat SQL dan jumlah data, bukan isi baris respons atau kredensial.

Tidak perlu menyalin SQL secara manual. Jangan mengisi log contoh sebagai bukti aktual. Jangan mengedit penanda otomatis.

## Jika gagal

- HTTP 503: periksa koneksi MySQL dan .env.
- HTTP 500: periksa kesesuaian struktur tabel dengan sql/Gabungan.sql.
- Budget kosong: buat Budget beserta kategorinya sebelum mengulang.
- SELECT lebih dari satu: kode endpoint belum memenuhi pemeriksaan satu query; bukti tidak ditulis.
- Kolom pivot tidak tersedia: periksa asosiasi through dan include pada controller Budget.
- Penanda tidak lengkap/ganda: dokumen tidak ditimpa; perbaiki penanda bagian otomatis.

Kegagalan request atau pemeriksaan tidak mengubah RANCANGAN.md. Skrip tidak menjalankan INSERT, UPDATE, DELETE, ALTER, atau migrasi database.

## File kode

- scripts/bukti-budget-join.js: entrypoint perekaman dan penulisan laporan.
- scripts/lib/budget-evidence.js: capture HTTP/SQL, pemeriksaan, penyimpanan, dan pencadangan dokumen.
- tests/budget-evidence.test.js: tes perekam menggunakan fixture/simulasi; bukan bukti MySQL aktual.

Jika menerapkan pada folder versi (6) yang sudah berjalan, kedua file JavaScript di scripts/ diperlukan bersama-sama. package.json, index.js, model, controller, SQL, dan konfigurasi koneksi tidak diubah.

## Status pengujian paket

17 tes lulus, termasuk lima tes perekam untuk perekam, penolakan N+1, pemulihan logger, cadangan byte asli, dan pembaruan dokumen tanpa menggandakan bagian bukti. Seluruh pengujian sukses perekam memakai simulasi. Bukti SQL MySQL aktual belum tersedia dalam paket ini; baru dihasilkan saat skrip berhasil dijalankan pada database Anda.
