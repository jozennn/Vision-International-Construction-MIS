<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // FIX: Enable Sanctum stateful (session/cookie) auth for API routes.
        // Without this, Auth::login() in verify2FA() writes to the session
        // but auth:sanctum never reads it back — causing the 500.
        $middleware->statefulApi();

        // CSRF: exclude API routes (Sanctum uses XSRF-TOKEN header instead)
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // CORS must run early so preflight OPTIONS requests get proper headers
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        // Custom origin check on every API request
        $middleware->prependToGroup('api', \App\Http\Middleware\VerifyRequestOrigin::class);

        // Redirect unauthenticated web visitors to login;
        // return null for API/JSON so our custom AuthenticationException handler fires
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }
            return route('login');
        });

        // Trust all proxies (needed when behind nginx / load balancer on production)
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON 401 for API routes instead of a redirect
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })->create();