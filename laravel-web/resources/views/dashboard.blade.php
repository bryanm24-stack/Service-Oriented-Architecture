@extends('layouts.app')
@section('title', 'Dashboard')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Ruang keuangan pribadi</p>
            <h1>Ringkasan keuangan.</h1>
            <p class="subtitle">Lihat arus kas tercatat Anda pada {{ $periodLabel }}.</p>
        </div><a class="button" href="{{ route('expenses.create') }}"><x-icon name="plus" />Tambah transaksi</a>
    </div>
    <form method="get" action="{{ route('dashboard') }}" class="period-picker">
        <div class="field"><label for="period">Periode</label><input id="period" name="period" type="month"
                value="{{ $period }}" required></div><button class="button secondary" type="submit">Terapkan</button>
    </form>
    @include('partials.cash-flow')
    <section class="panel">
        <div class="section-heading">
            <div>
                <h2>Transaksi terbaru</h2>
                <p class="muted small">{{ $periodLabel }} · Berdasarkan tanggal pencatatan</p>
            </div><a class="text-link" href="{{ route('expenses.index', ['period' => $period]) }}">Lihat semua <x-icon
                    name="arrow" /></a>
        </div>@include('partials.expenses', ['items' => $rows, 'allowActions' => false])
    </section>
@endsection
