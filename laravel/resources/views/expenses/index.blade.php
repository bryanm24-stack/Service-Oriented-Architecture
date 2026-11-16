@extends('layouts.app')
@section('title', 'Transaksi')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Catatan keuangan</p>
            <h1>Transaksi</h1>
            <p class="subtitle">Pemasukan dan pengeluaran, tersusun dalam satu tempat.</p>
        </div><a class="button" href="{{ route('expenses.create') }}"><x-icon name="plus" />Tambah transaksi</a>
    </div>
    @include('partials.cash-flow')
    <section class="panel">
        <form class="transaction-filters" method="get" action="{{ route('expenses.index') }}">
            <div class="field"><label for="search">Cari catatan</label><input id="search" name="search"
                    value="{{ $filters['search'] ?? '' }}" maxlength="255" placeholder="Contoh: makan siang"></div>
            <div class="field"><label for="type">Jenis transaksi</label><select id="type" name="type">
                    <option value="">Semua jenis</option>
                    <option value="income" @selected(($filters['type'] ?? '') === 'income')>Pemasukan</option>
                    <option value="expense" @selected(($filters['type'] ?? '') === 'expense')>Pengeluaran</option>
                </select></div>
            <div class="field"><label for="category_id">Kategori</label><select id="category_id" name="category_id">
                    <option value="">Semua kategori</option>
                    @foreach ($categories as $category)
                        <option value="{{ $category['id'] }}" @selected((string) ($filters['category_id'] ?? '') === (string) $category['id'])>{{ $category['name'] }}</option>
                    @endforeach
                </select>
            </div>
            <div class="field"><label for="start_date">Dari tanggal</label><input type="date" name="start_date"
                    id="start_date"
                    value="{{ $filters['start_date'] ?? (isset($filters['period']) ? $filters['period'] . '-01' : '') }}"></div>
            <div class="field"><label for="end_date">Sampai tanggal</label><input type="date" name="end_date"
                    id="end_date"
                    value="{{ $filters['end_date'] ??(isset($filters['period'])? \Carbon\CarbonImmutable::parse($filters['period'] . '-01')->endOfMonth()->format('Y-m-d'): '') }}">
            </div>
            <div class="field"><label for="sort_by">Urut berdasarkan</label><select id="sort_by" name="sort_by">
                    <option value="createdAt" @selected(($filters['sort_by'] ?? 'createdAt') === 'createdAt')>Tanggal</option>
                    <option value="nominal" @selected(($filters['sort_by'] ?? '') === 'nominal')>Nominal</option>
                </select></div>
            <div class="field"><label for="sort">Urutan</label><select id="sort" name="sort">
                    <option value="desc" @selected(($filters['sort'] ?? 'desc') === 'desc')>Menurun / terbaru</option>
                    <option value="asc" @selected(($filters['sort'] ?? '') === 'asc')>Menaik / terlama</option>
                </select></div>
            <div class="filter-actions"><button class="button secondary" type="submit"><x-icon
                        name="filter" />Terapkan</button><a class="text-link"
                    href="{{ route('expenses.index') }}">Reset</a></div>
        </form>
        @include('partials.expenses', ['items' => $expenses, 'allowActions' => true])
        @if ($expenses->total())
            <div class="pagination"><span>{{ $expenses->firstItem() ?? 0 }}–{{ $expenses->lastItem() ?? 0 }} dari
                    {{ $expenses->total() }}</span>
                <div class="pagination-buttons">
                    @if ($expenses->previousPageUrl())
                        <a class="pager" href="{{ $expenses->previousPageUrl() }}" aria-label="Halaman sebelumnya"><x-icon
                                name="left" /></a>
                    @endif
                    <span class="pager current" aria-current="page">
                        {{ $expenses->currentPage() }}</span>
                    @if ($expenses->nextPageUrl())
                        <a class="pager" href="{{ $expenses->nextPageUrl() }}" aria-label="Halaman berikutnya"><x-icon
                                name="right" /></a>
                    @endif
                </div>
            </div>
        @endif
    </section>
@endsection
