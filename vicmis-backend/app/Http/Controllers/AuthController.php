<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\RefreshToken;
use App\Mail\TwoFactorCodeMail;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS    = 5;
    private const LOCKOUT_MINUTES = 15;
    private const REFRESH_DAYS    = 30;
    private const SESSION_MINUTES = 720;

    /*
    |--------------------------------------------------------------------------
    | userPayload — single source of truth for the user JSON shape
    |--------------------------------------------------------------------------
    | Every endpoint (verify2FA, refresh, and the /user restore route) calls
    | this helper so permissions are always recalculated fresh from the User
    | model — no stale data after a page refresh.
    |--------------------------------------------------------------------------
    */
    private function userPayload(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'department'  => $user->department,
            'permissions' => $user->resolvePermissions(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | getRemainingSeconds — Redis TTL query
    |--------------------------------------------------------------------------
    */
    private function getRemainingSeconds(string $key): int
    {
        try {
            $prefix = config('cache.prefix');
            $ttl    = Cache::getStore()->connection()->ttl("{$prefix}:{$key}");
            return max(0, (int) $ttl);
        } catch (\Throwable $e) {
            Log::warning('Redis TTL query failed, using fallback', ['key' => $key]);
            return self::LOCKOUT_MINUTES * 60;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Login — Step 1: validate credentials, send 2FA code
    |--------------------------------------------------------------------------
    */
    public function login(Request $request)
    {
        $request->validate([
            'email'       => ['required', 'email', 'max:255'],
            'password'    => ['required', 'string', 'max:255'],
            'remember_me' => ['boolean'],
        ]);

        $ip  = $request->ip();
        $key = 'login_attempts:' . $ip;

        $attempts = Cache::get($key, 0);
        if ($attempts >= self::MAX_ATTEMPTS) {
            $remainingSeconds = $this->getRemainingSeconds($key);
            Log::warning('Login lockout triggered', ['ip' => $ip, 'email' => $request->email]);
            return response()->json([
                'message'           => 'Too many login attempts. Please try again in ' . self::LOCKOUT_MINUTES . ' minutes.',
                'remaining_seconds' => $remainingSeconds,
            ], 429);
        }

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                Cache::add($key, 0, now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::increment($key);
                Log::warning('Failed login attempt', ['ip' => $ip, 'email' => $request->email]);
                return response()->json(['message' => 'Wrong email or password. Please try again.'], 401);
            }

            Cache::forget($key);

            $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            $user->update([
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(5),
            ]);

            Mail::to($user->email)->send(new TwoFactorCodeMail($code));

            Log::info('2FA code sent', ['user_id' => $user->id]);

            Cache::put(
                'remember_me:' . $user->email,
                (bool) $request->input('remember_me', false),
                now()->addMinutes(5)
            );

            return response()->json([
                'status' => '2FA_REQUIRED',
                'email'  => $user->email,
            ]);

        } catch (\Throwable $e) {
            Log::error('Login error: ' . $e->getMessage(), ['ip' => $ip]);
            return response()->json(['message' => 'An unexpected error occurred. Please try again.'], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Verify 2FA — Step 2: validate code, start session, issue refresh token
    |--------------------------------------------------------------------------
    */
    public function verify2FA(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code'  => ['required', 'string', 'digits:6'],
        ]);

        $ip       = $request->ip();
        $key2fa   = '2fa_attempts:' . $ip;
        $attempts = Cache::get($key2fa, 0);

        if ($attempts >= self::MAX_ATTEMPTS) {
            $remainingSeconds = $this->getRemainingSeconds($key2fa);
            Log::warning('2FA lockout triggered', ['ip' => $ip, 'email' => $request->email]);
            return response()->json([
                'message'           => 'Too many attempts. Please try again in ' . self::LOCKOUT_MINUTES . ' minutes.',
                'remaining_seconds' => $remainingSeconds,
            ], 429);
        }

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json(['message' => 'Invalid or expired verification code.'], 422);
            }

            if (!$user->two_factor_expires_at || now()->gte($user->two_factor_expires_at)) {
                $user->update(['two_factor_code' => null, 'two_factor_expires_at' => null]);
                return response()->json(['message' => 'Verification code has expired. Please log in again.'], 422);
            }

            if ((string) $user->two_factor_code !== (string) $request->code) {
                Cache::add($key2fa, 0, now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::increment($key2fa);
                Log::warning('Invalid 2FA code', ['ip' => $ip, 'user_id' => $user->id]);
                return response()->json(['message' => 'Invalid or expired verification code.'], 422);
            }

            Cache::forget($key2fa);
            $user->update(['two_factor_code' => null, 'two_factor_expires_at' => null]);

            $rememberMe = Cache::pull('remember_me:' . $user->email, false);

            Auth::guard('web')->login($user, $rememberMe);
            $request->session()->regenerate();

            $cookieLifetime = self::REFRESH_DAYS * 24 * 60;
            $sessionId      = $request->session()->getId();

            Cache::put(
                'session_fp:' . $sessionId,
                hash('sha256', $request->ip() . '|' . $request->userAgent()),
                now()->addMinutes($cookieLifetime)
            );

            $request->session()->put('login_time', now()->timestamp);
            $request->session()->put('remember_me', $rememberMe);

            $rawToken    = Str::random(64);
            $hashedToken = hash('sha256', $rawToken);

            RefreshToken::where('user_id', $user->id)
                ->where('user_agent', substr($request->userAgent() ?? '', 0, 255))
                ->delete();

            RefreshToken::create([
                'user_id'    => $user->id,
                'token'      => $hashedToken,
                'user_agent' => substr($request->userAgent() ?? '', 0, 255),
                'ip_address' => $ip,
                'expires_at' => now()->addDays(self::REFRESH_DAYS),
            ]);

            $response = response()->json([
                'user'        => $this->userPayload($user),
                'remember_me' => $rememberMe,
            ]);

            $response->cookie('refresh_token', $rawToken, $cookieLifetime, '/', config('session.domain'), true, true,  false, 'Lax');
            $response->cookie('has_session',   '1',       $cookieLifetime, '/', config('session.domain'), true, false, false, 'Lax');

            Log::info('User logged in', [
                'user_id'     => $user->id,
                'ip'          => $ip,
                'department'  => $user->department,
                'role'        => $user->role,
                'remember_me' => $rememberMe,
            ]);

            return $response;

        } catch (\Throwable $e) {
            Log::error('2FA verify error: ' . $e->getMessage(), ['ip' => $ip]);
            return response()->json(['message' => 'An unexpected error occurred. Please try again.'], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Refresh — silently restore session from HttpOnly refresh token cookie
    |--------------------------------------------------------------------------
    */
    public function refresh(Request $request)
    {
        $rawToken = $request->cookie('refresh_token');

        if (!$rawToken) {
            return response()->json(['message' => 'No refresh token.'], 401);
        }

        try {
            $hashedToken  = hash('sha256', $rawToken);
            $refreshToken = RefreshToken::where('token', $hashedToken)
                ->where('expires_at', '>', now())
                ->first();

            if (!$refreshToken) {
                return response()
                    ->json(['message' => 'Refresh token invalid or expired.'], 401)
                    ->cookie('refresh_token', '', -1, '/', config('session.domain'), true, true,  false, 'Lax')
                    ->cookie('has_session',   '', -1, '/', config('session.domain'), true, false, false, 'Lax');
            }

            $user = User::find($refreshToken->user_id);

            if (!$user) {
                $refreshToken->delete();
                return response()->json(['message' => 'User not found.'], 401);
            }

            $refreshToken->delete();

            $newRawToken    = Str::random(64);
            $newHashedToken = hash('sha256', $newRawToken);
            $cookieLifetime = self::REFRESH_DAYS * 24 * 60;

            RefreshToken::create([
                'user_id'    => $user->id,
                'token'      => $newHashedToken,
                'user_agent' => substr($request->userAgent() ?? '', 0, 255),
                'ip_address' => $request->ip(),
                'expires_at' => now()->addDays(self::REFRESH_DAYS),
            ]);

            Auth::guard('web')->login($user, true);
            $request->session()->regenerate();

            $sessionId = $request->session()->getId();

            Cache::put(
                'session_fp:' . $sessionId,
                hash('sha256', $request->ip() . '|' . $request->userAgent()),
                now()->addMinutes($cookieLifetime)
            );

            $request->session()->put('login_time', now()->timestamp);
            $request->session()->put('remember_me', true);

            Log::info('Session refreshed via refresh token', [
                'user_id' => $user->id,
                'ip'      => $request->ip(),
            ]);

            return response()->json([
                'user'        => $this->userPayload($user),
                'remember_me' => true,
            ])
            ->cookie('refresh_token', $newRawToken, $cookieLifetime, '/', config('session.domain'), true, true,  false, 'Lax')
            ->cookie('has_session',   '1',           $cookieLifetime, '/', config('session.domain'), true, false, false, 'Lax');

        } catch (\Throwable $e) {
            Log::error('Refresh error: ' . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */
    public function logout(Request $request)
    {
        try {
            $sessionId = $request->session()->getId();
            $userId    = $request->user()?->id;

            Log::info('User logged out', ['user_id' => $userId]);

            Cache::forget('session_fp:' . $sessionId);

            $rawToken = $request->cookie('refresh_token');
            if ($rawToken) {
                RefreshToken::where('token', hash('sha256', $rawToken))->delete();
            }

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()
                ->json(['message' => 'Successfully logged out.'])
                ->cookie('refresh_token', '', -1, '/', config('session.domain'), true, true,  false, 'Strict')
                ->cookie('has_session',   '', -1, '/', config('session.domain'), true, false, false, 'Strict');

        } catch (\Throwable $e) {
            Log::error('Logout error: ' . $e->getMessage());
            return response()->json(['message' => 'Logout failed. Please try again.'], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Reset Password
    |--------------------------------------------------------------------------
    */
    public function resetPassword(Request $request)
    {
        // 1. Validate the incoming request from React
        $request->validate([
            'token'    => 'required',
            'email'    => 'required|email',
            'password' => 'required|min:6|confirmed', // 'confirmed' automatically checks 'password_confirmation'
        ]);

        // 2. Pass the data to Laravel's built-in Password Broker
        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // 3. This closure runs ONLY if the token and email match perfectly
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        // 4. Return success or failure back to React
        if ($status == Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password has been successfully reset.'], 200);
        } else {
            // Returns an error if the token is invalid or expired
            return response()->json(['message' => __($status)], 400); 
        }
    }
}