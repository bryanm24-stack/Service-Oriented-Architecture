# Folder validation dengan pesan langsung pada schema

Ganti folder `src/utils/validation` dengan folder `validation` dalam ZIP ini. Simpan folder lama sebagai cadangan di luar `src`. File `joiMessages.js` tidak diperlukan lagi dan tidak disertakan. Jangan menambahkan isinya ke file lain secara manual.

Aturan dan pesan error berada di schema melalui `.messages()`, mengikuti pola `bukuSchema.js`. Nama file, nama ekspor resource, dan fungsi `parse()` dipertahankan agar controller versi perbaikan sebelumnya tidak perlu diubah. Semua helper tetap memakai `abortEarly: false`.

| File | Penggunaan |
|---|---|
| resourceSchemas.js | Aturan Users, Categories, Transactions dan fungsi parse() |
| integrationSchemas.js | Aturan query kurs, anime, body contoh dan webhook; divalidasi melalui parse() |
| validateJoi.js | Helper validasiJoi() dan validasiParsial(); mengembalikan valid, errors, value |
| bukuSchema.js | Schema modul Buku dari materi |
| userSchema.js | Schema demo user; bukan schema CRUD Users |
| budgetSchema.js dan idBudgetSchema.js | Schema Budget yang dibawa dari unggahan |
| index.js | Ekspor schema materi dan Budget |

`validateJoi.js` masih digunakan oleh controller Buku dan demo Contoh. Controller Budget juga mengimpornya, tetapi kode Budget lama masih salah memanggil helper: urutan yang benar adalah `(schema, body)`, dan hasilnya `valid/errors/value`, bukan `error`. Penggantian folder validasi ini tidak memperbaiki atau mengaktifkan modul Budget. `idBudgetSchema` masih mempertahankan field user_id dari unggahan; itu belum merupakan validasi params.id untuk menghapus Budget.

Controller Users, Categories, Transactions dan integrasi API versi sebelumnya memakai `parse()` dari resourceSchemas.js, bukan validasiJoi(). Kedua helper sengaja dipertahankan karena kontrak pemanggilan controller berbeda. Tidak ada keharusan mengubah semua controller hanya untuk memindahkan pesan error.

Jika file template Buku/Contoh sudah dihapus, sesuaikan impor/ekspor sesuai proyek aktual. Jangan menghapus validateJoi.js selama masih ada controller yang mengimpornya.

Pengujian memakai proyek perbaikan sebelumnya, database simulasi dan server API lokal. Tidak melakukan migrasi MySQL atau panggilan provider asli.

Hasil verifikasi: 76 pemeriksaan HTTP lulus dengan database simulasi. Pemeriksaan kompatibilitas helper, PATCH Buku, ekspor Budget, dan pesan per-field juga lulus.
