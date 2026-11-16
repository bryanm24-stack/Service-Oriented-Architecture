@extends('layouts.app')
@section('title', 'Kelola kategori')
@section('content')
<div class="page-heading"><div><p class="eyebrow">Administrator</p><h1>Kelola kategori</h1><p class="subtitle">Kategori yang dipakai transaksi atau anggaran tidak dapat dihapus.</p></div>
    <a class="button" href="{{ route('admin.categories.create') }}"><x-icon name="plus" />Tambah kategori</a></div>
<section class="panel">
<x-data-table caption="Kategori administrator" :columns="['Kategori', 'Ikon / label', 'Tindakan']" :empty="count($categories) === 0" empty-title="Kategori belum tersedia" empty-description="Tambahkan kategori pertama untuk transaksi dan anggaran.">
@foreach($categories as $category)
<tr><td><strong class="table-name">{{ $category['name'] }}</strong><span class="muted small">#{{ $category['id'] }}</span></td>
    <td><span class="table-name">{{ $category['icon'] ?: '—' }}</span></td>
    <td><div class="row-actions"><a class="button secondary compact-button" href="{{ route('admin.categories.edit', $category['id']) }}">Edit</a>
        <form method="post" action="{{ route('admin.categories.destroy', $category['id']) }}" data-confirm data-confirm-title="Hapus kategori?" data-confirm-description="Kategori hanya dapat dihapus bila tidak dipakai transaksi atau anggaran." data-confirm-label="Ya, hapus">@csrf @method('DELETE')<button class="button destructive compact-button" type="submit">Hapus</button></form>
    </div></td></tr>
@endforeach
</x-data-table>
</section>
@endsection
