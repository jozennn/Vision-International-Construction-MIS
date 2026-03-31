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
use App\Mail\TwoFactorCodeMail;

class AuthController extends Controller
{
    // Max failed login attempts before lockout
    private const MAX_ATTEMPTS = 5;
    // Lockout duration in minutes
    private const LOCKOUT_MINUTES = 15;

    /*
    |--------------------------------------------------------------------------
    | Login — Step 1: validate credentials, send 2FA code
    |--------------------------------------------------------------------------
    */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $ip  = $request->ip();
        $key = 'login_attempts:' . $ip;

        // --- Brute force lockout check ---
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
                // Initialize counter if first attempt, then increment
                Cache::add($key, 0, now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::increment($key);

                Log::warning('Failed login attempt', ['ip' => $ip, 'email' => $request->email]);

                return response()->json([
                    'message' => 'Wrong email or password. Please try again.',
                ], 401);
            }

            // Successful credential check — reset attempt counter
            Cache::forget($key);

            $code = random_int(100000, 999999);
            $user->update([
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(5),
            ]);

            Mail::to($user->email)->send(new TwoFactorCodeMail($code));

            Log::info('2FA code sent', ['user_id' => $user->id]);

            return response()->json([
                'status' => '2FA_REQUIRED',
                'email'  => $user->email,
            ]);

        } catch (\Throwable $e) {
            Log::error('Login error: ' . $e->getMessage(), ['ip' => $ip]);
            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Verify 2FA — Step 2: validate code, start session
    |--------------------------------------------------------------------------
    */
    public function verify2FA(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code'  => ['required', 'string', 'digits:6'],
        ]);

        $ip      = $request->ip();
        $key2fa  = '2fa_attempts:' . $ip;
        $attempts = Cache::get($key2fa, 0);

        // Brute force guard on 2FA codes too
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

            // Check expiry
            if (!$user->two_factor_expires_at || now()->isAfter($user->two_factor_expires_at)) {
                $user->update([
                    'two_factor_code'       => null,
                    'two_factor_expires_at' => null,
                ]);
                return response()->json(['message' => 'Verification code has expired. Please log in again.'], 422);
            }

            // Check code match
            if ((string) $user->two_factor_code !== (string) $request->code) {
                // Initialize counter if first attempt, then increment
                Cache::add($key2fa, 0, now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::increment($key2fa);

                Log::warning('Invalid 2FA code', ['ip' => $ip, 'user_id' => $user->id]);
                return response()->json(['message' => 'Invalid or expired verification code.'], 422);
            }

            // Success — clear counters and code
            Cache::forget($key2fa);

            $user->update([
                'two_factor_code'       => null,
                'two_factor_expires_at' => null,
            ]);

            // Resolve permissions by role / department
            $permissions = $this->resolvePermissions($user);

            // Session-based auth — HttpOnly cookie, no token issued to frontend
            Auth::login($user);
            $request->session()->regenerate();

            Log::info('User logged in', [
                'user_id'    => $user->id,
                'ip'         => $ip,
                'department' => $user->department,
                'role'       => $user->role,
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
            ]);

        } catch (\Throwable $e) {
            Log::error('2FA verify error: ' . $e->getMessage(), ['ip' => $ip]);
            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
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
            Log::info('User logged out', ['user_id' => $request->user()?->id]);

            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'Successfully logged out.']);
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