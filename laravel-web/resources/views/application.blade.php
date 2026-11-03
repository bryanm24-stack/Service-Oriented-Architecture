@extends('layouts.app')
@section('title', 'Aplikasi')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Selalu dekat</p>
            <h1>Keuangan di genggaman.</h1>
            <p class="subtitle">Akses ProjectSOA langsung dari layar utama.</p>
        </div>
    </div>
    <div class="two-columns">
        <section class="panel install-panel"><span class="app-icon"><x-icon name="wallet" /></span>
            <h2>Pasang ProjectSOA</h2>
            <p class="muted">Tampilan yang nyaman di HP, tanpa membuka tab baru setiap kali.</p><button class="button"
                type="button" data-install><x-icon name="download" />Pasang aplikasi</button>
            <p class="field-help" data-installed hidden>Aplikasi sudah dibuka dalam mode mandiri.</p>
        </section>
        <section class="panel">
            <h2>Ketika koneksi terputus</h2>
            <ul class="feature-list">
                <li><span class="stat-icon"><x-icon name="offline" /></span>
                    <div><strong>Halaman offline yang jelas</strong>
                        <p>Anda tetap mendapat petunjuk saat jaringan tidak tersedia.</p>
                    </div>
                </li>
                <li><span class="stat-icon"><x-icon name="shield" /></span>
                    <div><strong>Data keuangan tidak disimpan offline</strong>
                        <p>Catatan dan respons API tidak masuk cache aplikasi.</p>
                    </div>
                </li>
                <li><span class="stat-icon"><x-icon name="check" /></span>
                    <div><strong>Simpan saat terhubung</strong>
                        <p>Perubahan memerlukan koneksi. Tidak ada antrean pengiriman otomatis.</p>
                    </div>
                </li>
            </ul>
        </section>
    </div>
@endsection
