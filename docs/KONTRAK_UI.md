> Update SOA-20261106-05: halaman /app/token-bundles, /app/token-purchases serta /app/admin/token-bundles dan /app/admin/categories tersedia. DataTable, FormField dan StatusBadge Blade dipakai bersama; menu admin hanya untuk role admin yang diverifikasi API. Lihat [SOA-20261106-05.md](SOA-20261106-05.md) untuk status, kontrak dan batas pembayaran.

# Kontrak UI aktif — milestone arus kas

Tampilan aktif memakai Laravel + Blade, CSS/JS lokal dan satu `layouts/app.blade.php`. Login/register berbagi `layouts/auth.blade.php`; navbar/sidebar dan navigasi bawah mobile tetap bersama. Semua aset CSP self, tanpa inline script atau Tailwind CDN.

| Halaman | Data/perilaku |
|---|---|
| /login, /register | Form CSRF ke controller Laravel → API Node; error seluruh field |
| /app/dashboard | Satu period YYYY-MM untuk tiga kartu agregasi dan lima transaksi terbaru |
| /app/transactions | Filter server: search,type,kategori,start/end,sort; limit/offset dan total dari API |
| /app/transactions/create, /app/transactions/:id/edit | type income/expense, kategori, nominal rupiah, catatan; owner dari sesi |
| /anggaran, /anggaran/:id | Baca data Budget milik akun; summary expense saja |
| /kategori, /aplikasi | Kategori bersama dan pemasangan PWA |

Nominal tabel rata kanan. Label Pemasukan/Pengeluaran selalu berupa teks. Seluruh mutasi memakai POST/CSRF + method override Laravel, lalu redirect yang mengambil daftar/agregasi baru dari server. Dialog hapus wajib sebelum form hapus dikirim. Data kosong dan upstream gagal mempunyai tampilan jelas; tidak ada data demo yang disamarkan sebagai data aktual.

Kartu arus kas berbagi `partials/cash-flow`; daftar/tabel/kartu mobile berbagi `partials/expenses`. Ringkasan tidak dihitung dari halaman pagination. Dashboard lanjutan/grafik/kuota/tagihan tetap milestone Rafael; PIC menggunakan komponen bersama yang sudah tersedia. Wireframe React pada `frontend/` dan [draft lama](legacy/M1-KONTRAK_UI.md) adalah referensi historis.
