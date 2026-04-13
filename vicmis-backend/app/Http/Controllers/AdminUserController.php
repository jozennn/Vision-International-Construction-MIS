<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class AdminUserController extends Controller
{
    // ==========================================
    // 👥 USER MANAGEMENT
    // ==========================================

    public function index(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(User::orderBy('department')->get());
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'role'       => 'required|string',
            'department' => 'required|string',
        ]);

        $user = User::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'role'       => $validated['role'],
            'department' => $validated['department'],
            'status'     => 'Active',
        ]);

        // Generate password reset token and reset link
        $token        = Password::broker()->createToken($user);
        $frontendUrl = env('FRONTEND_URL', 'https://visionintlconstopc.com');
        $resetLink   = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        
        $htmlEmail = "
        <div style='font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 40px 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);'>
                <div style='background-color: #A91D22; padding: 30px; text-align: center;'>
                    <h1 style='color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;'>VISION INTERNATIONAL CONSTRUCTION OPC</h1>
                    <p style='color: #ffcccc; margin: 5px 0 0 0; font-style: italic; font-size: 14px;'>You Envision, We build!</p>
                </div>
                <div style='padding: 40px 30px; color: #334155; line-height: 1.6;'>
                    <h2 style='margin-top: 0; color: #1e293b; font-size: 20px;'>Welcome to Vision Family, {$user->name}!</h2>
                    <p>An account has been successfully created for you on the Vision Management Information System by the Super Admin.</p>
                    <div style='background-color: #f8fafc; border-left: 4px solid #A91D22; padding: 15px 20px; margin: 25px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #64748b;'><strong>EMAIL / USERNAME:</strong><br>{$user->email}</p>
                        <p style='margin: 10px 0 0 0; font-size: 14px; color: #64748b;'><strong>TEMPORARY PASSWORD:</strong><br><span style='font-family: monospace; font-size: 16px; color: #1e293b;'>{$validated['password']}</span></p>
                    </div>
                    <p>For your security, please click the button below to change your password. This link expires in 24 hours.</p>
                    <div style='text-align: center; margin: 35px 0 20px 0;'>
                        <a href='{$resetLink}' style='background-color: #A91D22; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-transform: uppercase; font-size: 14px;'>Reset Password</a>
                    </div>
                </div>
                <div style='background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;'>
                    <p style='margin: 0;'>© " . date('Y') . " Vision International Construction OPC.<br>This is an automated system message, please do not reply.</p>
                </div>
            </div>
        </div>
        ";

        try {
            Mail::html($htmlEmail, function ($message) use ($user) {
                $message->to($user->email)
                        ->subject('Action Required: Setup Your Vision Account');
            });
        } catch (\Exception $e) {
            Log::error("Failed to send welcome email to {$user->email}: " . $e->getMessage());
        }

        // Log the activity
        \App\Models\ActivityLog::create([
            'user_id'     => $request->user()->id,
            'user_name'   => $request->user()->name,
            'module'      => 'Users',
            'description' => "Created account for {$user->name} ({$user->role}) in {$user->department}",
        ]);

        return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email,' . $id,
            'role'       => 'required|string',
            'department' => 'required|string',
            'password'   => 'nullable|string|min:6',
        ]);

        $targetUser->name       = $validated['name'];
        $targetUser->email      = $validated['email'];
        $targetUser->role       = $validated['role'];
        $targetUser->department = $validated['department'];

        if (!empty($validated['password'])) {
            $targetUser->password = Hash::make($validated['password']);
        }

        $targetUser->save();

        \App\Models\ActivityLog::create([
            'user_id'     => $request->user()->id,
            'user_name'   => $request->user()->name,
            'module'      => 'Users',
            'description' => "Updated account for {$targetUser->name}",
        ]);

        return response()->json(['message' => 'User updated successfully', 'user' => $targetUser], 200);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        if ($targetUser->id === Auth::id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $name = $targetUser->name;
        $targetUser->delete();

        \App\Models\ActivityLog::create([
            'user_id'     => $request->user()->id,
            'user_name'   => $request->user()->name,
            'module'      => 'Users',
            'description' => "Deleted account for {$name}",
        ]);

        return response()->json(['message' => 'User deleted successfully'], 200);
    }

    // ==========================================
    // 🪵 SYSTEM LOGS
    // ==========================================

    public function getSystemLogs(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logPath = storage_path('logs/laravel.log');

        if (!file_exists($logPath)) {
            return response()->json(['logs' => ['No error logs found. System is running perfectly!']]);
        }

        $logs       = file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $recentLogs = array_slice($logs, -100);

        return response()->json(['logs' => array_reverse($recentLogs)]);
    }

    // ==========================================
    // 🕒 ACTIVITY LOGS
    // ==========================================

    public function getActivities(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $activities = \App\Models\ActivityLog::latest()->take(100)->get();

        return response()->json($activities);
    }

    // ==========================================
    // 📊 SUPER ADMIN DASHBOARD STATS
    // ==========================================

    public function getDashboardStats(Request $request)
    {
        if (!in_array($request->user()->role, ['super_admin', 'admin', 'manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $totalUsers          = User::count();
        $totalLeads          = \App\Models\Lead::count();
        $activeProjectsCount = \App\Models\Project::whereNotIn('status', ['Completed', 'Archived', 'Lead'])->count();
        $recentActivities    = \App\Models\ActivityLog::latest()->take(6)->get();

        $salesQueue = \App\Models\Project::whereIn('status', [
            'Floor Plan', 'Purchase Order', 'P.O & Work Order', 'Pending Work Order Verification',
        ])->count();

        $engineeringQueue = \App\Models\Project::whereIn('status', [
            'Measurement based on Plan', 'Actual Measurement', 'Pending Head Review',
            'Initial Site Inspection', 'Pending DR Verification', 'Bidding of Project',
            'Awarding of Project', 'Contract Signing for Installer',
            'Deployment and Orientation of Installers', 'Site Inspection & Project Monitoring',
            'Site Inspection & Quality Checking', 'Pending QA Verification',
            'Final Site Inspection with the Client', 'Signing of COC',
        ])->count();

        $logisticsQueue = \App\Models\Project::whereIn('status', [
            'Checking of Delivery of Materials', 'Request Materials Needed',
        ])->count();

        $accountingQueue = \App\Models\Project::whereIn('status', [
            'Request Billing', 'Request Final Billing',
        ])->count();

        $totalPendingApprovals = \App\Models\Project::whereIn('status', [
            'Pending Head Review', 'Pending DR Verification',
            'Pending QA Verification', 'Pending Work Order Verification',
        ])->count();

        return response()->json([
            'total_users'       => $totalUsers,
            'active_projects'   => $activeProjectsCount,
            'total_leads'       => $totalLeads,
            'recent_activities' => $recentActivities,
            'bottlenecks'       => [
                'total_pending' => $totalPendingApprovals,
                'sales'         => $salesQueue,
                'engineering'   => $engineeringQueue,
                'logistics'     => $logisticsQueue,
                'accounting'    => $accountingQueue,
            ],
        ]);
    }
}