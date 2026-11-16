@extends('layouts.app')
@section('title', $recurring ? 'Edit Pengeluaran Berulang' : 'Tambah Pengeluaran Berulang')
@section('content')
    <div class="page-heading"><div><a class="back-link" href="{{ route('recurring.index') }}"><x-icon name="left" />Kembali</a><h1>{{ $recurring ? 'Edit' : 'Tambah' }} pengeluaran berulang</h1><p class="subtitle">Preview jadwal dari API sebelum menyimpan.</p></div></div>
    <div class="form-layout"><section class="panel form-panel">
        <form method="post" action="{{ $recurring ? route('recurring.update', $recurring['id_recurring_cost']) : route('recurring.store') }}" data-mutation>@csrf @if($recurring) @method('PATCH') @endif
            <div class="field"><label for="name">Nama tagihan</label><input id="name" name="name" required maxlength="180" value="{{ old('name', $recurring['name'] ?? '') }}" placeholder="Internet rumah"></div>
            <div class="field"><label for="amount">Nominal (Rp)</label><input id="amount" name="amount" required inputmode="decimal" value="{{ old('amount', $recurring['amount'] ?? '') }}" placeholder="150000"></div>
            <div class="field"><label for="category_id">Kategori</label><select id="category_id" name="category_id" required><option value="">Pilih kategori</option>@foreach($categories as $category)<option value="{{ $category['id'] }}" @selected((string) old('category_id', $recurring['category_id'] ?? '') === (string) $category['id'])>{{ $category['name'] }}</option>@endforeach</select></div>
            <div class="field"><label for="interval">Periode</label><select id="interval" name="interval" required><option value="monthly" @selected(old('interval', $recurring['interval'] ?? '') === 'monthly')>Bulanan</option><option value="yearly" @selected(old('interval', $recurring['interval'] ?? '') === 'yearly')>Tahunan</option></select></div>
            <div class="field"><label for="start_date">Tanggal mulai</label><input id="start_date" name="start_date" type="date" required value="{{ old('start_date', $recurring['start_date'] ?? now()->format('Y-m-d')) }}"></div>
            <div class="field"><label for="next_due_date">Jatuh tempo berikutnya</label><input id="next_due_date" name="next_due_date" type="date" required value="{{ old('next_due_date', $recurring['next_due_date'] ?? now()->format('Y-m-d')) }}"></div>
            <div class="field"><label for="end_date">Berakhir <span class="optional">(opsional)</span></label><input id="end_date" name="end_date" type="date" value="{{ old('end_date', $recurring['end_date'] ?? '') }}"></div>
            @if($recurring)<div class="field"><label for="status">Status</label><select id="status" name="status"><option value="active" @selected(($recurring['status'] ?? '') === 'active')>Aktif</option><option value="paused" @selected(($recurring['status'] ?? '') === 'paused')>Dijeda</option></select></div>@endif
            <div class="form-actions"><a class="button secondary" href="{{ route('recurring.index') }}">Batal</a><button class="button secondary" id="preview-button" type="button">Preview jadwal</button><button class="button" type="submit">Simpan</button></div>
        </form>
        <div id="preview-panel" class="panel recurring-preview" hidden><h2>Preview tagihan</h2><p class="field-help">Belum menjadi transaksi bank.</p><div id="preview-results"></div></div>
    </section><aside class="form-aside"><span class="aside-icon"><x-icon name="info" /></span><h2>Histori tetap aman.</h2><p>Mengubah nominal atau periode hanya memengaruhi template dan jadwal mendatang yang belum dikunci.</p><div class="aside-tip"><p>Tanggal 29/30/31 diklem ke hari terakhir bulan target, termasuk aturan tahun kabisat.</p></div></aside></div>
    <script>
        document.getElementById('preview-button').addEventListener('click', async () => {
            const form = document.querySelector('form');
            const panel = document.getElementById('preview-panel');
            const result = document.getElementById('preview-results');
            result.textContent = 'Memuat preview...'; panel.hidden = false;
            const response = await fetch('{{ route('recurring.preview') }}', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}'}, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
            const body = await response.json();
            if (!response.ok) { result.textContent = 'Preview belum tersedia. Periksa isian.'; return; }
            result.innerHTML = body.data.map(row => `<div class="recurring-preview-row"><span>${row.due_date}</span><strong>Rp ${row.amount_snapshot}</strong></div>`).join('');
        });
    </script>
@endsection
