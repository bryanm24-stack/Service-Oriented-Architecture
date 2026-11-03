# Kontrak UI — Laravel/Blade + Node API

Pembaruan 3 November 2026. Laravel 13 + Blade di laravel-web menjadi tampilan web dan mobile PWA. Node.js/Express tetap pemilik logika bisnis dan MySQL. frontend/ adalah arsip wireframe M1; rencana React/Vite sebelumnya diganti. Persetujuan empat anggota tetap belum dicatat.

## Halaman yang sudah tersedia

| URL web | Tampilan/fungsi | API existing /api/v1 |
|---|---|---|
| / | Ringkasan pengeluaran per bulan dan budget | users/:id/transactions, users/:id/budgets, budgets/:id/summary |
| /pengeluaran | Filter, daftar kartu HP/tabel desktop, pagination | users/:id/transactions, categories |
| /pengeluaran/tambah | Form pengeluaran | POST transactions |
| /pengeluaran/:id/edit | Edit nominal/catatan; kategori existing dipertahankan | GET/PATCH transactions/:id |
| Hapus dari daftar | Dialog konfirmasi | GET/DELETE transactions/:id |
| /anggaran, /anggaran/:id | Daftar dan ringkasan anggaran | users/:id/budgets, budgets/:id/summary |
| /kategori | Kategori bersama, baca saja | categories |
| /aplikasi | Pemasangan dan informasi offline | Tidak ada data bisnis |
| /login, /register | Belum dibuat; antarmuka/alur menunggu Dana | Endpoint autentikasi belum aktif |

CRUD kategori/budget lainnya tetap melalui API existing. Tidak ada tampilan yang mengklaim pemasukan, wallet, pembayaran, AI, wish atau recurring sudah tersedia.

## Satu sumber tampilan

Gaya aktif: laravel-web/public/assets/app.v1.css. Layout bersama: resources/views/layouts/app.blade.php. Ikon dan empty state memakai Blade components; daftar pengeluaran memakai satu partial untuk kartu mobile dan tabel desktop. Jangan membuat sidebar/form/CSS global berbeda di masing-masing modul.

Warna utama #0F766E, hover #115E59, ink #152923, muted #5A7068, background #F5F8F6, surface putih, border #DCE7E1, danger #B42318. Font system-ui tanpa CDN. Input 16px untuk mobile; kontrol sekurangnya 44px; fokus keyboard terlihat. Spacing memakai langkah 4/8/12/16/20/24/28/32. Panel radius 16px dan kontrol 9–10px.
Desktop >=1024 memakai sidebar 248px; di bawahnya memakai bottom navigation dengan safe-area. Pada mobile <=639px, metrik dan filter disusun satu kolom agar nominal/pilihan tidak terpotong. Tabel desktop diganti kartu di mobile, bukan melebarkan halaman. Pengujian 320/375/820/1440px tidak menemukan overflow halaman.

## Data dan state

Pemilik preview ditetapkan server melalui SOA_LOCAL_USER_ID, hanya pada APP_ENV local/testing dengan preview flag. Tidak ada pilihan user pada form. Ini bukan autentikasi produksi. Laravel mengambil API server-ke-server; tidak ada koneksi MySQL dari tampilan. Nominal diproses dalam integer sen; input memakai string desimal tanpa pemisah ribuan.

Blade meng-escape teks. Form memakai CSRF, validasi server, konfirmasi hapus dan pencegahan submit ganda. Pesan kosong, sukses, error API dan offline tersedia. Error tidak mengirim payload/debug/SQL/key upstream. Respons halaman private memakai no-store.

PWA hanya mencache aset statis dan offline.html. Data keuangan/HTML personal/response API/token tidak disimpan. Tidak ada antrean penyimpanan offline. HTTPS diperlukan di HP untuk service worker/pemasangan; localhost/loopback mendapat pengecualian pengembangan.

## Handoff dan review

Dana mengerjakan antarmuka/alur login/register berikutnya bersama PIC API autentikasi. PreviewUserContext dan EnsureLocalPreview diganti hanya setelah identitas serta ownership Node terverifikasi. Tidak membuat tabel users atau kredensial kedua di Laravel.

- [ ] Kenneth meninjau layout, gaya dan relasi data yang ditampilkan.
- [ ] Bryan meninjau kontrak API dan koordinasi auth/ownership.
- [ ] Dana meninjau form serta merancang integrasi login/register.
- [ ] Rafael meninjau dashboard, ringkasan dan responsif.
