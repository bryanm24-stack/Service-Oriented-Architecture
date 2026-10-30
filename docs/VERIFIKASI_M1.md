# Verifikasi M1

Pemeriksaan dilakukan pada 30 Oktober 2026 dengan Node.js 24.22.1.

| Pemeriksaan | Hasil |
|---|---|
| Regression existing `npm test` | 24 lulus, 0 gagal, 0 skipped |
| Inventaris route dan cakupan Postman | 30 pasangan method/path; Users 9, Categories 6, Transactions 8, Budgets 7; seluruhnya tercakup dalam 52 request koleksi |
| Relasi N:M | Model BudgetCategory dan relasi Budget/Category existing dipertahankan; regression relasi lulus |
| Perubahan source setelah baseline | Tidak ada perubahan pada src/, sql/, scripts/, entry atau package/dependency |
| Wireframe | Empat layar statis, diperiksa secara visual di Chromium headless |
| Responsif | Desktop 1440px, tablet 820px dan mobile 375px: tidak ada overflow halaman; tabel bergeser dalam container |
| Label input / asset | Seluruh input berlabel; CSS tokens termuat; tidak ada page error pada tiga ukuran |
| Secret pada tracked file | .env/private key tidak diikutkan; template credential kosong; fixture provider sintetis |

Tes memakai database dan adapter provider simulasi. Tidak menguji MySQL atau Midtrans asli, tidak menjalankan migrasi pengguna, tidak mengimplementasikan login/JWT atau layanan AI.
Fixture Midtrans yang tidak sesuai sandbox diperbaiki saat impor baseline; kode layanan pembayaran tidak diubah.

## Pemeriksaan ulang tim

```bash
git status --short
git ls-files .env
git diff baseline/projectsoa-v1.0.0 -- src sql scripts index.js index-budget.js package.json package-lock.json
npm test
```

Perintah ls-files .env dan diff source di atas tidak menghasilkan perubahan. Nama environment dan placeholder bukan secret. Jangan menyalin .env pribadi ke commit.
Bundle dapat diperiksa dengan `git bundle verify ProjectSOA-M1.bundle` dari sebuah repo Git, lalu clone branch `chore/m1-contract` ke folder baru.
Persetujuan Kenneth/Bryan/Dana/Rafael masih perlu dicatat manual; dokumen siap ditinjau, bukan bukti persetujuan mereka.
