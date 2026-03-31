<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AbsoluteSessionTimeout
{
    // Force re-login after 8 hours no matter what
    private const MAX_SESSION_HOURS = 8;

    public function handle(Request $request, Closure $next)
    {
        if (!$request->hasSession() || !$request->user()) {
            return $next($request);
        }

        $loginTime = $request->session()->get('login_time');

        if (!$loginTime) {
            $request->session()->put('login_time', now()->timestamp);
        } elseif (now()->timestamp - $loginTime > self::MAX_SESSION_HOURS * 3600) {
            $request->session()->invalidate();
            return response()->json([
                'message' => 'Session expired. Please log in again.'
            ], 401);
        }

        return $next($request);
    }
}