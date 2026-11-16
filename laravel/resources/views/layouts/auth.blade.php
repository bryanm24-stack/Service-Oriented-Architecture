<!doctype html>
<html lang="id">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0f766e">
    <title>@yield('title') · ProjectSOA</title>
    <link rel="icon" href="{{ asset('icons/icon.svg') }}">
    <link rel="stylesheet" href="{{ asset('assets/app.v1.css') }}">
</head>

<body class="auth-page">
    <main class="auth-shell">
        <section class="auth-intro"><a class="brand" href="{{ route('login') }}"><span class="brand-mark"><x-icon
                        name="wallet" /></span><span>ProjectSOA<small>Keuangan pribadi</small></span></a>
            <div>
                <p class="eyebrow">Mulai lebih teratur</p>
                <h1>Kenali arus kas.<br>Rencanakan langkah berikutnya.</h1>
                <p>Catat pemasukan, pahami pengeluaran, dan lihat perkembangannya dalam satu ruang keuangan.</p>
                <div class="auth-points"><span><x-icon name="check" />Catatan dalam satu tempat</span><span><x-icon
                            name="check" />Ringkasan sesuai periode</span><span><x-icon name="check" />Nyaman di
                        desktop dan ponsel</span></div>
            </div>
            <p class="small">Satu kebiasaan kecil untuk keputusan yang lebih baik.</p>
        </section>
        <section class="auth-form-panel">
            <div class="auth-form-inner">
                <p class="eyebrow">Ruang keuangan Anda</p>
                <h2>@yield('heading')</h2>
                <p class="subtitle">@yield('subtitle')</p>
                @if (session('success'))
                    <div class="alert success" role="status">{{ session('success') }}</div>
                @endif
                @if ($errors->any())
                    <div class="alert danger" role="alert">
                        <div><strong>Periksa isian Anda.</strong>
                            <ul>
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                @endif
                @yield('content')
            </div>
        </section>
    </main>
</body>

</html>
