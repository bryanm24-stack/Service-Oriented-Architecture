<?php

namespace App\Providers;

use Illuminate\Auth\GenericUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::viaRequest('soa-session', function ($request) {
            $user = $request->session()->get('soa.user');

            return is_array($user) && isset($user['id']) ? new GenericUser($user) : null;
        });
    }
}
