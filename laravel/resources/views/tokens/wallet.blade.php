@extends('layouts.app')
@section('title', 'Kuota AI')
@section('content')
<div class="page-heading">
    <div><p class="eyebrow">Dompet penggunaan AI</p><h1>Kuota AI</h1><p class="subtitle">Saldo, reservasi, pembelian, dan pemakaian aktual dalam satuan token.</p></div>
    <div class="wallet-actions"><a class="button secondary" href="{{ route('tokens.index') }}">Beli token</a><a class="button" href="{{ route('ai.analysis') }}">Mulai analisis <x-icon name="arrow" /></a></div>
</div>
<div class="wallet-stats">
    <article class="panel wallet-stat"><span class="small-label">Saldo tersedia</span><strong>{{ number_format((int) $wallet['available_tokens'], 0, ',', '.') }}</strong><span class="muted small">token siap digunakan</span></article>
    <article class="panel wallet-stat"><span class="small-label">Saldo ditahan</span><strong>{{ number_format((int) $wallet['reserved_tokens'], 0, ',', '.') }}</strong><span class="muted small">token untuk permintaan yang masih diproses atau diperiksa</span></article>
    <article class="panel wallet-stat"><span class="small-label">Total kuota</span><strong>{{ number_format((int) $wallet['total_tokens'], 0, ',', '.') }}</strong><span class="muted small">tersedia + ditahan</span></article>
</div>
@if((int) $wallet['available_tokens'] === 0)
    <div class="catalog-notice"><x-icon name="info" /><div><strong>Saldo tersedia sedang nol</strong><p>Tambahkan kuota melalui katalog paket. Token yang sedang ditahan belum dapat digunakan untuk permintaan baru.</p><a class="text-link" href="{{ route('tokens.index') }}">Lihat katalog Beli Token <x-icon name="arrow" /></a></div></div>
@endif
<section class="panel wallet-period">
    <div class="section-heading"><div><h2>Rekap penggunaan AI</h2><p class="muted small">Periode {{ $summary['period'] }}</p></div>
        <form method="get" action="{{ route('tokens.wallet') }}" class="period-filter"><label class="sr-only" for="period">Periode</label><input id="period" type="month" name="period" value="{{ $period }}"><button class="button secondary" type="submit">Terapkan</button></form>
    </div>
    <div class="wallet-usage-grid">
        <div><span class="muted small">Permintaan selesai</span><strong>{{ number_format((int) $summary['requests'], 0, ',', '.') }}</strong></div>
        <div><span class="muted small">Input aktual</span><strong>{{ number_format((int) $summary['input_tokens'], 0, ',', '.') }} <small>token</small></strong></div>
        <div><span class="muted small">Output aktual</span><strong>{{ number_format((int) $summary['output_tokens'], 0, ',', '.') }} <small>token</small></strong></div>
        <div><span class="muted small">Total digunakan</span><strong>{{ number_format((int) $summary['total_tokens'], 0, ',', '.') }} <small>token</small></strong></div>
    </div>
</section>
<section class="panel wallet-section">
    <div class="section-heading"><div><h2>Riwayat kredit dan debit</h2><p class="muted small">Riwayat audit tidak dapat diubah atau dihapus dari halaman ini.</p></div></div>
    <form method="get" action="{{ route('tokens.wallet') }}" class="filter-bar">
        <input type="hidden" name="period" value="{{ $period }}">
        <label><span class="small-label">Jenis aktivitas</span><select name="type"><option value="">Semua aktivitas</option><option value="credit" @selected(($filters['type'] ?? '') === 'credit')>Token dibeli</option><option value="debit" @selected(($filters['type'] ?? '') === 'debit')>Token digunakan</option><option value="reserve" @selected(($filters['type'] ?? '') === 'reserve')>Token ditahan</option><option value="release" @selected(($filters['type'] ?? '') === 'release')>Reservasi dikembalikan</option></select></label>
        <label><span class="small-label">Dari tanggal</span><input type="date" name="start_date" value="{{ $filters['start_date'] ?? '' }}"></label>
        <label><span class="small-label">Sampai tanggal</span><input type="date" name="end_date" value="{{ $filters['end_date'] ?? '' }}"></label>
        <button class="button secondary" type="submit">Filter</button>
        <a class="text-link" href="{{ route('tokens.wallet', ['period' => $period]) }}">Reset</a>
    </form>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Aktivitas</th><th>Status</th><th>Jumlah</th><th>Saldo tersedia setelah</th></tr></thead><tbody>
    @forelse($ledger as $entry)
        @php($labels = ['credit' => 'Token dibeli', 'debit' => 'Token digunakan', 'reserve' => 'Token ditahan', 'release' => 'Reservasi dikembalikan'])
        @php($statuses = ['completed' => 'Selesai', 'reserved' => 'Proses', 'failed' => 'Gagal', 'needs_reconciliation' => 'Perlu pemeriksaan'])
        <tr><td>{{ $entry['createdAt'] ? \Illuminate\Support\Carbon::parse($entry['createdAt'])->format('d M Y H:i') : '—' }}</td><td>{{ $labels[$entry['entry_type']] ?? $entry['reason'] }}</td><td><span class="tag {{ $entry['status'] === 'needs_reconciliation' ? 'danger-tag' : '' }}">{{ $statuses[$entry['status']] ?? $entry['status'] }}</span></td><td>{{ number_format((int) $entry['amount'], 0, ',', '.') }} token</td><td>{{ number_format((int) $entry['available_after'], 0, ',', '.') }} token</td></tr>
    @empty
        <tr><td colspan="5"><x-empty-state title="Belum ada riwayat kuota" description="Pembelian dan penggunaan token akan muncul di sini setelah tercatat oleh server." /></td></tr>
    @endforelse
    </tbody></table></div>
    <div class="pagination-wrap">{{ $ledger->links() }}</div>
</section>
<section class="panel wallet-section">
    <div class="section-heading"><div><h2>Penggunaan AI terbaru</h2><p class="muted small">Token input dan output dicatat dari metadata provider.</p></div><a class="text-link" href="{{ route('ai.analysis') }}">Buat analisis <x-icon name="arrow" /></a></div>
    <form method="get" action="{{ route('tokens.wallet') }}" class="filter-bar">
        <input type="hidden" name="period" value="{{ $period }}">
        @if(!empty($filters['type']))<input type="hidden" name="type" value="{{ $filters['type'] }}">@endif
        <label><span class="small-label">Status penggunaan</span><select name="usage_status"><option value="">Semua status</option><option value="reserved" @selected(($filters['usage_status'] ?? '') === 'reserved')>Proses</option><option value="completed" @selected(($filters['usage_status'] ?? '') === 'completed')>Selesai</option><option value="failed" @selected(($filters['usage_status'] ?? '') === 'failed')>Gagal</option><option value="needs_reconciliation" @selected(($filters['usage_status'] ?? '') === 'needs_reconciliation')>Perlu pemeriksaan</option></select></label>
        <button class="button secondary" type="submit">Filter penggunaan</button>
    </form>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Status</th><th>Input</th><th>Output</th><th>Total debit</th></tr></thead><tbody>
    @forelse($usages as $usage)
        @php($usageLabels = ['reserved' => 'Proses', 'completed' => 'Selesai', 'failed' => 'Gagal', 'needs_reconciliation' => 'Perlu pemeriksaan'])
        <tr><td>{{ \Illuminate\Support\Carbon::parse($usage['createdAt'])->format('d M Y H:i') }}</td><td><span class="tag {{ $usage['status'] === 'needs_reconciliation' ? 'danger-tag' : '' }}">{{ $usageLabels[$usage['status']] ?? $usage['status'] }}</span></td><td>{{ $usage['input_tokens'] === null ? '—' : number_format((int) $usage['input_tokens'], 0, ',', '.') }}</td><td>{{ $usage['output_tokens'] === null ? '—' : number_format((int) $usage['output_tokens'], 0, ',', '.') }}</td><td>{{ $usage['actual_tokens'] === null ? '—' : number_format((int) $usage['actual_tokens'], 0, ',', '.') }} token</td></tr>
    @empty
        <tr><td colspan="5"><x-empty-state title="Belum ada penggunaan AI" description="Setelah analisis pertama selesai, rincian input dan output akan tampil di sini." /></td></tr>
    @endforelse
    </tbody></table></div>
    <div class="pagination-wrap">{{ $usages->links() }}</div>
    <p class="muted small wallet-footnote">Saldo ditahan adalah kuota yang sudah diamankan untuk permintaan aktif. Jika provider memberikan hasil yang tidak pasti, kuota tetap ditahan sampai pemeriksaan selesai.</p>
</section>
@endsection
