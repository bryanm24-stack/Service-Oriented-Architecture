@extends('layouts.app')
@section('title', 'Detail order')
@section('content')
<a class="text-link" href="{{ route('token-purchases.index') }}"><x-icon name="left" />Riwayat order</a>
<div class="page-heading"><div><p class="eyebrow">Pembelian token</p><h1>Detail order</h1><p class="subtitle order-code">{{ $purchase['order_id'] }}</p></div><x-status-badge :status="$purchase['status']" /></div>
<div class="two-columns">
<section class="panel order-summary"><p class="small-label">Paket saat dipesan</p><h2>{{ $purchase['bundle_name_snapshot'] }}</h2>
    <dl class="order-facts">
        <div><dt>Kuota paket</dt><dd>{{ number_format($purchase['token_quota_snapshot'], 0, ',', '.') }} token</dd></div>
        <div><dt>Total harga IDR</dt><dd>{{ \App\Support\Money::rupiah(\App\Support\Money::cents($purchase['price_idr_snapshot'])) }}</dd></div>
        <div><dt>Status</dt><dd><x-status-badge :status="$purchase['status']" /></dd></div>
    </dl>
    @if(!empty($purchase['bundle']['deletedAt']))<p class="muted small">Paket asal sudah diarsipkan. Detail order ini tetap tersimpan.</p>@endif
</section>
<section class="panel"><span class="stat-icon"><x-icon name="shield" /></span><h2 class="catalog-section-title">Belum ada pembayaran</h2>
    <p class="muted">Order pending belum dianggap paid dan belum memberikan kuota. Checkout akan tersedia setelah integrasi pembayaran selesai.</p>
    <a class="button secondary full checkout-link" href="{{ route('token-purchases.checkout', $purchase['order_id']) }}">Status checkout <x-icon name="arrow" /></a>
</section>
</div>
@if(!empty($purchase['bundle']['is_active']) && empty($purchase['bundle']['deletedAt']))
<form method="post" action="{{ route('tokens.new-order', $purchase['token_bundle_id']) }}" class="repeat-order">
    @csrf
    <p class="muted small">Ingin membuat order terpisah? Harga order baru mengikuti katalog saat ini.</p>
    <button class="button secondary" type="submit">Siapkan order baru untuk paket ini</button>
</form>
@endif
@endsection
