# Keputusan bank dan tips gratis — 22 November 2026

## Keputusan akses untuk demo 25 November 2026

**Jalur terpilih: impor manual CSV/JSON. Sandbox resmi belum terhubung.**
Bukti akses tim: pengguna melaporkan Client ID belum muncul. Tidak ada kredensial tim atau respons sandbox terautentikasi yang tersedia untuk diverifikasi. Akses halaman dokumentasi publik bukan bukti akses sandbox tim. Spike akses dibatasi maksimal dua jam; keputusan fallback diambil sekarang tanpa menunggu dua jam penuh. Pemeriksaan ini hanya membaca sumber publik, tidak masuk akun atau mengajukan kerja sama atas nama pengguna.

Sumber resmi diperiksa 22 November 2026:

- https://developer.bca.co.id/id/Sandbox — login, My Application, tambah layanan, security key, token/signature, pengujian. Sandbox menggunakan data contoh; bukan rekening nyata.
- https://developer.bca.co.id/id/Dokumentasi — tersedia kontrak non-SNAP dan SNAP. Jangan mencampur autentikasi keduanya. Non-SNAP menjelaskan client_id/client_secret; SNAP memakai client_id, tanda tangan asimetris untuk token, dan signature/header layanan. Kunci serta hak layanan harus sesuai aplikasi resmi tim.
- https://www.bca.co.id/id/bisnis/solusi/API — layanan saldo/mutasi dan pengajuan kerja sama. Otorisasi aplikasi tidak berarti bebas membaca rekening orang lain.
- https://webform.bca.co.id/api/registrasi-api — biaya perlu dikonfirmasi melalui kanal resmi BCA; tidak diasumsikan gratis.

Sebelum mengaktifkan adapter resmi: buktikan akses token dan inquiry saldo/mutasi dengan rekening uji resmi yang diizinkan; dokumentasikan environment, layanan, persetujuan rekening, corporate/partner/channel identifier yang diberikan, token expiry, signature serta public-key registration yang berlaku. Jangan mencatat secret dalam bukti. Konfirmasikan rate limit, histori tanggal, pagination, SLA, biaya per-hit/minimum, termasuk request gagal. Dokumentasi SNAP mutasi menyebut histori 31 hari dan maksimum 20.000 mutasi per request; cek kesesuaian produk/kontrak tim. Tidak ada tarif nominal yang dianggap berlaku untuk tim sebelum konfirmasi.

## Lingkup implementasi

BankConnection milik User menyimpan alias, empat digit rekening terakhir, mode manual_import, status ready_import. Tidak menyimpan login bank. BankImportBatch milik User dan Connection menyimpan kategori, preview tervalidasi, penanda sintetis, status preview/committed. BankImportItem menghubungkan batch/connection/reference ke Transaction. Unique `(connection_id, external_ref)` mencegah pengulangan mutasi di rekening impor yang sama; gunakan kembali connection yang sama. Jika referensi bank hanya unik harian, normalisasikan sebagai tanggal+referensi. Jangan memberi referensi baru untuk baris lama atau membuat connection baru untuk menghindari pemeriksaan.

BankImportItem berstatus efektif tercatat hanya setelah konfirmasi. Preview tidak membuat Transaction. Konfirmasi mengunci connection dan batch, memasukkan Transaction dan Item atomik, memeriksa kembali duplikat, lalu menandai committed. Konfirmasi berulang tidak membuat transaksi baru. Kegagalan insert me-rollback pencatatan. Data sintetis boleh dipreview tetapi ditolak saat konfirmasi agar tidak mencemari pembukuan.

Kategori batch dipilih pengguna. Semua debit menjadi expense dan kredit menjadi income. Nominal string DECIMAL, perhitungan uang BigInt. Tanggal impor menjadi createdAt pukul 12:00 Asia/Jakarta pada tanggal sumber karena model transaksi belum memiliki booked_at terpisah; ini tanggal pembukuan impor, bukan timestamp bank yang terverifikasi. Tidak ada sinkronisasi otomatis, transfer, scraper, koneksi bank sukses palsu, parsing PDF, atau penerimaan semua variasi CSV asli bank tanpa normalisasi.

## Kontrak adapter yang stabil

`getAdapter(mode).getBalance()` → `{amount:null,currency:"IDR",verified:false,source:"manual_import",as_of:null}`.
`getAdapter(mode).getStatements({format,content})` → `{source:"manual_import",verified:false,rows:[...]}`.
`bca_sandbox` belum aktif dan menghasilkan 503; tidak melakukan request. Mengganti provider kelak mempertahankan field aplikasi berikut, bukan meneruskan payload BCA mentah.

CSV header persis: `date,external_ref,direction,amount,description`.
JSON berupa array object dengan field yang sama. Tanggal YYYY-MM-DD valid; direction debit/credit; amount string positif dengan titik desimal; external_ref wajib stabil, maksimal 100 karakter. UTF-8, CSV koma mendukung quoted comma/newline. Maksimum 500 baris dan content 60.000 karakter. Saldo manual tidak diinferensikan dari jumlah debit/kredit.

Contoh sintetis di `docs/examples/bank-synthetic.csv` dan `.json`.
Preview response: `data.batch_id`, `connection.account_masked`, `is_synthetic`, `source`, `can_confirm`, dan `rows[].{row_number,date,external_ref,direction,amount,description,type,status,errors}`. Status baris ready/invalid/duplicate. Baris invalid harus diperbaiki melalui preview baru. Referensi yang sudah diimpor dilewati.

| Endpoint JWT | Perilaku |
|---|---|
| GET /api/v1/bank/status | Mode, status akses, rekening tersamarkan; saldo null |
| POST /api/v1/bank/connections | label dan account_last4; owner dari JWT |
| POST /api/v1/bank/imports/preview | connection_id, category_id, format, content, is_synthetic |
| POST /api/v1/bank/imports/:id/confirm | Body {}; hanya batch owner, tidak menerima mutasi saldo |
| GET /api/v1/recommendations/free | Aturan gratis tanpa provider AI atau akses TokenWallet |

## Tips gratis

Query whitelist: period YYYY-MM; income_confirmed dan commitments_confirmed boolean; reserve_target dan goal_target string nominal nonnegatif (target yang masih perlu dipenuhi); horizon_months 1..600; risk_profile low/medium/high. Query lain termasuk user_id ditolak. Identitas selalu JWT, termasuk admin yang menggunakan tips ini.

Tiga query bisnis: satu agregasi SQL transaksi owner/periode Jakarta; satu JOIN recurring occurrence ke template owner aktif; satu JOIN installment ke Wish owner planned. Komitmen sampai akhir periode mencakup tunggakan sebelumnya. Occurrence planned/locked dan cicilan planned hanya dihitung bila transaction_id null. Referensi transaksi non-null dikecualikan bahkan bila status belum diperbarui. Tidak ada query per baris/N+1. Tidak ada pencocokan heuristik mutasi bank dengan tagihan; tautan transaksi komitmen harus benar.

`projected_surplus = income - expense - unpaid_commitments`. Ini bukan saldo bank/kas terverifikasi. Konfirmasi kelengkapan adalah pernyataan pengguna, bukan verifikasi pendapatan bank. Default data_incomplete=true; nol tanpa konfirmasi tetap tidak lengkap. Kartu kebutuhan menyebut komitmen telah dikurangkan, sehingga bukan alokasi tambahan. Dari surplus positif dan data lengkap, cadangan dahulu, lalu tujuan/modal maksimum sisa dana. Tanpa target cadangan tidak ada alokasi nominal tujuan. Edukasi investasi hanya dengan horizon/risiko yang diisi, tanpa produk spesifik, pembelian, atau janji return. Defisit/data tidak lengkap tidak menghasilkan edukasi investasi. Input tidak disimpan sebagai profil permanen; sertakan kembali pada query/form.

Tidak ada API key AI, panggilan provider, atau debit/reservasi TokenWallet pada endpoint ini. Batas request infrastruktur (bila ditambah) adalah pembatasan kapasitas, bukan biaya token.

Contoh sintetis:
- Positif: income 5.000.000, expense 2.000.000, recurring 500.000, cicilan 500.000 → surplus 2.000.000. Target cadangan 1.500.000, tujuan 1.000.000 → alokasi cadangan 1.500.000 dan tujuan 500.000.
- Defisit: income 1.000.000, expense 1.200.000, kewajiban 300.000 → -500.000; prioritas tinjau kebutuhan.
- Tidak lengkap: income 0 tanpa konfirmasi → data_incomplete, petunjuk tambah pemasukan/komitmen; tidak diasumsikan bebas kewajiban.

## Frontend dan kriteria selesai 25 November

`/app/bank`: dua mode dijelaskan, manual siap impor dan sandbox belum terhubung. Alias/last4, form CSV/JSON, preview kolom tanggal/referensi/debit-kredit/nominal/error, label sintetis dan konfirmasi hanya untuk data riil valid. Navigasi desktop/mobile tersedia.
`/app/tips`: label Gratis/tidak memakai kuota AI, ringkasan proyeksi, komitmen, alasan dan prioritas API, isian konfirmasi/horizon/risiko, tautan tambah pemasukan, recurring, Wish. Output Blade escaped; tanpa script inline baru.

Penerimaan: login dua akun; akses data akun lain 404; preview CSV/JSON setara; invalid tidak dicatat; sintetis tidak bisa dikonfirmasi; impor ulang menghasilkan nol transaksi tambahan; kegagalan item tidak meninggalkan Transaction; saldo token sebelum/sesudah tips sama; tagihan berreferensi transaksi tidak dikurangi lagi; contoh positif/defisit/tidak lengkap cocok rumus; halaman dapat dibuka melalui Laravel. Tidak ada syarat mendapat Client ID untuk demo impor. Uji bank live dilakukan terpisah setelah akses resmi terbukti.

## Pengujian dan pembaruan

`npm test`: tes controller lama memakai fixture admin eksplisit di tests/support/controller-app.js; middleware produksi tidak diubah. Asumsi lama 30 endpoint/8 tabel, bind SQL, status DELETE dan mock transaksi diperbarui ke kontrak sekarang. Tes baru menjalankan aplikasi produksi dengan JWT nyata dan stub database untuk owner/whitelist/perhitungan serta tidak memanggil AI/wallet. Tes bank menguji preview, duplikat, ownership, rollback dan idempotency. Ini tidak menggantikan uji MySQL nyata.
Jalankan `npm run test:mysql` untuk suite database terisolasi. PHP/MySQL tidak tersedia di lingkungan pengerjaan awal; jangan mengklaim suite tersebut atau pengujian browser Laravel lulus bila belum dieksekusi. Panduan dan hasil aktual disertakan pada PANDUAN-BANK-TIPS.md.
