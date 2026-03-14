<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AdminUserController extends Controller
{
    // Fetch all users
    public function index(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(User::orderBy('department')->get());
    }

    // Create a new user
    public function store(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string',
            'department' => 'required|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'department' => $validated['department'],
            'status' => 'Active'
        ]);

        return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
    }

    // Update an existing user
    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$id, // Allow keeping the same email
            'role' => 'required|string',
            'department' => 'required|string',
            'password' => 'nullable|string|min:6' // Password is optional when editing
        ]);

        $targetUser->name = $validated['name'];
        $targetUser->email = $validated['email'];
        $targetUser->role = $validated['role'];
        $targetUser->department = $validated['department'];

        // Only hash and update the password if the Super Admin typed a new one!
        if (!empty($validated['password'])) {
            $targetUser->password = Hash::make($validated['password']);
        }

        $targetUser->save();

        return response()->json(['message' => 'User updated successfully', 'user' => $targetUser], 200);
    }

    // Delete a user
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        if ($targetUser->id === Auth::id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $targetUser->delete();

        return response()->json(['message' => 'User deleted successfully'], 200);
    }

    // Read the System Error Logs
    public function getSystemLogs(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logPath = storage_path('logs/laravel.log');
        
        if (!file_exists($logPath)) {
            return response()->json(['logs' => ['No error logs found. System is running perfectly!']]);
        }

        // Read the file, ignore empty lines, and grab the last 100 lines so it doesn't crash the browser
        $logs = file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $recentLogs = array_slice($logs, -100);

        // Reverse the array so the newest errors show up at the top!
        return response()->json(['logs' => array_reverse($recentLogs)]);
    }
}