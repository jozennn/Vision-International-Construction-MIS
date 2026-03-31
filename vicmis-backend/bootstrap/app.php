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

        // FIX 1: Enable Sanctum stateful (session/cookie) auth for all API routes.
        // This registers EnsureFrontendRequestsAreStateful so that Auth::login()
        // in verify2FA() persists to the session and auth:sanctum can read it back.
        // "Session store not set on request" means this was missing or not activating.
        $middleware->statefulApi();

        // CSRF: API routes use XSRF-TOKEN header — skip blade CSRF checks
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // CORS must run early so preflight OPTIONS requests are handled correctly
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        // Custom origin check prepended to the api group
        $middleware->prependToGroup('api', \App\Http\Middleware\VerifyRequestOrigin::class);

         // Layer 2: Absolute session timeout — forces re-login after MAX_SESSION_HOURS
        // regardless of activity. Prevents sessions from living forever via keep-alive.
        $middleware->appendToGroup('api', \App\Http\Middleware\AbsoluteSessionTimeout::class);

        // FIX 2: Route [login] not defined — this app is API-only with no named
        // web routes, so calling route('login') throws. Return null for ALL requests
        // so the AuthenticationException handler below always fires instead.
        $middleware->redirectGuestsTo(function (Request $request) {
            return null;
        });

        // Trust all proxies — required when behind nginx/load balancer on production
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON 401 for unauthenticated requests (web or API).
        // Safe to do globally since there are no web/blade views in this app.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
    })->create();