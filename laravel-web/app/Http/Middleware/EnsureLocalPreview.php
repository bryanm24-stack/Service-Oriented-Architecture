<?php

namespace App\Http\Middleware;

use App\Services\PreviewUserContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLocalPreview
{
    public function __construct(private PreviewUserContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->context->id();

        return $next($request);
    }
}
