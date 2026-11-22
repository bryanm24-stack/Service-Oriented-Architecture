@extends('layouts.app')
@section('title','Bank / Impor mutasi')
@section('content')
<div class="page-heading"><div><p class="eyebrow">Sumber pencatatan</p><h1>Bank / Impor mutasi</h1><p class="subtitle">Mode aktif: impor manual CSV/JSON. Data tidak diambil dari API bank.</p></div></div>
<div class="two-columns">
<section class="panel"><h2>Impor manual — Siap impor</h2><p>Gunakan berkas mutasi yang Anda peroleh sendiri dan sesuaikan dengan kontrak di bawah. Rekening hanya disimpan sebagai alias dan empat digit terakhir.</p><p>Sumber: {{ $bank['source'] }}. Saldo rekening terverifikasi: belum tersedia.</p></section>
<section class="panel"><h2>Sandbox resmi — Belum terhubung</h2><p>{{ $bank['sandbox']['reason'] }}</p><p>Mode ini belum tersedia. Tidak ada koneksi bank atau transfer yang dijalankan.</p></section>
</div>
<section class="panel"><h2>Daftarkan rekening impor</h2><form method="post" action="{{ route('bank.connection') }}" class="stack-form">@csrf
<label>Alias rekening<input name="label" required maxlength="80" placeholder="Rekening operasional"></label>
<label>Empat digit terakhir<input name="account_last4" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric" placeholder="1234"></label><button type="submit" class="button">Simpan rekening impor</button></form></section>
<section class="panel"><h2>Preview sebelum dicatat</h2><p>CSV memakai header <code>date,external_ref,direction,amount,description</code>. Tanggal YYYY-MM-DD, direction debit/credit, nominal positif memakai titik desimal. JSON berupa array dengan field yang sama. Referensi harus stabil dan unik pada rekening yang sama; jangan membuat referensi baru untuk mutasi lama.</p><p>Debit → pengeluaran. Kredit → pemasukan. Maksimal 500 baris / 60.000 karakter. Preview tidak membuat transaksi. Data sintetis hanya dapat dipreview.</p>
<form method="post" action="{{ route('bank.preview') }}" class="stack-form">@csrf
<label>Rekening<select name="connection_id" required><option value="">Pilih rekening impor</option>@foreach($bank['connections'] as $connection)<option value="{{ $connection['id'] }}">{{ $connection['label'] }} · {{ $connection['account_masked'] }}</option>@endforeach</select></label>
<label>Kategori pembukuan untuk batch ini<select name="category_id" required>@foreach($categories as $category)<option value="{{ $category['id'] }}">{{ $category['name'] }}</option>@endforeach</select></label>
<label>Format<select name="format"><option value="json">JSON</option><option value="csv">CSV</option></select></label>
<label>Jenis data<select name="is_synthetic"><option value="1">DATA SINTETIS — demo preview saja</option><option value="0">Mutasi milik saya — dapat dikonfirmasi</option></select></label>
<label>Isi CSV/JSON<textarea name="content" rows="9" maxlength="60000" required>{{ old('content','[{"date":"2026-11-01","external_ref":"DEMO-IN-001","direction":"credit","amount":"5000000.00","description":"DATA SINTETIS pemasukan"},{"date":"2026-11-02","external_ref":"DEMO-OUT-001","direction":"debit","amount":"150000.00","description":"DATA SINTETIS belanja"}]') }}</textarea></label><button type="submit" class="button" @disabled(!count($bank['connections']) || !count($categories))>Buat preview</button>
</form></section>
@if($preview)
<section class="panel"><h2>Preview {{ $preview['is_synthetic'] ? 'DATA SINTETIS' : 'impor manual' }}</h2><p>{{ $preview['connection']['account_masked'] }} · Sumber: impor pengguna · Bukan API BCA.</p>
<div class="table-scroll"><table class="expense-table"><thead><tr><th>Baris</th><th>Tanggal</th><th>Referensi</th><th>Debit/kredit</th><th>Nominal</th><th>Status / error</th></tr></thead><tbody>@foreach($preview['rows'] as $row)<tr><td>{{ $row['row_number'] }}</td><td>{{ $row['date'] ?? '—' }}</td><td>{{ $row['external_ref'] ?? '—' }}</td><td>{{ $row['direction'] ?? '—' }}</td><td>{{ isset($row['amount']) ? \App\Support\Money::rupiah(\App\Support\Money::cents($row['amount'])) : '—' }}</td><td>{{ $row['status'] }} {{ implode('; ',$row['errors']) }}</td></tr>@endforeach</tbody></table></div>
@if($preview['can_confirm'] && !$preview['is_synthetic'])<form method="post" action="{{ route('bank.confirm',$preview['batch_id']) }}">@csrf<button class="button" type="submit">Konfirmasi pencatatan transaksi</button></form>@else<p>Data sintetis tidak dicatat. Untuk error baris, perbaiki berkas dan buat preview baru; referensi duplikat akan dilewati.</p>@endif
</section>
@endif
@endsection
