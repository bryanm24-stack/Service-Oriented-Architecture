@extends('layouts.app')
@section('title', $category ? 'Edit kategori' : 'Tambah kategori')
@section('content')
<a class="text-link" href="{{ route('admin.categories.index') }}"><x-icon name="left" />Kategori admin</a>
<div class="page-heading"><div><p class="eyebrow">Administrator</p><h1>{{ $category ? 'Edit kategori' : 'Tambah kategori' }}</h1><p class="subtitle">Kategori digunakan bersama untuk transaksi dan anggaran.</p></div></div>
<form method="post" class="panel catalog-form category-form" action="{{ $category ? route('admin.categories.update', $category['id']) : route('admin.categories.store') }}">
    @csrf @if($category) @method('PUT') @endif
    <x-form-field name="name" label="Nama kategori" :value="$category['name'] ?? ''" maxlength="100" :required="true" />
    <x-form-field name="icon" label="Ikon / label (opsional)" :value="$category['icon'] ?? ''" maxlength="255" help="Teks atau emoji. Konten diperlakukan sebagai teks." />
    <div class="form-actions"><a class="button secondary" href="{{ route('admin.categories.index') }}">Batal</a><button class="button" type="submit">Simpan kategori</button></div>
</form>
@endsection
