@extends('layouts.app')
@section('title', 'Pengeluaran Berulang')
@section('content')
    <div class="page-heading">
        <div><p class="eyebrow">Rencana rutin</p><h1>Pengeluaran berulang</h1><p class="subtitle">Template dapat diubah tanpa mengubah snapshot histori.</p></div>
        <a class="button" href="{{ route('recurring.create') }}"><x-icon name="plus" />Tambah recurring</a>
    </div>
    <section class="panel">
        <form class="transaction-filters" method="get" action="{{ route('recurring.index') }}">
            <div class="field"><label for="status">Status</label><select id="status" name="status"><option value="">Semua</option><option value="active" @selected(($filters['status'] ?? '') === 'active')>Aktif</option><option value="paused" @selected(($filters['status'] ?? '') === 'paused')>Dijeda</option></select></div>
            <div class="filter-actions"><button class="button secondary" type="submit">Filter</button><a class="text-link" href="{{ route('recurring.index') }}">Reset</a></div>
        </form>
    </section>
    <div class="recurring-list">
        @forelse($recurring as $item)
            <article class="panel recurring-card">
                <div class="section-heading"><div><h2>{{ $item['name'] }}</h2><p class="muted small">{{ $item['category']['name'] ?? 'Tanpa kategori' }} · {{ $item['interval'] === 'monthly' ? 'Bulanan' : 'Tahunan' }}</p></div><x-status-badge :status="$item['status']" /></div>
                <div class="recurring-details"><div><p class="muted small">Nominal template</p><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $item['amount'])) }}</strong></div><div><p class="muted small">Jatuh tempo berikutnya</p><strong>{{ \Carbon\CarbonImmutable::parse($item['next_due_date'])->locale('id')->translatedFormat('d M Y') }}</strong></div><div><p class="muted small">Mendatang</p><strong>{{ count($item['upcoming']) }}</strong></div></div>
                <p class="field-help">Jadwal mendatang adalah rencana; belum ada pembayaran bank atau transaksi otomatis.</p>
                <div class="row-actions">
                    <a class="button secondary compact-button" href="{{ route('recurring.edit', $item['id_recurring_cost']) }}">Edit</a>
                    <form method="post" action="{{ route('recurring.status', $item['id_recurring_cost']) }}">@csrf @method('PATCH')<input type="hidden" name="status" value="{{ $item['status'] === 'active' ? 'paused' : 'active' }}"><button class="button secondary compact-button" type="submit">{{ $item['status'] === 'active' ? 'Jeda' : 'Lanjutkan' }}</button></form>
                    <form method="post" action="{{ route('recurring.destroy', $item['id_recurring_cost']) }}" data-confirm>@csrf @method('DELETE')<button class="button secondary compact-button" type="submit">Arsipkan</button></form>
                </div>
                <div class="table-scroll recurring-schedules"><table class="expense-table"><thead><tr><th>Tagihan mendatang</th><th>Nominal snapshot</th><th>Status</th></tr></thead><tbody>@forelse($item['upcoming'] as $occurrence)<tr><td>{{ \Carbon\CarbonImmutable::parse($occurrence['due_date'])->locale('id')->translatedFormat('d M Y') }}</td><td>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $occurrence['amount_snapshot'])) }}</td><td><x-status-badge status="pending" /></td></tr>@empty<tr><td colspan="3" class="muted">Belum ada tagihan mendatang.</td></tr>@endforelse</tbody></table></div>
            </article>
        @empty
            <section class="panel"><x-empty-state title="Belum ada pengeluaran berulang" description="Buat template untuk tagihan bulanan atau tahunan. Template tidak langsung menjadi transaksi bank." /><a class="button empty-action" href="{{ route('recurring.create') }}">Buat template pertama</a></section>
        @endforelse
    </div>
@endsection
