@extends('layouts.auth')
@section('title', 'Daftar')
@section('heading', 'Mulai catatan pertama Anda.')
@section('subtitle', 'Buat akun untuk mencatat pemasukan dan pengeluaran.')
@section('content')
    <form method="post" action="{{ route('register') }}" class="auth-form">
        @csrf
        @foreach (['name' => ['Nama lengkap', 'text', 'name'], 'email' => ['Email', 'email', 'email'], 'password' => ['Password', 'password', 'new-password'], 'konfirmasi_password' => ['Konfirmasi password', 'password', 'new-password']] as $field => $options)
            <div class="field"><label for="{{ $field }}">{{ $options[0] }}</label><input id="{{ $field }}"
                    name="{{ $field }}" type="{{ $options[1] }}" autocomplete="{{ $options[2] }}" required
                    @if ($options[1] !== 'password') value="{{ old($field) }}" maxlength="255" @else minlength="8" maxlength="100" @endif
                    @error($field) aria-invalid="true" @enderror>
                @if ($field === 'password')
                    <p class="field-help">Gunakan minimal 8 karakter.</p>
                @endif
                @error($field)
                    <p class="field-error">{{ $message }}</p>
                @enderror
            </div>
        @endforeach
        <button class="button full" type="submit">Buat akun <x-icon name="arrow" /></button>
    </form>
    <p class="auth-switch">Sudah punya akun? <a href="{{ route('login') }}">Masuk di sini</a></p>
@endsection
