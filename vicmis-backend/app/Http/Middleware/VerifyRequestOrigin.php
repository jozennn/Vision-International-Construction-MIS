<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class VerifyRequestOrigin
{
    private array $allowed = [
        'https://visionintlconstopc.com',
        'https://www.visionintlconstopc.com',
    ];

    private array $exempt = [
        'sanctum/csrf-cookie',
    ];

    public function handle(Request $request, Closure $next)
    {
        // Allow CSRF cookie route through unconditionally
        foreach ($this->exempt as $path) {
            if ($request->is($path)) {
                return $next($request);
            }
        }

        // ── Layer 1: Custom header check ────────────────────────────────
        $appKey = config('app.request_key');
        if ($appKey && $request->headers->get('X-App-Key') !== $appKey) {
            Log::warning('VerifyRequestOrigin: missing or invalid X-App-Key', [
                'ip'     => $request->ip(),
                'method' => $request->method(),
                'path'   => $request->path(),
            ]);
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // ── Layer 2: Origin / Referer check (all methods including GET) ──
        $origin  = $request->headers->get('Origin');
        $referer = $request->headers->get('Referer');

        if ($origin || $referer) {
            $allowed = false;
            foreach ($this->allowed as $domain) {
                if (
                    ($origin  && str_starts_with($origin,  $domain)) ||
                    ($referer && str_starts_with($referer, $domain))
                ) {
                    $allowed = true;
                    break;
                }
            }

            if (!$allowed) {
                Log::warning('VerifyRequestOrigin: blocked bad origin/referer', [
                    'ip'      => $request->ip(),
                    'method'  => $request->method(),
                    'path'    => $request->path(),
                    'origin'  => $origin,
                    'referer' => $referer,
                ]);
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        // ── Layer 3: Session fingerprint check ───────────────────────────
        // On every authenticated request, verify the session was created by
        // the same IP and User-Agent. If someone copies the session cookie
        // to a different device/terminal, this check blocks them immediately.
        if ($request->hasSession() && $request->user()) {
            $sessionId  = $request->session()->getId();
            $cacheKey   = 'session_fp:' . $sessionId;
            $fingerprint = Cache::get($cacheKey);

            $currentFp = $this->makeFingerprint($request);

            if ($fingerprint === null) {
                // First authenticated request — store the fingerprint
                Cache::put($cacheKey, $currentFp, now()->addMinutes((int) config('session.lifetime', 30)));
            } elseif ($fingerprint !== $currentFp) {
                // Fingerprint mismatch — session cookie was stolen and used
                // from a different IP or device. Kill the session immediately.
                Log::warning('Session fingerprint mismatch — possible session hijack', [
                    'session_id' => $sessionId,
                    'ip'         => $request->ip(),
                    'path'       => $request->path(),
                    'expected'   => $fingerprint,
                    'received'   => $currentFp,
                ]);

                // Invalidate the stolen session server-side
                $request->session()->invalidate();
                Cache::forget($cacheKey);

                return response()->json(['message' => 'Session invalid. Please log in again.'], 401);
            }
        }

        return $next($request);
    }

    /**
     * Build a fingerprint from the request's IP and User-Agent.
     * Hashed so the raw values are never stored in cache.
     */
    private function makeFingerprint(Request $request): string
    {
        return hash('sha256', $request->ip() . '|' . $request->userAgent());
    }
}