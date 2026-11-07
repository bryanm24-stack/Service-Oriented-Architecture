@extends('layouts.app')
@section('title', 'Riwayat order')
@section('content')
<div class="page-heading"><div><p class="eyebrow">Pembelian token</p><h1>Riwayat order</h1><p class="subtitle">Nama, harga, dan kuota di bawah mengikuti snapshot ketika order dibuat.</p></div>
    <a class="button secondary" href="{{ route('tokens.index') }}">Lihat paket</a></div>
<form method="get" class="catalog-filter">
    <x-form-field name="status" label="Status order"><select name="status" id="status">
        <option value="">Semua status</option>
        @foreach(['pending' => 'Pending', 'paid' => 'Paid', 'failed' => 'Gagal', 'cancelled' => 'Dibatalkan', 'expired' => 'Kedaluwarsa'] as $value => $label)
        <option value="{{ $value }}" @selected(request('status') === $value)>{{ $label }}</option>
        @endforeach
    </select></x-form-field><button class="button secondary" type="submit">Terapkan</button>
</form>
<section class="panel">
    <x-data-table caption="Riwayat order token" :columns="['Order / Paket', 'Kuota', 'Harga IDR', 'Status', 'Detail']" :empty="$purchases->isEmpty()" empty-title="Belum ada order" empty-description="Pilih paket untuk membuat order lokal pertama.">
        @foreach($purchases as $purchase)
        <tr><td><strong class="table-name">{{ $purchase['bundle_name_snapshot'] }}</strong><span class="order-code small muted">{{ $purchase['order_id'] }}</span></td>
            <td>{{ number_format($purchase['token_quota_snapshot'], 0, ',', '.') }} token</td>
            <td>{{ \App\Support\Money::rupiah(\App\Support\Money::cents($purchase['price_idr_snapshot'])) }}</td>
            <td><x-status-badge :status="$purchase['status']" /></td>
            <td><a class="button secondary compact-button" href="{{ route('token-purchases.show', $purchase['order_id']) }}">Lihat</a></td></tr>
        @endforeach
    </x-data-table>
    @include('partials.catalog-pagination', ['paginator' => $purchases, 'label' => 'riwayat order'])
</section>
@endsection
