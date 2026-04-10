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

    // These paths skip ALL checks — called during boot before session exists
    private array $exempt = [
        'sanctum/csrf-cookie',
        'api/login',
        'api/verify-2fa',
        'api/refresh',
    ];

    // Only mutating methods need origin + XSRF enforcement.
    // GET/HEAD cannot change data so we only fingerprint-check those.
    private array $mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next)
    {
        // ── Exempt paths — skip all checks ───────────────────────────────
        foreach ($this->exempt as $path) {
            if ($request->is($path)) {
                return $next($request);
            }
        }

        // ── Layer 1: Origin / Referer / XSRF check (mutating only) ───────
        //
        // This is the layer that stops curl/PowerShell replay attacks.
        // We check in order:
        //
        //   A. Origin header present and valid   → allow
        //   B. Referer header present and valid  → allow
        //   C. Neither present but XSRF-TOKEN    → allow (Sanctum validates it)
        //   D. None of the above                 → BLOCK (curl/PowerShell signature)
        //
        // A real browser ALWAYS sends Origin or Referer on a fetch/form POST.
        // curl and PowerShell omit both by default. Faking them requires
        // knowing your exact domain AND still passing the XSRF-TOKEN check.
        //
        if (in_array($request->method(), $this->mutatingMethods)) {
            $origin    = $request->headers->get('Origin');
            $referer   = $request->headers->get('Referer');
            $xsrfToken = $request->headers->get('X-XSRF-TOKEN');

            $originAllowed  = $origin  && $this->isAllowed($origin);
            $refererAllowed = $referer && $this->isAllowed($referer);

            if (!$originAllowed && !$refererAllowed) {
                // Origin/Referer explicitly set to a BAD domain — block immediately
                if (($origin && !$this->isAllowed($origin)) || ($referer && !$this->isAllowed($referer))) {
                    Log::warning('VerifyRequestOrigin: blocked — invalid Origin or Referer', [
                        'method'     => $request->method(),
                        'path'       => $request->path(),
                        'ip'         => $request->ip(),
                        'origin'     => $origin,
                        'referer'    => $referer,
                        'user_id'    => $request->user()?->id,
                    ]);

                    return response()->json([
                        'message' => 'Forbidden: invalid request origin.',
                    ], 403);
                }

                // Neither Origin nor Referer — last chance is XSRF-TOKEN.
                // If even that is missing, this is not a browser request.
                if (!$xsrfToken) {
                    Log::warning('VerifyRequestOrigin: blocked — no Origin, Referer, or XSRF-TOKEN', [
                        'method'     => $request->method(),
                        'path'       => $request->path(),
                        'ip'         => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'user_id'    => $request->user()?->id,
                    ]);

                    return response()->json([
                        'message' => 'Forbidden: request could not be verified.',
                    ], 403);
                }
            }
        }

        // ── Layer 2: Session fingerprint check (ALL methods) ──────────────
        //
        // On every authenticated request, verify the session was created by
        // the same IP and User-Agent. If someone copies the session cookie
        // to a different terminal, this kills them immediately.
        //
        // Kept here (not in AbsoluteSessionTimeout) to avoid double-checking.
        //
        if ($request->hasSession() && $request->user()) {
            $sessionId = $request->session()->getId();
            $cacheKey  = 'session_fp:' . $sessionId;
            $storedFp  = Cache::get($cacheKey);
            $currentFp = $this->makeFingerprint($request);

            if ($storedFp === null) {
                // First authenticated request — seed fingerprint as safety fallback.
                // Normally seeded in AuthController on login/refresh.
                Cache::put(
                    $cacheKey,
                    $currentFp,
                    now()->addMinutes((int) config('session.lifetime', 720))
                );
            } elseif ($storedFp !== $currentFp) {
                Log::warning('VerifyRequestOrigin: fingerprint mismatch — possible hijack', [
                    'session_id' => $sessionId,
                    'path'       => $request->path(),
                    'ip'         => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'user_id'    => $request->user()?->id,
                ]);

                Cache::forget($cacheKey);
                $request->session()->invalidate();

                return response()->json([
                    'message' => 'Session invalid. Please log in again.',
                ], 401);
            }
        }

        return $next($request);
    }

    private function isAllowed(string $url): bool
    {
        foreach ($this->allowed as $domain) {
            if (str_starts_with($url, $domain)) {
                return true;
            }
        }
        return false;
    }

    private function makeFingerprint(Request $request): string
    {
        return hash('sha256', $request->ip() . '|' . $request->userAgent());
    }
}