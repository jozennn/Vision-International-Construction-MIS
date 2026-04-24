<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Project extends Model
{
    use HasFactory;
    use SoftDeletes;
    use LogsActivity;

    protected $fillable = [
        'lead_id',
        'project_name',
        'client_name',
        'location',
        'project_type',
        'status',
        'is_completed',
        'floor_plan_image',
        'contract_amount',
        'created_by',
    ];

    protected $casts = [
        'is_completed'    => 'boolean',
        'contract_amount' => 'decimal:2',
    ];

    // ── Source lead ───────────────────────────────────────────────────────────
    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    // ── Assignments (replaces sales_agent_id / engineer_id / ops_ass_id) ──────
    public function assignments()
    {
        return $this->hasMany(ProjectAssignment::class);
    }

    public function activeAssignments()
    {
        return $this->hasMany(ProjectAssignment::class)->whereNull('removed_at');
    }

    public function salesAgent()
    {
        return $this->hasOne(ProjectAssignment::class)
                    ->whereNull('removed_at')
                    ->where('role', 'sales')
                    ->with('user');
    }

    public function leadEngineer()
    {
        return $this->hasOne(ProjectAssignment::class)
                    ->whereNull('removed_at')
                    ->where('role', 'lead_engineer')
                    ->with('user');
    }

    public function engineers()
    {
        return $this->hasMany(ProjectAssignment::class)
                    ->whereNull('removed_at')
                    ->whereIn('role', ['lead_engineer', 'support_engineer'])
                    ->with('user');
    }

    // ── Phase data ────────────────────────────────────────────────────────────
    public function boqPlan()
    {
        return $this->hasOne(ProjectBoqPlan::class);
    }

    public function boqActual()
    {
        return $this->hasOne(ProjectBoqActual::class);
    }

    public function poOrder()
    {
        return $this->hasOne(ProjectPoOrder::class);
    }

    public function siteInspection()
    {
        return $this->hasOne(ProjectSiteInspection::class);
    }

    public function materials()
    {
        return $this->hasOne(ProjectMaterial::class);
    }

    public function mobilization()
    {
        return $this->hasOne(ProjectMobilization::class);
    }

    public function qaHandover()
    {
        return $this->hasOne(ProjectQaHandover::class);
    }

    public function billings()
    {
        return $this->hasMany(ProjectBilling::class);
    }

    public function progressBilling()
    {
        return $this->hasOne(ProjectBilling::class)->where('billing_type', 'progress');
    }

    public function finalBilling()
    {
        return $this->hasOne(ProjectBilling::class)->where('billing_type', 'final');
    }

    // ── Rejection history ─────────────────────────────────────────────────────
    public function rejectionLogs()
    {
        return $this->hasMany(ProjectRejectionLog::class)->latest('rejected_at');
    }

    public function latestRejection()
    {
        return $this->hasOne(ProjectRejectionLog::class)->latest('rejected_at');
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /**
     * Comma-separated engineer names for display (PersonnelBar, WaitingView).
     */
    public function getAssignedEngineersAttribute(): string
    {
        return $this->engineers
            ->map(fn($a) => $a->user?->name)
            ->filter()
            ->implode(', ');
    }

    /**
     * IDs of all active assigned engineers (used by canAccessProject).
     */
    public function getAssignedEngineerIdsAttribute(): array
    {
        return $this->engineers
            ->pluck('user_id')
            ->map(fn($id) => (string) $id)
            ->toArray();
    }

    /**
     * Most recent rejection reason.
     * Keeps backward compat with code that reads $project->rejection_notes.
     */
    public function getRejectionNotesAttribute(): ?string
    {
        return $this->latestRejection?->reason;
    }

    /**
     * Sales rep name for display (WaitingView / PersonnelBar).
     *
     * Priority:
     * 1. Direct project assignment (role = 'sales') — most accurate
     * 2. Fallback to lead.salesRep (who created the lead) — backward compat
     */
    public function getCreatedByNameAttribute(): ?string
    {
        // 1. Direct assignment on the project
        $fromAssignment = $this->salesAgent?->user?->name;
        if ($fromAssignment) return $fromAssignment;

        // 2. Fallback: whoever owns the originating lead
        return $this->lead?->salesRep?->name;
    }

    /**
     * The user ID of the sales rep (used by canAccessProject).
     * Mirrors the same priority logic as getCreatedByNameAttribute.
     */
}