# Frontend — acuan struktur M1

M1 hanya menyediakan wireframe dan token desain, belum aplikasi React dan belum mengirim request API.
Buka `wireframes.html` langsung di browser. Gunakan [kontrak UI](../docs/KONTRAK_UI.md) sebagai acuan tunggal.

Struktur target setelah persetujuan (file/folder selain tokens dan wireframes belum diimplementasikan):

```text
frontend/
  src/
    app/             routing dan providers
    layouts/         AppShell dan PublicLayout
    components/      komponen bersama, tanpa request bisnis
    features/
      auth/
      dashboard/
      transactions/
      incomes/
      budgets/
      tokens/
      ai/
      wishes/
      recurring/
      reports/
    lib/
      api/           satu client, adapter legacy/new, auth dan error parser
      format/        money, tanggal dan token
    types/           DTO dan kontrak API bersama
    styles/
      tokens.css     sudah tersedia sebagai acuan
  wireframes.html    empat layar referensi statis
```

Pilihan awal: React + Vite + TypeScript. Instalasi dan file app dilakukan setelah kontrak ditinjau; tidak ada package frontend palsu pada M1.
Feature boleh mengimpor components/lib/types, bukan menyalin AppShell atau mengimpor internal feature lain.
Semua URL backend melewati satu baseURL: origin + /api/v1. Origin adalah konfigurasi publik; key Midtrans/AI/Bank tidak boleh memakai variabel frontend VITE_*.
DTO legacy: preserve id_transaction/budget_id dan response existing, lalu normalisasi di adapter. DTO baru memakai kontrak docs/KONTRAK_API.md.
Wireframe tidak memiliki submit aktif atau koneksi bank/AI. Klik label navigasi hanya untuk berpindah contoh.
