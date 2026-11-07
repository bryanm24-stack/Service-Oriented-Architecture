<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        // EnsureApiAuthenticated has refreshed this identity from Node /auth/me.
        abort_unless($request->session()->get('soa.user.role') === 'admin', 403);

        return $next($request);
    }
}
