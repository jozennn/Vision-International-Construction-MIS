<?php

return [

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', implode(',', [
        // Your production domain — must match exactly what the browser sends
        'visionintlconstopc.com',
        'www.visionintlconstopc.com',
        // Keep localhost entries for local development
        'localhost',
        'localhost:3000',
        '127.0.0.1',
        '127.0.0.1:8000',
    ]))),

    'guard' => ['web'],

    'expiration' => null, // session lifetime controlled by SESSION_LIFETIME in .env

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies'      => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token'  => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];