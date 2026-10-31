# ProjectSOA — milestone 1: baseline dan kontrak tim

Dokumen kerja bersama Kenneth, Bryan, Dana, Rafael. **M1 menyediakan baseline Git, rancangan data/API, pembagian PIC dan wireframe UI. Belum menambah implementasi pembayaran atau AI.**
Status kontrak: draft v0.1 siap ditinjau; persetujuan anggota belum dicatat.

## Mulai dari basis yang sama

Paket distribusi berisi folder ProjectSOA tanpa .git dan `ProjectSOA-M1.bundle` untuk riwayat Git lokal.
Gunakan bundle agar keempat anggota mendapat commit/tag/branch yang sama:

```bash
git clone -b chore/m1-contract ProjectSOA-M1.bundle ProjectSOA-kerja
cd ProjectSOA-kerja
git log --oneline --decorate -3
git show baseline/projectsoa-v1.0.0:package.json
```

Jalankan clone dari folder paket yang berisi bundle. Jika ProjectSOA-kerja sudah ada, pilih nama folder tujuan lain yang belum ada.
Jangan git init lagi di dalam hasil clone. Tidak ada remote tim yang di-push oleh paket ini.

## Urutan baca

1. [RANCANGAN.md](RANCANGAN.md): fitur, ERD, relasi, invariant, migrasi dan status persetujuan.
2. [Kontrak API](docs/KONTRAK_API.md): ownership JWT, decimal/token, respons dan endpoint rencana.
3. [Kontrak UI](docs/KONTRAK_UI.md) lalu [wireframe](frontend/wireframes.html): satu peta halaman dan satu gaya.
4. [30 endpoint existing](docs/ENDPOINTS_EXISTING.md) dan [baseline](docs/BASELINE.md): kode yang benar-benar tersedia.

## Kondisi aktual yang harus diketahui tim

- Users 9 + Categories 6 + Transactions 8 + Budgets 7 = 30 endpoint /api/v1. GET / tidak masuk hitungan.
- Budget–Category tetap N:M melalui BudgetCategory; allocated_amount ada di pivot budget_categories.
- JWT/login belum ada. Owner pada body/path existing belum terlindungi; kontrak baru mewajibkan owner dari JWT ketika diimplementasikan.
- Adapter Midtrans existing hanya membaca status order, belum checkout/webhook/wallet. Tidak dikembangkan pada M1.
- Seluruh halaman pada wireframe memakai data ilustrasi dan bukan aplikasi frontend yang sudah berfungsi.

## Pekerjaan berikut dan PIC

| Urut | Pekerjaan | PIC | Reviewer / dependensi | Bukti selesai berikutnya |
|---|---|---|---|---|
| 1 | Tinjau kontrak, catat keputusan field/relasi dan UI | Semua; Kenneth mengonsolidasikan | Semua anggota | Empat status review terisi di RANCANGAN |
| 2 | Runner migrasi additive, backup/restore uji dan pertahankan N:M | Kenneth | Rafael; baseline tetap | Upgrade DB berisi data lama tanpa reset |
| 3 | Auth JWT, role/ownership dan login/register bersama | Bryan | Dana; migrasi role | Tes 401/403/404 lintas user dan UI sesi |
| 4 | AppShell, Sidebar, form/tabel dan API DTO bersama | Kenneth | Bryan + Dana + Rafael | Satu shell, responsif, tanpa CSS duplikat |
| 5 | Income dan kontrak tanggal laporan | Dana | Kenneth + Rafael; auth | CRUD pemasukan milik user |
| 6 | Paket token, Purchase dan integrasi Midtrans sandbox | Bryan | Kenneth; auth + wallet schema | Callback verified/idempotent, tanpa saldo ganda |
| 7 | TokenWallet, ledger, reservasi dan rekonsiliasi | Kenneth | Dana + Bryan | Kredit/debit atomik, ledger dapat direkonsiliasi |
| 8 | AI usage aktual, debit melalui wallet, tips gratis | Dana | Kenneth; auth + wallet | Usage input/output dan debit sekali |
| 9 | Wish cash/cicilan dan realisasi tanpa duplikasi expense | Rafael | Dana; auth + tanggal uang | Jadwal dan realisasi teruji |
| 10 | Recurring dapat diedit/jeda, occurrence unik | Dana | Rafael; auth + tanggal uang | Tidak menggandakan transaksi |
| 11 | Dashboard ringkasan dan PDF pengeluaran | Rafael | Dana; income + expenses | Angka UI/PDF sama pada filter yang sama |
| 12 | Evaluasi bank resmi; tetap off jika syarat belum tersedia | Rafael | Bryan; akses sandbox/izin | Keputusan go/no-go tertulis, tanpa scraping |
| 13 | Postman/regression 30 endpoint dan seluruh fitur baru | Rafael | PIC fitur | Koleksi existing tetap, koleksi baru dipisah |

Pembagian halaman dan endpoint rinci ada di Kontrak UI. PIC model/relasi tidak diubah sepihak; perubahan lintas modul harus menyertakan dokumen, migrasi/DTO/Postman serta reviewer terkait.
Paket token bukan saldo uang bank. Fitur wish/cicilan adalah perencanaan pribadi, bukan pemberian kredit.

## Aturan branch dan commit

Mulai tiap feature dari commit kontrak yang sudah ditinjau, bukan dari ZIP versi anggota lain.
Nama branch: `feat/<pic>-<fitur>`, contoh `feat/bryan-auth`. Satu PIC utama per fitur, satu reviewer lintas modul.
Gunakan commit kecil: `docs:`, `feat:`, `fix:`, `test:`. Jangan merge perubahan nama FK/response/UI shell tanpa memperbarui kontrak.
Sebelum commit: `git diff --cached` dan `git ls-files .env` harus diperiksa; perintah kedua tidak menghasilkan file.
Jangan commit key, token sesi, .env, order asli atau data pribadi. .env.example hanya placeholder; Postman export harus tanpa credential.

## Menjalankan backend existing

Node.js 24 dan MySQL diperlukan untuk jalur database nyata.

```bash
npm ci
cp .env.example .env
```

Isi konfigurasi DB lokal pada .env, lalu jalankan `npm start`. Untuk instalasi awal gunakan `npm run db:migrate` sesuai DB_NAME setelah backup bila DB sudah berisi data.
Bootstrap tidak menghapus data, tetapi CREATE IF NOT EXISTS bukan migrasi upgrade struktur lama. Jangan menjalankan seed/reset lain sebagai jalan pintas.
`npm test` memakai database/provider simulasi. Hasil terkini dan batas verifikasi: [VERIFIKASI_M1.md](docs/VERIFIKASI_M1.md).

## Checklist M1

- [x] Baseline commit/tag serta branch kontrak lokal tersedia.
- [x] 30 endpoint existing dan lapisan kode dipetakan.
- [x] Rancangan fitur, N:M, calon relasi dan ownership ditulis.
- [x] Kontrak decimal/token/migrasi tanpa reset dicatat.
- [x] Wireframe login/register/dashboard/tabel-form, style tokens, struktur frontend dan PIC tersedia.
- [x] Tidak ada implementasi pembayaran atau AI baru.
- [ ] Keempat anggota benar-benar meninjau dan menyepakati draft.

M1 siap untuk review tim dan pembagian kerja; checklist persetujuan tidak dicentang atas nama orang lain.
