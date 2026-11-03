@extends('layouts.app')
@section('title', 'Ringkasan')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Gambaran bulan ini</p>
            <h1>Keuangan, lebih terarah.</h1>
            <p class="subtitle">Lihat kebiasaan belanja dan ruang anggaran Anda.</p>
        </div>
        <form class="period-filter" method="get"><label class="sr-only" for="period">Periode ringkasan</label><input
                type="month" id="period" name="period" value="{{ $period }}" required><button
                class="button secondary" type="submit" aria-label="Tampilkan periode"><x-icon
                    name="filter" /><span>Tampilkan</span></button></form>
    </div>
    <div class="overview-grid">
        <section class="hero-card" aria-labelledby="spending-title">
            <div class="hero-card-top"><span class="hero-icon"><x-icon name="wallet" /></span><span
                    class="hero-period">{{ $periodLabel }}</span></div>
            <p id="spending-title">Total pengeluaran</p><strong
                class="hero-amount">{{ \App\Support\Money::rupiah($total) }}</strong>
            <div class="hero-card-bottom"><span>{{ $rows->count() }} transaksi tercatat</span><a
                    href="{{ route('expenses.create') }}" aria-label="Catat pengeluaran baru"><x-icon name="plus" /></a>
            </div>
        </section>
        <section class="overview-side">
            <div class="stat-card"><span class="stat-icon"><x-icon name="chart" /></span>
                <div>
                    <p>Alokasi anggaran</p>
                    <strong>{{ $summary ? \App\Support\Money::rupiah(\App\Support\Money::cents((string) $summary['total_allocated'])) : 'Belum diatur' }}</strong><span
                        class="muted small">{{ $periodLabel }}</span>
                </div>
            </div>
            <div class="stat-card"><span class="stat-icon"><x-icon name="shield" /></span>
                <div>
                    <p>Sisa alokasi</p>
                    <strong>{{ $summary ? \App\Support\Money::rupiah(\App\Support\Money::cents((string) $summary['total_remaining'])) : '—' }}</strong><span
                        class="muted small">Hanya kategori dalam anggaran</span>
                </div>
            </div>
        </section>
    </div>
    <div class="two-columns">
        <section class="panel">
            <div class="section-heading">
                <h2>Pengeluaran per kategori</h2><span class="tag">{{ $periodLabel }}</span>
            </div>
            @forelse($groups as $group)
                <div class="category-bar">
                    <div class="bar-label">
                        <span>{{ $group['name'] }}</span><strong>{{ \App\Support\Money::rupiah($group['amount']) }}</strong>
                    </div><meter min="0" max="{{ max($total, 1) }}" value="{{ $group['amount'] }}"
                        aria-label="{{ $group['name'] }}: {{ \App\Support\Money::rupiah($group['amount']) }}"></meter>
            </div>@empty<x-empty-state title="Belum ada pengeluaran"
                    description="Pengeluaran yang Anda catat akan muncul di sini." />
            @endforelse
        </section>
        <section class="panel">
            <div class="section-heading">
                <h2>Jaga ruang anggaran</h2><span class="section-icon"><x-icon name="chart" /></span>
            </div>
            @if ($summary)
                @php($allocated = \App\Support\Money::cents((string) $summary['total_allocated']))
                @php($spent = \App\Support\Money::cents((string) $summary['total_spent']))
                <p class="muted">Pemakaian pada kategori yang dialokasikan.</p><strong
                    class="budget-amount">{{ \App\Support\Money::rupiah($spent) }}</strong><meter class="large-meter"
                    min="0" max="{{ max($allocated, 1) }}" value="{{ min($spent, max($allocated, 1)) }}"
                    aria-label="Pemakaian anggaran"></meter>
                <p class="small muted">Dari alokasi {{ \App\Support\Money::rupiah($allocated) }}</p><a class="text-link"
                    href="{{ route('budgets.show', $summary['budget_id']) }}">Lihat rincian anggaran <x-icon
                        name="arrow" /></a>
            @else<x-empty-state title="Mulai dari anggaran"
                    description="Belum ada anggaran pada periode ini. Anggaran yang dibuat melalui API akan tampil di sini." /><a
                    class="text-link" href="{{ route('budgets.index') }}">Lihat anggaran <x-icon name="arrow" /></a>
            @endif
        </section>
    </div>
    <section class="panel">
        <div class="section-heading">
            <div>
                <h2>Catatan terbaru</h2>
                <p class="muted small">{{ $periodLabel }} · Berdasarkan tanggal pencatatan</p>
            </div><a class="text-link" href="{{ route('expenses.index', ['period' => $period]) }}">Lihat semua <x-icon
                    name="arrow" /></a>
        </div>@include('partials.expenses', ['items' => $rows->take(5), 'allowActions' => false])
    </section>
@endsection
