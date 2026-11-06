<?php

namespace App\Http\Controllers;

use App\Services\AuthApi;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function loginForm()
    {
        return session()->has('soa.access_token') ? to_route('dashboard') : view('login');
    }

    public function registerForm()
    {
        return view('register');
    }

    public function login(Request $request, AuthApi $auth)
    {
        $values = $request->validate(['email' => ['required', 'email', 'max:255'], 'password' => ['required', 'string', 'max:100']]);
        $auth->login($values);

        return redirect()->intended(route('dashboard'));
    }

    public function register(Request $request, AuthApi $auth)
    {
        $values = $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', 'max:255'], 'password' => ['required', 'string', 'min:8', 'max:100'], 'konfirmasi_password' => ['required', 'same:password']]);
        $auth->register($values);

        return to_route('login')->with('success', 'Pendaftaran berhasil. Silakan masuk dengan akun baru Anda.');
    }

    public function logout(AuthApi $auth)
    {
        $auth->logout();

        return to_route('login')->with('success', 'Anda sudah keluar.');
    }
}
