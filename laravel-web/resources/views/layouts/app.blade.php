<!doctype html>
<html lang="id">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0f766e">
    <meta name="description" content="Catat pengeluaran dan pantau anggaran pribadi bersama ProjectSOA.">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>@yield('title', 'Keuangan') · ProjectSOA</title>
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <link rel="icon" href="{{ asset('icons/icon.svg') }}" type="image/svg+xml">
    <link rel="apple-touch-icon" href="{{ asset('icons/apple-touch-icon.png') }}">
    <link rel="stylesheet" href="{{ asset('assets/app.v1.css') }}">
    <script src="{{ asset('assets/app.v1.js') }}" defer></script>
</head>

<body>
    <a class="skip-link" href="#main-content">Lewati ke konten</a>
    <div class="app-shell">
        <aside class="sidebar">
            <a class="brand" href="{{ route('dashboard') }}"><span class="brand-mark"><x-icon
                        name="wallet" /></span><span>ProjectSOA<small>Keuangan pribadi</small></span></a>
            <p class="nav-label">Ruang keuangan</p>
            <nav aria-label="Navigasi utama">
                <a class="nav-link {{ request()->routeIs('dashboard') ? 'active' : '' }}"
                    href="{{ route('dashboard') }}" @if (request()->routeIs('dashboard')) aria-current="page" @endif><x-icon
                        name="home" />Ringkasan</a>
                <a class="nav-link {{ request()->routeIs('expenses.*') ? 'active' : '' }}"
                    href="{{ route('expenses.index') }}"
                    @if (request()->routeIs('expenses.*')) aria-current="page" @endif><x-icon name="receipt" />Transaksi</a>
                <a class="nav-link {{ request()->routeIs('budgets.*') ? 'active' : '' }}"
                    href="{{ route('budgets.index') }}"
                    @if (request()->routeIs('budgets.*')) aria-current="page" @endif><x-icon name="chart" />Anggaran</a>
                <a class="nav-link {{ request()->routeIs('categories.*') ? 'active' : '' }}"
                    href="{{ route('categories.index') }}"
                    @if (request()->routeIs('categories.*')) aria-current="page" @endif><x-icon name="grid" />Kategori</a>
                <a class="nav-link {{ request()->routeIs('wishes.*') ? 'active' : '' }}"
                    href="{{ route('wishes.index') }}"
                    @if (request()->routeIs('wishes.*')) aria-current="page" @endif><x-icon name="sparkle" />Wish / Cicilan</a>
                <a class="nav-link {{ request()->routeIs('application') ? 'active' : '' }}"
                    href="{{ route('application') }}"
                    @if (request()->routeIs('application')) aria-current="page" @endif><x-icon name="phone" />Aplikasi</a>
                <a class="nav-link {{ request()->routeIs('tokens.*', 'token-purchases.*') ? 'active' : '' }}" href="{{ route('tokens.index') }}"
                    @if(request()->routeIs('tokens.*', 'token-purchases.*')) aria-current="page" @endif><x-icon name="sparkle" />Paket token</a>
                @if(session('soa.user.role') === 'admin')
                    <p class="nav-label">Administrator</p>
                    <a class="nav-link {{ request()->routeIs('admin.bundles.*') ? 'active' : '' }}" href="{{ route('admin.bundles.index') }}">Kelola paket</a>
                    <a class="nav-link {{ request()->routeIs('admin.categories.*') ? 'active' : '' }}" href="{{ route('admin.categories.index') }}">Kelola kategori</a>
                @endif
            </nav>
            <div class="sidebar-bottom"><span class="small-label">Satu langkah lebih teratur.</span>
                <p>Kenali pengeluaran hari ini untuk merencanakan hari esok.</p>
            </div>
        </aside>
        <div class="workspace">
            <header class="topbar">
                <a class="mobile-brand" href="{{ route('dashboard') }}"><span class="brand-mark"><x-icon
                            name="wallet" /></span>ProjectSOA</a>
                <span class="desktop-label">Ruang keuangan pribadi</span>
                <div class="topbar-actions"><span class="account-name">{{ session('soa.user.name') }}</span>
                    <form method="post" action="{{ route('logout') }}">@csrf<button
                            class="button secondary compact-button" type="submit">Keluar</button></form>
                </div>
            </header>
            <nav class="mobile-catalog-nav" aria-label="Katalog dan pengelolaan">
                <a href="{{ route('tokens.index') }}" @if(request()->routeIs('tokens.*')) aria-current="page" @endif>Paket token</a>
                <a href="{{ route('token-purchases.index') }}" @if(request()->routeIs('token-purchases.*')) aria-current="page" @endif>Order saya</a>
                <a href="{{ route('wishes.index') }}" @if(request()->routeIs('wishes.*')) aria-current="page" @endif>Wish / Cicilan</a>
                @if(session('soa.user.role') === 'admin')
                    <a href="{{ route('admin.bundles.index') }}" @if(request()->routeIs('admin.bundles.*')) aria-current="page" @endif>Kelola paket</a>
                    <a href="{{ route('admin.categories.index') }}" @if(request()->routeIs('admin.categories.*')) aria-current="page" @endif>Kelola kategori</a>
                @endif
            </nav>
            <main id="main-content" class="main-content" tabindex="-1">

                <div class="offline-banner" data-offline hidden role="status"><x-icon name="offline" />Koneksi
                    terputus. Perubahan belum bisa disimpan.</div>
                @if (session('success'))
                    <div class="alert success" role="status"><x-icon name="check" />{{ session('success') }}</div>
                @endif
                @if ($errors->any())
                    <div class="alert danger" role="alert"><x-icon name="info" />
                        <div><strong>Periksa kembali isian Anda.</strong>
                            <ul>
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                @endif
                @yield('content')
            </main>
            <footer class="page-footer">ProjectSOA <span>·</span> Catatan kecil, keputusan lebih baik.</footer>
        </div>
    </div>
    <nav class="bottom-nav" aria-label="Navigasi mobile">
        <a href="{{ route('dashboard') }}" class="{{ request()->routeIs('dashboard') ? 'active' : '' }}"
            @if (request()->routeIs('dashboard')) aria-current="page" @endif><x-icon
                name="home" /><span>Ringkasan</span></a>
        <a href="{{ route('expenses.index') }}"
            class="{{ request()->routeIs('expenses.index', 'expenses.edit') ? 'active' : '' }}"
            @if (request()->routeIs('expenses.index', 'expenses.edit')) aria-current="page" @endif><x-icon
                name="receipt" /><span>Catatan</span></a>
        <a class="add-nav" href="{{ route('expenses.create') }}" aria-label="Tambah transaksi"
            @if (request()->routeIs('expenses.create')) aria-current="page" @endif><span class="add-nav-icon"><x-icon
                    name="plus" /></span><span>Tambah</span></a>
        <a href="{{ route('budgets.index') }}" class="{{ request()->routeIs('budgets.*') ? 'active' : '' }}"
            @if (request()->routeIs('budgets.*')) aria-current="page" @endif><x-icon
                name="chart" /><span>Anggaran</span></a>
        <a href="{{ route('categories.index') }}" class="{{ request()->routeIs('categories.*') ? 'active' : '' }}"
            @if (request()->routeIs('categories.*')) aria-current="page" @endif><x-icon
                name="grid" /><span>Kategori</span></a>
    </nav>
    <dialog id="confirm-dialog" class="dialog" aria-labelledby="confirm-title">
        <div class="dialog-icon"><x-icon name="trash" /></div>
        <h2 id="confirm-title">Hapus transaksi?</h2>
        <p data-confirm-description>Catatan ini akan dihapus dari daftar transaksi Anda.</p>
        <div class="dialog-actions"><button type="button" class="button secondary"
                data-close-dialog>Batal</button><button type="button" class="button destructive"
                data-confirm-delete>Ya, hapus</button></div>
    </dialog>
    <dialog id="install-dialog" class="dialog" aria-labelledby="install-title">
        <div class="dialog-icon"><x-icon name="phone" /></div>
        <h2 id="install-title">Bawa ke layar utama</h2>
        <p>Di Android, buka menu browser lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar
                utama</strong>. Di iPhone, buka Safari, pilih <strong>Bagikan</strong>, lalu <strong>Tambah ke Layar
                Utama</strong>.</p>
        <p class="muted small">Pemasangan memerlukan HTTPS, atau localhost saat pengembangan.</p><button
            type="button" class="button full" data-close-dialog>Mengerti</button>
    </dialog>
</body>

</html>
