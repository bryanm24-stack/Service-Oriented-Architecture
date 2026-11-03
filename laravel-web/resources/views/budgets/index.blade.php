@extends('layouts.app')
@section('title', 'Anggaran')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Rencanakan dengan tenang</p>
            <h1>Anggaran</h1>
            <p class="subtitle">Batas pengeluaran untuk prioritas Anda.</p>
        </div><span class="tag">{{ $budgets->count() }} periode</span>
    </div>
    <div class="budget-grid">
        @forelse($budgets as $budget)
            @php($allocated = collect($budget['categories'] ?? [])->sum(fn($category) => \App\Support\Money::cents((string) ($category['Budget_categories']['allocated_amount'] ?? ($category['BudgetCategory']['allocated_amount'] ?? '0.00')))))
            <article class="panel budget-card">
                <div class="section-heading"><span class="stat-icon"><x-icon name="chart" /></span><span
                        class="tag">{{ count($budget['categories'] ?? []) }} kategori</span></div>
                <p class="muted small">
                    {{ \Carbon\CarbonImmutable::create($budget['year'], $budget['month'], 1)->locale('id')->translatedFormat('F Y') }}
                </p>
                <h2>{{ \App\Support\Money::rupiah($allocated) }}</h2>
                <p class="muted small">Total alokasi pengeluaran</p><a class="text-link"
                    href="{{ route('budgets.show', $budget['budget_id']) }}">Lihat rincian <x-icon name="arrow" /></a>
        </article>@empty<section class="panel wide"><x-empty-state title="Anggaran belum tersedia"
                    description="Anggaran yang dibuat melalui API akan tampil di sini. Mulai dengan kategori kebutuhan utama Anda." />
            </section>
        @endforelse
    </div>
@endsection
