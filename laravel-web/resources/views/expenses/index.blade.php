@extends('layouts.app')
@section('title', 'Pengeluaran')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Catatan keuangan</p>
            <h1>Pengeluaran</h1>
            <p class="subtitle">Semua pengeluaran, tersusun dalam satu tempat.</p>
        </div><a class="button desktop-action" href="{{ route('expenses.create') }}"><x-icon name="plus" />Tambah
            pengeluaran</a>
    </div>
    <div class="list-summary"><span class="stat-icon"><x-icon name="receipt" /></span>
        <div><span class="muted small">Total sesuai filter</span><strong>{{ \App\Support\Money::rupiah($total) }}</strong>
        </div><span class="tag">{{ $expenses->total() }} transaksi</span>
    </div>
    <section class="panel">
        <form class="filter-grid" method="get" action="{{ route('expenses.index') }}">
            <div class="field"><label for="search">Cari catatan</label>
                <div class="input-icon"><x-icon name="search" /><input id="search" name="search"
                        value="{{ request('search') }}" placeholder="Contoh: makan siang" maxlength="255"></div>
            </div>
            <div class="field"><label for="category">Kategori</label><select id="category" name="category">
                    <option value="">Semua kategori</option>
                    @foreach ($categories as $category)
                        <option value="{{ $category['id'] }}" @selected((string) request('category') === (string) $category['id'])>{{ $category['name'] }}</option>
                    @endforeach
                </select>
            </div>
            <div class="field"><label for="period">Periode</label><input type="month" name="period" id="period"
                    value="{{ $period }}" required></div><button class="button secondary filter-button"
                type="submit"><x-icon name="filter" />Terapkan</button>
        </form>
        @include('partials.expenses', ['items' => $expenses, 'allowActions' => true])
        @if ($expenses->total())
            <div class="pagination"><span>{{ $expenses->firstItem() }}–{{ $expenses->lastItem() }} dari
                    {{ $expenses->total() }}</span>
                <div class="pagination-buttons">
                    @if ($expenses->onFirstPage())
                        <span class="pager disabled" aria-disabled="true"><x-icon name="left" /><span
                            class="sr-only">Sebelumnya</span></span>@else<a class="pager"
                            href="{{ $expenses->previousPageUrl() }}" aria-label="Halaman sebelumnya"><x-icon
                                name="left" /></a>
                    @endif
                    <span class="pager current" aria-current="page">
                        {{ $expenses->currentPage() }}</span>
                    @if ($expenses->hasMorePages())
                        <a class="pager" href="{{ $expenses->nextPageUrl() }}" aria-label="Halaman berikutnya"><x-icon
                            name="right" /></a>@else<span class="pager disabled" aria-disabled="true"><x-icon
                                name="right" /><span class="sr-only">Berikutnya</span></span>
                    @endif
                </div>
            </div>
        @endif
    </section>
@endsection
