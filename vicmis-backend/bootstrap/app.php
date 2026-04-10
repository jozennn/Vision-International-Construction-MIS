<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Sanctum stateful auth for all API routes
        $middleware->statefulApi();

        // CSRF: API routes use XSRF-TOKEN header — skip blade CSRF checks
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // CORS must run early so preflight OPTIONS requests are handled
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        // Origin check — blocks curl/PowerShell replay attacks
        $middleware->prependToGroup('api', \App\Http\Middleware\VerifyRequestOrigin::class);

        // Absolute session timeout + fingerprint check on every request
        $middleware->appendToGroup('api', \App\Http\Middleware\AbsoluteSessionTimeout::class);

        // No named web routes — always return null so JSON 401 fires
        $middleware->redirectGuestsTo(function (Request $request) {
            return null;
        });

        // Trust all proxies — required when behind nginx/load balancer
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON 401 for unauthenticated requests
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
    })
    ->booted(function () {
        // ── Rate Limiters ─────────────────────────────────────────────────
        //
        // api-reads  — generous limit for GET requests (dashboards, lists)
        // api-writes — strict limit for mutating requests (POST/PUT/DELETE)
        //
        // Both limits are per authenticated user ID, falling back to IP for
        // unauthenticated requests. This means one user hammering the API
        // doesn't affect other users.

        RateLimiter::for('api-reads', function (Request $request) {
            return Limit::perMinute(120)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function () {
                    return response()->json([
                        'message' => 'Too many requests. Please slow down.',
                    ], 429);
                });
        });

        RateLimiter::for('api-writes', function (Request $request) {
            return Limit::perMinute(30)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function () {
                    return response()->json([
                        'message' => 'Too many write requests. Please slow down.',
                    ], 429);
                });
        });
    })
    ->create();