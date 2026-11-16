@extends('layouts.app')
@section('title', $bundle ? 'Edit paket' : 'Tambah paket')
@section('content')
<a class="text-link" href="{{ route('admin.bundles.index') }}"><x-icon name="left" />Katalog paket</a>
<div class="page-heading"><div><p class="eyebrow">Administrator</p><h1>{{ $bundle ? 'Edit paket token' : 'Tambah paket token' }}</h1><p class="subtitle">Seluruh field wajib diisi. Harga memakai IDR tanpa pemisah ribuan.</p></div></div>
<div class="form-layout">
<form class="panel catalog-form" method="post" action="{{ $bundle ? route('admin.bundles.update', $bundle['id']) : route('admin.bundles.store') }}">
@csrf @if($bundle) @method('PUT') @endif
<x-form-field name="name" label="Nama paket" :value="$bundle['name'] ?? ''" maxlength="100" :required="true" autocomplete="off" help="Contoh: DEMO Hemat. Spasi berlebih akan dirapikan." />
<x-form-field name="token_quota" label="Kuota token" type="number" :value="$bundle['token_quota'] ?? ''" min="1" max="2147483647" step="1" :required="true" inputmode="numeric" help="Bilangan bulat positif; bukan nominal rupiah." />
<x-form-field name="price_idr" label="Harga IDR" :value="$bundle['price_idr'] ?? ''" maxlength="16" inputmode="decimal" :required="true" help="Contoh: 15000 atau 15000.50. Harga harus lebih dari nol." />
<x-form-field name="is_active" label="Status paket" :required="true"><select id="is_active" name="is_active" required @if($errors->has('is_active')) aria-invalid="true" aria-describedby="is_active-help" @endif>
    <option value="1" @selected((string)old('is_active', ($bundle['is_active'] ?? true) ? '1' : '0') === '1')>Aktif · tampil pada pengguna</option>
    <option value="0" @selected((string)old('is_active', ($bundle['is_active'] ?? true) ? '1' : '0') === '0')>Nonaktif · sembunyikan dari katalog</option>
</select></x-form-field>
<div class="form-actions"><a class="button secondary" href="{{ route('admin.bundles.index') }}">Batal</a><button class="button" type="submit">Simpan paket</button></div>
</form>
<aside class="panel form-aside"><span class="stat-icon"><x-icon name="shield" /></span><h2>Histori tetap utuh</h2><p>Perubahan ini berlaku untuk order baru. Nama, harga, dan kuota pada order yang sudah dibuat tetap mengikuti snapshot sebelumnya.</p><p>Paket sekali beli tidak mengaktifkan tier atau subscription bulanan.</p></aside>
</div>
@endsection
