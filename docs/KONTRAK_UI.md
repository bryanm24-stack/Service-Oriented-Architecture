# Kontrak UI v0.1 — satu sumber bersama

Status draft untuk ditinjau tim. [Wireframe empat layar](../frontend/wireframes.html) adalah referensi statis, bukan login/register/dashboard yang sudah berfungsi.
Seluruh anggota memakai [tokens.css](../frontend/src/styles/tokens.css). PIC AppShell, Sidebar, Topbar dan style dasar: Kenneth.

## Peta navigasi dan endpoint

E = endpoint existing, belum JWT. P = planned, belum tersedia. Halaman privat belum boleh dihubungkan ke data nyata sebelum auth/ownership selesai.

| Halaman / URL frontend rencana | Navbar/sidebar | Endpoint atau sumber data | PIC |
|---|---|---|---|
| /login | PublicHeader sederhana | P POST /auth/login, /auth/refresh | Bryan |
| /register | PublicHeader sederhana | P POST /auth/register; memakai model User existing, tidak membuat tabel user kedua | Bryan |
| /dashboard | AppShell, Dashboard aktif | P GET /dashboard/summary, /token-wallet; E Budget summary sebagai salah satu sumber | Rafael |
| /transactions | Keuangan > Pengeluaran | E GET/POST /transactions, GET/PUT/PATCH/DELETE /transactions/:id; E /categories | Dana |
| /incomes | Keuangan > Pemasukan | P CRUD /incomes | Dana |
| /budgets dan /budgets/:id | Keuangan > Budget | E CRUD /budgets, /budgets/:id/summary; pivot budget_categories tetap | Kenneth |
| /categories | Keuangan > Kategori | E CRUD /categories; aturan admin pada milestone auth | Kenneth |
| /tokens dan /purchases/:id | Layanan > Paket token | P /token-packages, /purchases, /token-wallet, /token-ledger | Bryan |
| /ai dan /ai/history | Layanan > Asisten AI | P /ai/requests, /ai/usages, /tips | Dana |
| /wishes dan /wishes/:id | Perencanaan > Wish | P /wishes, installments, realizations | Rafael |
| /recurring-costs | Perencanaan > Biaya rutin | P CRUD /recurring-costs | Dana |
| /reports | Laporan | P /reports/summary, /reports/expenses.pdf | Rafael |
| /bank | Integrasi opsional | P /bank/*, tampil disabled/off sampai syarat akses dipenuhi | Rafael |
| /profile | Menu akun pada Topbar | P GET /auth/me; E User CRUD setelah ownership terpasang | Bryan |

Seluruh path endpoint pada tabel memakai prefix /api/v1.
Sidebar desktop: Dashboard; Keuangan (Pengeluaran, Pemasukan, Budget, Kategori); Perencanaan (Wish, Biaya rutin); Layanan (Asisten AI, Paket token); Laporan; Bank bersyarat.
Topbar: nama halaman, periode yang relevan, saldo token dari server, menu akun/logout. Jangan membuat empat sidebar terpisah pada folder halaman.

## Warna, tipografi dan jarak

| Token | Nilai / fungsi |
|---|---|
| primary / hover | #0F766E / #115E59, tombol dan tautan utama |
| ink / muted | #0F172A / #475569 |
| background / surface / border | #F8FAFC / #FFFFFF / #CBD5E1 |
| success / warning / danger | #15803D / #B45309 / #B91C1C; selalu disertai teks |
| font | system-ui, -apple-system, Segoe UI, sans-serif; tanpa ketergantungan CDN |
| ukuran | body 16px, label 14px, caption 12px, h1 32px, h2 24px, angka ringkasan 28px |
| spacing | 4, 8, 12, 16, 24, 32, 48px; radius kontrol 8px, panel 12px |
| kontrol | tinggi minimum 44px; fokus terlihat; label tetap terlihat |

## Komponen dan struktur bersama

Frontend rencana memakai React + Vite + TypeScript; dependency/framework **belum dipasang** pada M1.
Struktur dan batas import ada di [frontend/README.md](../frontend/README.md).
Komponen: AppShell, PublicLayout, Sidebar, Topbar, PageHeader, Button, FormField, MoneyInput, DateInput, Select, DataTable, Pagination, StatusLabel, EmptyState, ErrorState, LoadingState dan ConfirmDialog.
Halaman mengonsumsi komponen bersama. Tidak menduplikasi CSS global, warna hex, formatter rupiah, sidebar, fetch/auth interceptor, error parser, atau dialog konfirmasi.
Perubahan komponen bersama direview Kenneth dan satu pemakai komponen tersebut. API/types shared direview Bryan; endpoint legacy dinormalisasi eksplisit di satu adapter.

## Responsif dan perilaku

- Mobile <768px: header dengan tombol menu, drawer satu Sidebar yang sama, satu kolom, padding 16px. Form login/register max-width 440px.
- Tablet 768–1023px: sidebar ringkas 72px dengan accessible label; form 1–2 kolom sesuai ruang.
- Desktop >=1024px: sidebar 240px, content max-width 1200px, padding 24–32px; form utama max-width 720px.
- Tabel berada pada container overflow-x:auto; halaman tidak melebar. Kolom penting tetap terbaca. Input tidak terpotong pada layar 375px.
- Setiap layar data mempunyai loading, kosong, berhasil dan gagal. Jika bank belum tersedia, tampil alasan dan pencatatan manual; jangan menampilkan status tersambung palsu.
- Tombol submit disabled saat pending. Tampilkan error per field dari kontrak API; jangan menampilkan SQL atau key. 401 membersihkan sesi dan mengarahkan login; 409 saldo token memandu ke paket token.
- Format rupiah hanya di tampilan; payload uang adalah string dua desimal, token adalah integer. Field user_id/id_user tidak menjadi input yang bisa dipilih pengguna biasa.
- Dashboard menampilkan periode sumber dan status data. Nilai contoh wireframe harus diberi label ilustrasi dan tidak dianggap saldo API.
- Keyboard: label terhubung ke input, focus ring jelas, drawer/dialog dapat ditutup Esc dan mengembalikan fokus. Warna tidak menjadi satu-satunya tanda error.

## Checklist persetujuan UI

- [ ] Kenneth meninjau tokens dan satu AppShell.
- [ ] Bryan meninjau login/register dan state sesi.
- [ ] Dana meninjau satu tabel/form dan validasi uang.
- [ ] Rafael meninjau dashboard, mapping endpoint dan responsif.

Checklist sengaja belum dicentang. Artefak siap dipakai meninjau, belum merupakan bukti persetujuan empat orang.
