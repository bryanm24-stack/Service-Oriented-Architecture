@extends('layouts.app')
@section('title', 'Paket token')
@section('content')
<div class="page-heading">
    <div><p class="eyebrow">Sesuai kebutuhanmu</p><h1>Paket token AI</h1>
        <p class="subtitle">Pilih paket sekali beli. Harga dan kuota mengikuti katalog yang tersedia.</p></div>
    <a class="button secondary" href="{{ route('token-purchases.index') }}">Riwayat order <x-icon name="arrow" /></a>
</div>
<div class="catalog-notice"><x-icon name="info" /><div><strong>Pembayaran belum dibuka</strong>
    <p>Tombol beli membuat order lokal berstatus pending. Kuota belum bertambah. Pembelian paket tidak mengubah tier atau mengaktifkan langganan bulanan.</p></div></div>
<div class="bundle-grid">
@forelse($bundles as $bundle)
<article class="panel bundle-card" id="paket-{{ $bundle['id'] }}">
    <div class="section-heading"><span class="stat-icon"><x-icon name="sparkle" /></span><x-status-badge :status="$bundle['is_active'] ? 'active' : 'inactive'" /></div>
    <h2>{{ $bundle['name'] }}</h2>
    <p class="bundle-quota">{{ number_format($bundle['token_quota'], 0, ',', '.') }} <span>token</span></p>
    <p class="bundle-price">{{ \App\Support\Money::rupiah(\App\Support\Money::cents($bundle['price_idr'])) }} <span>IDR · sekali beli</span></p>
    <p class="muted small">Kuota hanya dapat diberikan setelah pembayaran terverifikasi pada tahap berikutnya.</p>
    <form method="post" action="{{ route('token-purchases.store') }}">
        @csrf
        <input type="hidden" name="token_bundle_id" value="{{ $bundle['id'] }}">
        <input type="hidden" name="idempotency_key" value="{{ $keys[$bundle['id']] }}">
        <button type="submit" class="button full">Beli paket <x-icon name="arrow" /></button>
    </form>
</article>
@empty
<section class="panel wide"><x-empty-state title="Paket belum tersedia" description="Belum ada paket aktif. Silakan kembali setelah katalog tersedia." /></section>
@endforelse
</div>
@include('partials.catalog-pagination', ['paginator' => $bundles, 'label' => 'paket'])
@endsection
