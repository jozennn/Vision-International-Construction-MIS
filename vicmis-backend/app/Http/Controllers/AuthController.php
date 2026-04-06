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
    private const REFRESH_DAYS    = 30;   // Remember Me refresh token lifetime
    private const SESSION_MINUTES = 30;   // Normal session lifetime (no Remember Me)

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
            Log::warning('Login lockout triggered', ['ip' => $ip, 'email' => $request->email]);
            return response()->json([
                'message' => 'Too many login attempts. Please try again in ' . self::LOCKOUT_MINUTES . ' minutes.',
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

            // Store code as string to preserve leading zeros (e.g. "012345")
            $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            $user->update([
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(5),
            ]);

            Mail::to($user->email)->send(new TwoFactorCodeMail($code));

            Log::info('2FA code sent', ['user_id' => $user->id]);

            // Stash remember_me for 5 min so verify2FA can read it after the
            // user submits their OTP (the original request is gone by then)
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
    | Verify 2FA — Step 2: validate code, start session, maybe issue refresh token
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
            Log::warning('2FA lockout triggered', ['ip' => $ip, 'email' => $request->email]);
            return response()->json([
                'message' => 'Too many attempts. Please try again in ' . self::LOCKOUT_MINUTES . ' minutes.',
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

            // Success — clear counters and 2FA code
            Cache::forget($key2fa);
            $user->update(['two_factor_code' => null, 'two_factor_expires_at' => null]);

            $permissions = $this->resolvePermissions($user);
            $rememberMe  = Cache::pull('remember_me:' . $user->email, false);

            // Use 'web' guard explicitly — the default sanctum guard resolves to
            // RequestGuard (stateless) and won't write to the session
            Auth::guard('web')->login($user, $rememberMe);
            $request->session()->regenerate();

            $sessionLifetime = $rememberMe
                ? self::REFRESH_DAYS * 24 * 60  // 30 days in minutes
                : self::SESSION_MINUTES;

            $sessionId = $request->session()->getId();

            // Session fingerprint — VerifyRequestOrigin checks this on every request.
            // If the cookie is copied to a different device/IP, the fingerprint
            // won't match and the session is killed server-side immediately.
            Cache::put(
                'session_fp:' . $sessionId,
                hash('sha256', $request->ip() . '|' . $request->userAgent()),
                now()->addMinutes($sessionLifetime)
            );

            // Absolute login timestamp — AbsoluteSessionTimeout middleware uses this
            // to enforce a hard 8-hour ceiling regardless of activity
            $request->session()->put('login_time', now()->timestamp);
            $request->session()->put('remember_me', $rememberMe);

            $response = response()->json([
                'user' => [
                    'id'          => $user->id,
                    'name'        => $user->name,
                    'email'       => $user->email,
                    'role'        => $user->role,
                    'department'  => $user->department,
                    'permissions' => $permissions,
                ],
                'remember_me' => $rememberMe,
            ]);

            // Always set the has_session indicator cookie on successful login.
            // This is NOT HttpOnly — JavaScript reads it on boot to decide
            // whether to attempt GET /api/user or skip straight to login.
            // It contains no sensitive data — just a presence signal.
            // Lifetime matches the longer of the two: session or refresh token.
            $response->cookie(
                'has_session',
                '1',
                $sessionLifetime,
                '/',
                config('session.domain'),
                true,   // Secure — HTTPS only
                false,  // NOT HttpOnly — must be readable by JS
                false,
                'Strict'
            );

            // If Remember Me is checked — issue a separate refresh token as an
            // HttpOnly Secure SameSite=Strict cookie. The raw token never touches
            // the DB; only its SHA-256 hash is stored. On page refresh the frontend
            // calls POST /api/refresh to silently rotate the token and restore the session.
            if ($rememberMe) {
                $rawToken    = Str::random(64);
                $hashedToken = hash('sha256', $rawToken);

                // Revoke any existing tokens for this user on this device
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

                $response->cookie(
                    'refresh_token',
                    $rawToken,
                    self::REFRESH_DAYS * 24 * 60,   // minutes
                    '/',
                    config('session.domain'),
                    true,    // Secure — HTTPS only
                    true,    // HttpOnly — invisible to JavaScript
                    false,
                    'Strict' // SameSite — never sent cross-site
                );

                // Extend has_session to match the refresh token lifetime
                // when Remember Me is checked (overrides the shorter session cookie above)
                $response->cookie(
                    'has_session',
                    '1',
                    self::REFRESH_DAYS * 24 * 60,
                    '/',
                    config('session.domain'),
                    true,
                    false,  // NOT HttpOnly
                    false,
                    'Strict'
                );
            }

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
                // Token not found or expired — clear both stale cookies
                return response()
                    ->json(['message' => 'Refresh token invalid or expired.'], 401)
                    ->cookie('refresh_token', '', -1, '/', config('session.domain'), true, true, false, 'Strict')
                    ->cookie('has_session',   '', -1, '/', config('session.domain'), true, false, false, 'Strict');
            }

            $user = User::find($refreshToken->user_id);

            if (!$user) {
                $refreshToken->delete();
                return response()->json(['message' => 'User not found.'], 401);
            }

            // ── Token Rotation ───────────────────────────────────────────────
            // Delete the used token immediately and issue a brand-new one.
            // If an attacker steals an old token and tries to use it after the
            // legitimate user has already rotated it, it won't exist in the DB.
            $refreshToken->delete();

            $newRawToken    = Str::random(64);
            $newHashedToken = hash('sha256', $newRawToken);

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
                now()->addMinutes(self::REFRESH_DAYS * 24 * 60)
            );

            $request->session()->put('login_time', now()->timestamp);
            $request->session()->put('remember_me', true);

            $permissions = $this->resolvePermissions($user);

            Log::info('Session refreshed via refresh token', [
                'user_id' => $user->id,
                'ip'      => $request->ip(),
            ]);

            return response()->json([
                'user' => [
                    'id'          => $user->id,
                    'name'        => $user->name,
                    'email'       => $user->email,
                    'role'        => $user->role,
                    'department'  => $user->department,
                    'permissions' => $permissions,
                ],
                'remember_me' => true,
            ])
            ->cookie(
                'refresh_token',
                $newRawToken,
                self::REFRESH_DAYS * 24 * 60,
                '/',
                config('session.domain'),
                true,
                true,
                false,
                'Strict'
            )
            // Rotate has_session alongside the refresh token so they
            // always expire together
            ->cookie(
                'has_session',
                '1',
                self::REFRESH_DAYS * 24 * 60,
                '/',
                config('session.domain'),
                true,
                false,  // NOT HttpOnly
                false,
                'Strict'
            );

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

            // Clean up session fingerprint from cache
            Cache::forget('session_fp:' . $sessionId);

            // Revoke refresh token for this device if one exists
            $rawToken = $request->cookie('refresh_token');
            if ($rawToken) {
                RefreshToken::where('token', hash('sha256', $rawToken))->delete();
            }

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            // Expire both cookies on the client immediately
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
        try {
            $request->validate([
                'token'    => ['required'],
                'email'    => ['required', 'email'],
                'password' => ['required', 'min:8', 'confirmed'],
            ]);

            $status = Password::broker()->reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function ($user, $password) {
                    $user->password = Hash::make($password);
                    $user->setRememberToken(Str::random(60));
                    $user->save();
                    event(new PasswordReset($user));
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                Log::info('Password reset successful', ['email' => $request->email]);
                return response()->json(['message' => 'Password has been successfully reset.'], 200);
            }

            return response()->json(['message' => 'Password reset failed. Please request a new link.'], 400);

        } catch (\Throwable $e) {
            Log::error('Password reset error: ' . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred. Please try again.'], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */
    private function resolvePermissions(User $user): array
    {
        $dept = strtolower($user->department ?? '');

        if (in_array($user->role, ['super_admin', 'admin', 'manager'])) {
            return ['Dashboard', 'Project', 'Documents', 'Inventory', 'Accounting', 'Setting', 'Human Resource', 'Customer'];
        }

        return match(true) {
            $dept === 'engineering'                                                  => ['Dashboard', 'Project', 'Documents', 'Inventory', 'Setting'],
            $dept === 'hr'                                                           => ['Dashboard', 'Human Resource', 'Documents', 'Setting'],
            $dept === 'sales'                                                        => ['Dashboard', 'Customer', 'Project', 'Documents', 'Inventory'],
            in_array($dept, ['inventory', 'logistics'])                              => ['Dashboard', 'Inventory', 'Project', 'Documents', 'Setting'],
            str_contains($dept, 'accounting') || str_contains($dept, 'procurement') => ['Dashboard', 'Documents', 'Setting', 'Accounting'],
            default                                                                  => ['Dashboard'],
        };
    }
}