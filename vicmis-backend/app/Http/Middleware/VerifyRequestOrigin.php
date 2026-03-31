<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyRequestOrigin
{
    private array $allowed = [
        'https://visionintlconstopc.com',
        'https://www.visionintlconstopc.com',
    ];

    public function handle(Request $request, Closure $next)
    {
        // Only check mutating requests — GET is safe (no CSRF risk)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $origin  = $request->headers->get('Origin');
            $referer = $request->headers->get('Referer');

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
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        return $next($request);
    }
}