<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\Project;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LeadController extends Controller
{
    /**
     * Allowed roles with full visibility/access.
     */
    private function isPrivileged(string $role): bool
    {
        return in_array(strtolower(trim($role)), ['admin', 'super_admin', 'manager', 'dept_head']);
    }

    /**
     * Get the authenticated user's normalized role.
     */
    private function getUserRole(): string
    {
        return strtolower(trim(Auth::user()->role ?? ''));
    }

    /**
     * Display a listing of the leads (Active only).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Lead::with('salesRep');

        if (!$this->isPrivileged($user->role ?? '')) {
            $query->where('sales_rep_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Display a listing of trashed leads.
     */
    public function trashed(Request $request)
    {
        $user = $request->user();

        $query = Lead::onlyTrashed()->with('salesRep');

        if (!$this->isPrivileged($user->role ?? '')) {
            $query->where('sales_rep_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created lead.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name'   => 'required|string|max:255',
            'project_name'  => 'required|string|max:255',
            'location'      => 'required|string',
            'contact_no'    => 'required|string',
            'email'         => 'nullable|email',
            'notes'         => 'nullable|string',
            'status'        => 'string'
        ]);

        $validated['sales_rep_id'] = $request->user()->id;

        $lead = Lead::create($validated);

        return response()->json($lead->load('salesRep'), 201);
    }

    /**
     * Update an existing lead.
     */
    public function update(Request $request, $id)
    {
        $lead     = Lead::findOrFail($id);
        $userRole = $this->getUserRole();

        if (!$this->isPrivileged($userRole) && $lead->sales_rep_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'client_name'  => 'required|string|max:255',
            'project_name' => 'required|string|max:255',
            'location'     => 'required|string',
            'contact_no'   => 'required|string',
            'notes'        => 'nullable|string',
            'status'       => 'required|string',
        ]);

        $lead->update($validated);

        return response()->json($lead->load('salesRep'));
    }

    /**
     * Soft delete a lead (Move to Trash).
     */
    public function destroy($id)
    {
        try {
            $lead     = Lead::findOrFail($id);
            $userRole = $this->getUserRole();

            if (!$this->isPrivileged($userRole) && $lead->sales_rep_id !== Auth::id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $lead->delete();

            return response()->json(['message' => 'Lead moved to trash'], 200);

        } catch (\Exception $e) {
            Log::error("Failed to trash lead ID {$id}: " . $e->getMessage());
            return response()->json(['error' => 'Action failed.'], 500);
        }
    }

    /**
     * Restore a soft-deleted lead.
     */
    public function restore($id)
    {
        try {
            $lead = Lead::onlyTrashed()->findOrFail($id);

            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $userRole = $this->getUserRole();

            if (!$this->isPrivileged($userRole) && $lead->sales_rep_id !== $user->id) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'debug'   => [
                        'user_id'      => $user->id,
                        'user_role'    => $userRole,
                        'sales_rep_id' => $lead->sales_rep_id,
                    ]
                ], 403);
            }

            $lead->restore();

            return response()->json(['message' => 'Lead restored successfully'], 200);

        } catch (\Exception $e) {
            Log::error("Failed to restore lead ID {$id}: " . $e->getMessage());
            return response()->json(['error' => 'Restore failed.'], 500);
        }
    }

    /**
     * Permanently delete a lead.
     */
    public function forceDelete($id)
    {
        try {
            $lead     = Lead::onlyTrashed()->findOrFail($id);
            $user     = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $userRole = $this->getUserRole();

            if (!$this->isPrivileged($userRole) && $lead->sales_rep_id !== $user->id) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'debug'   => [
                        'user_id'      => $user->id,
                        'user_role'    => $userRole,
                        'sales_rep_id' => $lead->sales_rep_id,
                    ]
                ], 403);
            }

            // 1. Delete associated projects permanently
            Project::where('lead_id', $id)->delete();

            // 2. Delete lead permanently
            $lead->forceDelete();

            return response()->json(['message' => 'Lead permanently deleted'], 200);

        } catch (\Exception $e) {
            Log::error("Failed to permanently delete lead ID {$id}: " . $e->getMessage());
            return response()->json(['error' => 'Permanent delete failed.'], 500);
        }
    }
// ── NEW: Upload contract directly to the lead ─────────────────────────────
    public function uploadContract(Request $request, $id)
    {
        $request->validate([
            'contract' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png,webp|max:10240',
        ]);

        $lead = Lead::findOrFail($id);

        // Delete old contract file if exists
        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $file     = $request->file('contract');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path     = $file->storeAs('public/contracts', $filename);

        $lead->update([
            'contract_url'  => Storage::url($path),
            'contract_name' => $file->getClientOriginalName(),
        ]);

        return response()->json($lead->load('salesRep'));
    }

    // ── NEW: Remove contract from lead ────────────────────────────────────────
    public function removeContract($id)
    {
        $lead = Lead::findOrFail($id);

        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $lead->update([
            'contract_url'  => null,
            'contract_name' => null,
        ]);

        return response()->json($lead->load('salesRep'));
    }

    public function destroy($id)
    {
        Lead::findOrFail($id)->delete();
        return response()->json(['message' => 'Moved to trash']);
    }

    public function restore($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        $lead->restore();
        return response()->json($lead->load('salesRep'));
    }

    public function forceDelete($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);

        // Clean up contract file too
        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $lead->forceDelete();
        return response()->json(['message' => 'Permanently deleted']);
    }

    public function trashed()
    {
        return Lead::onlyTrashed()->with('salesRep')->latest()->get();
    }
    // ── NEW: Upload contract directly to the lead ─────────────────────────────
    public function uploadContract(Request $request, $id)
    {
        $request->validate([
            'contract' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png,webp|max:10240',
        ]);

        $lead = Lead::findOrFail($id);

        // Delete old contract file if exists
        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $file     = $request->file('contract');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path     = $file->storeAs('public/contracts', $filename);

        $lead->update([
            'contract_url'  => Storage::url($path),
            'contract_name' => $file->getClientOriginalName(),
        ]);

        return response()->json($lead->load('salesRep'));
    }

    // ── NEW: Remove contract from lead ────────────────────────────────────────
    public function removeContract($id)
    {
        $lead = Lead::findOrFail($id);

        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $lead->update([
            'contract_url'  => null,
            'contract_name' => null,
        ]);

        return response()->json($lead->load('salesRep'));
    }

    public function destroy($id)
    {
        Lead::findOrFail($id)->delete();
        return response()->json(['message' => 'Moved to trash']);
    }

    public function restore($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        $lead->restore();
        return response()->json($lead->load('salesRep'));
    }

    public function forceDelete($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);

        // Clean up contract file too
        if ($lead->contract_url) {
            $oldPath = str_replace('/storage/', 'public/', $lead->contract_url);
            Storage::delete($oldPath);
        }

        $lead->forceDelete();
        return response()->json(['message' => 'Permanently deleted']);
    }

    public function trashed()
    {
        return Lead::onlyTrashed()->with('salesRep')->latest()->get();
    }
    /**
     * Show a single lead (including soft-deleted).
     */
    public function show($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        return response()->json($lead);
    }
}