@extends('layouts.app')
@section('title', 'Rincian anggaran')
@section('content')
    <div class="page-heading">
        <div><a class="back-link" href="{{ route('budgets.index') }}"><x-icon name="left" />Semua anggaran</a>
            <h1>{{ \Carbon\CarbonImmutable::create($summary['year'], $summary['month'], 1)->locale('id')->translatedFormat('F Y') }}
            </h1>
            <p class="subtitle">Rincian pemakaian pada kategori yang dialokasikan.</p>
        </div>
    </div>
    <div class="metric-grid">
        @foreach (['total_allocated' => 'Alokasi', 'total_spent' => 'Terpakai', 'total_remaining' => 'Sisa alokasi'] as $key => $label)
            <section class="panel metric">
                <p class="muted small">{{ $label }}</p>
                <strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $summary[$key])) }}</strong>
            </section>
        @endforeach
    </div>
    <section class="panel">
        <div class="section-heading">
            <h2>Per kategori</h2><span class="tag">{{ count($summary['categories']) }} kategori</span>
        </div>
        <div class="budget-category-list">
            @foreach ($summary['categories'] as $category)
                <article>
                    <div class="bar-label">
                        <h3>{{ $category['name'] }}</h3><span
                            class="tag {{ $category['over_budget'] ? 'danger-tag' : '' }}">{{ $category['over_budget'] ? 'Melebihi alokasi' : 'Dalam alokasi' }}</span>
                    </div>
                    <div class="budget-line">
                        <span>Alokasi</span><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $category['allocated_amount'])) }}</strong>
                    </div>
                    <div class="budget-line">
                        <span>Terpakai</span><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $category['spent'])) }}</strong>
                    </div>
                    <div class="budget-line">
                        <span>Sisa</span><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $category['remaining'])) }}</strong>
                    </div>
                </article>
            @endforeach
        </div>
    </section>
@endsection
