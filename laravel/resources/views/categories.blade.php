@extends('layouts.app')
@section('title', 'Kategori')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Rapikan setiap catatan</p>
            <h1>Kategori pengeluaran</h1>
            <p class="subtitle">Kategori bersama untuk pengeluaran dan anggaran.</p>
        </div><span class="tag">{{ count($categories) }} kategori</span>
    </div>
    <div class="category-grid">
        @forelse($categories as $category)
            <article class="panel category-card"><span class="stat-icon"><x-icon name="grid" /></span>
                <div>
                    <h2>{{ $category['name'] }}</h2>
                    <p class="muted small">Kategori bersama</p>
                </div>
        </article>@empty<section class="panel wide"><x-empty-state title="Kategori belum tersedia"
                    description="Siapkan kategori melalui API agar pengeluaran dapat dicatat." /></section>
        @endforelse
    </div>
@endsection
