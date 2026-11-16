<?php

namespace App\Http\Middleware;

use App\Services\AuthApi;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureApiAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        app(AuthApi::class)->ensure();

        return $next($request);
    }
}
