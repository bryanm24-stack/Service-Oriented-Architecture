<?php

use App\Exceptions\ApiUnavailable;
use App\Http\Middleware\PrivateResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [PrivateResponse::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['password', 'password_confirmation', 'konfirmasi_password']);
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            return $request->expectsJson() ? response()->json(['message' => 'Silakan login'], 401) : redirect()->guest(route('login'));
        });
        $exceptions->render(function (ApiUnavailable $exception, Request $request) {
            return response()->view('errors.upstream', ['message' => $exception->getMessage()], 502)->header('Cache-Control', 'no-store, private');
        });
    })->create();
