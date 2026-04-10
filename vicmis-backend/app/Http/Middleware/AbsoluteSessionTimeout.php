<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AbsoluteSessionTimeout
{
    // Hard session ceiling — even with a valid refresh token, a stolen
    // session cookie can only be replayed for this many hours maximum.
    // After this, the user must go through /refresh to get a new session.
    private const MAX_SESSION_HOURS = 12;

    public function handle(Request $request, Closure $next)
    {
        // Skip unauthenticated requests — auth:sanctum handles those
        if (!$request->hasSession() || !$request->user()) {
            return $next($request);
        }

        // ── Absolute time ceiling ─────────────────────────────────────────
        // NOTE: Fingerprint checking lives in VerifyRequestOrigin to avoid
        // running the same check twice on every request. This middleware only
        // enforces the hard 12-hour time limit.
        $loginTime = $request->session()->get('login_time');

        if (!$loginTime) {
            // First request after middleware was added — seed the timestamp
            $request->session()->put('login_time', now()->timestamp);
            return $next($request);
        }

        $elapsedHours = (now()->timestamp - $loginTime) / 3600;

        if ($elapsedHours > self::MAX_SESSION_HOURS) {
            $sessionId = $request->session()->getId();

            Log::info('AbsoluteSessionTimeout: session expired', [
                'user_id'       => $request->user()->id,
                'session_id'    => $sessionId,
                'elapsed_hours' => round($elapsedHours, 2),
            ]);

            // Clean up fingerprint cache entry
            Cache::forget('session_fp:' . $sessionId);

            // Invalidate server-side session — the session ID in the cookie
            // now points to nothing in the database
            $request->session()->invalidate();

            return response()->json([
                'message' => 'Session expired. Please log in again.',
            ], 401);
        }

        return $next($request);
    }
}