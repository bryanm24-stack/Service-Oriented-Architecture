@extends('layouts.app')
@section('title', 'Koneksi data')
@section('content')<section class="panel error-panel"><span class="app-icon"><x-icon name="offline" /></span>
        <p class="eyebrow">Koneksi data</p>
        <h1>Belum bisa memuat data.</h1>
        <p>{{ $message }}</p><a class="button" href="{{ route('dashboard') }}">Coba kembali</a><a class="text-link"
            href="{{ route('application') }}">Tentang aplikasi</a>
</section>@endsection
