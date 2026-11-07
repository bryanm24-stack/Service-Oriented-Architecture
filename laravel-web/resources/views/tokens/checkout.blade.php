@extends('layouts.app')
@section('title', 'Status checkout')
@section('content')
<section class="panel checkout-panel">
    <span class="empty-icon"><x-icon name="shield" /></span>
    <p class="eyebrow">Pembelian token</p><h1>Checkout belum tersedia</h1>
    <p class="muted">Order lokal sudah tersimpan. Pembayaran melalui Midtrans belum diaktifkan.</p>
    <div class="checkout-recap"><strong>{{ $checkout['purchase']['bundle_name_snapshot'] }}</strong>
        <p>{{ number_format($checkout['purchase']['token_quota_snapshot'], 0, ',', '.') }} token · {{ \App\Support\Money::rupiah(\App\Support\Money::cents($checkout['purchase']['price_idr_snapshot'])) }}</p>
        <x-status-badge :status="$checkout['purchase']['status']" />
    </div>
    <button class="button full" type="button" disabled>Bayar · belum tersedia</button>
    <p class="muted small">Tidak ada pembayaran atau pemberian kuota yang diproses di halaman ini.</p>
    <a class="text-link" href="{{ route('token-purchases.show', $checkout['purchase']['order_id']) }}">Kembali ke order</a>
</section>
@endsection
