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
        // 1. Find the user
        $user = User::where('email', $request->email)->first();

        // 2. Strict Credential Check
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401); 
        }

        // 3. Generate and save the 2FA code
        $code = rand(100000, 999999);
        $user->update([
            'two_factor_code' => $code,
            'two_factor_expires_at' => now()->addMinutes(5) 
        ]);

        // 4. Send the email via Mailtrap
        Mail::to($user->email)->send(new TwoFactorCodeMail($code));

        // 5. Response triggers the OTP screen in React
        return response()->json([
            'status' => '2FA_REQUIRED', 
            'email' => $user->email
        ]);
    }

    public function verify2FA(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || $user->two_factor_code !== $request->code) {
            return response()->json(['message' => 'The verification code is invalid.'], 422);
        }

        if ($user->two_factor_expires_at && now()->isAfter($user->two_factor_expires_at)) {
            return response()->json(['message' => 'The verification code has expired.'], 422);
        }

        // --- PERMISSIONS ENGINE ---
        $permissions = ['Dashboard']; 
        $dept = strtolower($user->department);

        if (in_array($user->role, ['super_admin', 'admin', 'manager'])) {
            $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Accounting', 'Setting', 'Human Resource', 'Customer'];
        }
        // UPDATE: Grant full access to both 'super_admin' and 'admin'
        // if ($user->role === 'super_admin' || $user->role === 'admin') {
        //     $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Accounting', 'Setting', 'Human Resource', 'Customer'];
        // } 
        elseif ($dept === 'engineering') {
            $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Setting'];
        } 
        elseif ($dept === 'hr') {
            $permissions = ['Dashboard', 'Human Resource', 'Documents', 'Setting'];
        } 
        elseif ($dept === 'sales') {
            $permissions = ['Dashboard', 'Customer', 'Project', 'Documents', 'Inventory'];
        }
        elseif ($dept === 'inventory' || $dept === 'logistics') {
            $permissions = ['Dashboard', 'Inventory', 'Project', 'Documents', 'Setting'];
        }
        elseif (str_contains($dept, 'accounting') || str_contains($dept, 'procurement')) {
            $permissions = ['Dashboard', 'Project', 'Accounting'];
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Reset 2FA
        $user->update(['two_factor_code' => null, 'two_factor_expires_at' => null]);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role, // dept_head, logistics_employee, super_admin, etc.
                'department' => $user->department,
                'permissions' => $permissions 
                ]
            ]);
    }

    public function logout(Request $request)
    {
        // Revoke the token that was used for the current request
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out'
        ]);
    }

    // ==========================================
    // 🔐 PASSWORD RESET FUNCTION
    // ==========================================
    public function resetPassword(Request $request)
    {
        // 1. Validate the incoming request from React
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed', 
            // Note: 'confirmed' automatically checks against 'password_confirmation'
        ]);

        // 2. Ask Laravel's built-in broker to verify the token and reset the password
        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // If token is valid, hash the new password and save it
                $user->password = Hash::make($password);
                $user->setRememberToken(Str::random(60));
                $user->save();

                // Optional: Fire a Laravel event
                event(new PasswordReset($user));
            }
        );

        // 3. Respond back to React based on success or failure
        if ($status == Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password has been successfully reset.'], 200);
        } else {
            // Returns a 400 error if the token is expired or invalid
            return response()->json(['message' => 'Invalid or expired password reset token.'], 400);
        }
    }
}