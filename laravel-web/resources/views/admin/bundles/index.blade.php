@extends('layouts.app')
@section('title', 'Kelola paket')
@section('content')
<div class="page-heading"><div><p class="eyebrow">Administrator</p><h1>Kelola paket token</h1><p class="subtitle">Katalog bersama. Perubahan harga tidak mengubah snapshot order lama.</p></div>
    <a class="button" href="{{ route('admin.bundles.create') }}"><x-icon name="plus" />Tambah paket</a></div>
<form method="get" class="catalog-filter">
    <x-form-field name="status" label="Status paket"><select id="status" name="status">
        @foreach(['all' => 'Semua status', 'active' => 'Aktif', 'inactive' => 'Nonaktif', 'archived' => 'Arsip'] as $value => $label)
        <option value="{{ $value }}" @selected($status === $value)>{{ $label }}</option>@endforeach
    </select></x-form-field><button class="button secondary" type="submit">Terapkan</button>
</form>
<section class="panel">
<x-data-table caption="Katalog paket administrator" :columns="['Paket', 'Kuota', 'Harga IDR', 'Status', 'Tindakan']" :empty="$bundles->isEmpty()" empty-title="Belum ada paket pada status ini" empty-description="Tambahkan paket baru atau ubah filter status.">
@foreach($bundles as $bundle)
<tr><td><strong class="table-name">{{ $bundle['name'] }}</strong><span class="small muted">#{{ $bundle['id'] }}</span></td>
    <td>{{ number_format($bundle['token_quota'], 0, ',', '.') }} token</td>
    <td>{{ \App\Support\Money::rupiah(\App\Support\Money::cents($bundle['price_idr'])) }}</td>
    <td><x-status-badge :status="!empty($bundle['deletedAt']) ? 'archived' : ($bundle['is_active'] ? 'active' : 'inactive')" /></td>
    <td>@if(empty($bundle['deletedAt']))
        <div class="row-actions"><a class="button secondary compact-button" href="{{ route('admin.bundles.edit', $bundle['id']) }}">Edit</a>
        <form method="post" action="{{ route('admin.bundles.destroy', $bundle['id']) }}" data-confirm data-confirm-title="Arsipkan paket?" data-confirm-description="Paket tidak bisa dibeli lagi. Histori order tetap tersimpan." data-confirm-label="Ya, arsipkan">@csrf @method('DELETE')
            <button class="button destructive compact-button" type="submit">Arsipkan</button></form></div>
        @else<span class="muted small">Histori dipertahankan</span>@endif</td></tr>
@endforeach
</x-data-table>
@include('partials.catalog-pagination', ['paginator' => $bundles, 'label' => 'katalog admin'])
</section>
@endsection
