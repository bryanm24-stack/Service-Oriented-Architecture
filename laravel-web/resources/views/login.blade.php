@extends('layouts.auth')
@section('title', 'Masuk')
@section('heading', 'Selamat datang kembali.')
@section('subtitle', 'Masuk untuk melanjutkan catatan keuangan Anda.')
@section('content')
    <form method="post" action="{{ route('login') }}" class="auth-form">
        @csrf
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email"
                value="{{ old('email') }}" autocomplete="username" required maxlength="255" placeholder="nama@email.com"
                @error('email') aria-invalid="true" @enderror>
            @error('email')
                <p class="field-error">{{ $message }}</p>
            @enderror
        </div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password"
                autocomplete="current-password" required maxlength="100" @error('password') aria-invalid="true" @enderror>
            @error('password')
                <p class="field-error">{{ $message }}</p>
            @enderror
        </div>
        <button class="button full" type="submit">Masuk <x-icon name="arrow" /></button>
    </form>
    <p class="auth-switch">Belum punya akun? <a href="{{ route('register') }}">Daftar sekarang</a></p>
@endsection
