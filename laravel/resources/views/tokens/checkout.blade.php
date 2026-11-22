@extends('layouts.app')
@section('title', 'Status checkout')
@section('content')
<section class="panel checkout-panel">
    <span class="empty-icon"><x-icon name="shield" /></span>
    <p class="eyebrow">Pembelian token</p><h1>Checkout pembayaran</h1>
    <p class="muted">Selesaikan pembayaran sandbox. Saldo hanya berubah setelah webhook terverifikasi.</p>
    <div class="checkout-recap"><strong>{{ $checkout['purchase']['bundle_name_snapshot'] }}</strong>
        <p>{{ number_format($checkout['purchase']['token_quota_snapshot'], 0, ',', '.') }} token · {{ \App\Support\Money::rupiah(\App\Support\Money::cents($checkout['purchase']['price_idr_snapshot'])) }}</p>
        <x-status-badge :status="$checkout['purchase']['status']" />
    </div>
    @if($checkout['available'])
    <form method="post" action="{{ route('token-purchases.checkout.start', $checkout['purchase']['order_id']) }}">
        @csrf
        <button class="button full" type="submit">Bayar dengan Midtrans Sandbox</button>
    </form>
    @else
    <p class="muted">Order ini tidak lagi menunggu pembayaran. Segarkan halaman status untuk melihat hasil verifikasi.</p>
    @endif
    <a class="text-link" href="{{ route('token-purchases.show', $checkout['purchase']['order_id']) }}">Kembali ke order</a>
</section>
@endsection
