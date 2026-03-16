<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\TwoFactorCodeMail;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $user = User::where('email', $request->email)->first();

            // Generic error — never reveal whether email exists or not
            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Wrong email or password. Please try again.',
                ], 401);
            }

            // Generate and save 2FA code
            $code = rand(100000, 999999);
            $user->update([
                'two_factor_code'       => $code,
                'two_factor_expires_at' => now()->addMinutes(5),
            ]);

            // Send OTP email
            Mail::to($user->email)->send(new TwoFactorCodeMail($code));

            return response()->json([
                'status' => '2FA_REQUIRED',
                'email'  => $user->email,
            ]);

        } catch (\Throwable $e) {
            // Log the real error but never expose it to the client
            \Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }

    public function verify2FA(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'code'  => 'required|string',
            ]);

            $user = User::where('email', $request->email)->first();

            // Generic error — don't reveal whether user exists
            if (!$user || $user->two_factor_code !== $request->code) {
                return response()->json([
                    'message' => 'Invalid or expired verification code.',
                ], 422);
            }

            if ($user->two_factor_expires_at && now()->isAfter($user->two_factor_expires_at)) {
                return response()->json([
                    'message' => 'Invalid or expired verification code.',
                ], 422);
            }

            // ── Permissions engine ────────────────────────────────────────────
            $permissions = ['Dashboard'];
            $dept        = strtolower($user->department ?? '');

            if (in_array($user->role, ['super_admin', 'admin', 'manager'])) {
                $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Accounting', 'Setting', 'Human Resource', 'Customer'];
            } elseif ($dept === 'engineering') {
                $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Setting'];
            } elseif ($dept === 'hr') {
                $permissions = ['Dashboard', 'Human Resource', 'Documents', 'Setting'];
            } elseif ($dept === 'sales') {
                $permissions = ['Dashboard', 'Customer', 'Project', 'Documents', 'Inventory'];
            } elseif ($dept === 'inventory' || $dept === 'logistics') {
                $permissions = ['Dashboard', 'Inventory', 'Project', 'Documents', 'Setting'];
            } elseif (str_contains($dept, 'accounting') || str_contains($dept, 'procurement')) {
                $permissions = ['Dashboard', 'Documents', 'Setting', 'Accounting'];
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            // Clear 2FA fields
            $user->update([
                'two_factor_code'       => null,
                'two_factor_expires_at' => null,
            ]);

            return response()->json([
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => [
                    'id'          => $user->id,
                    'name'        => $user->name,
                    'email'       => $user->email,
                    'role'        => $user->role,
                    'department'  => $user->department,
                    'permissions' => $permissions,
                ],
            ]);

        } catch (\Throwable $e) {
            \Log::error('2FA verify error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $request->user()->currentAccessToken()->delete();
            return response()->json(['message' => 'Successfully logged out.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Logout failed. Please try again.'], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'token'    => 'required',
                'email'    => 'required|email',
                'password' => 'required|min:6|confirmed',
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

            if ($status == Password::PASSWORD_RESET) {
                return response()->json(['message' => 'Password has been successfully reset.'], 200);
            }

            // Generic — don't reveal whether token/email is wrong
            return response()->json(['message' => 'Password reset failed. Please request a new link.'], 400);

        } catch (\Throwable $e) {
            \Log::error('Password reset error: ' . $e->getMessage());
            return response()->json(['message' => 'An unexpected error occurred. Please try again.'], 500);
        }
    }
}