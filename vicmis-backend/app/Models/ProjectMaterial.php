<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',

        // Delivery Receipt
        'delivery_receipt_document',
        'dr_uploaded_by',
        'dr_uploaded_at',
        'dr_verified_by',
        'dr_verification_status',
        'dr_verified_at',

        // Bidding (Step 1 of BAC)
        'bidding_document',
        'bidding_submitted_at',

        // Awarding (Step 2 of BAC)
        'awarding_document',
        'awarding_submitted_at',

        // Legacy award fields (kept for backward compat)
        'subcontractor_name',
        'awarded_amount',
        'awarded_at',

        // Material tracking JSON blobs
        'material_items',
        'timeline_tracking',
    ];

    protected $casts = [
        'material_items'        => 'array',
        'dr_uploaded_at'        => 'datetime',
        'dr_verified_at'        => 'datetime',
        'bidding_submitted_at'  => 'datetime',
        'awarding_submitted_at' => 'datetime',
        'awarded_at'            => 'datetime',
        'awarded_amount'        => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────────────────

    public function project(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function drUploader(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'dr_uploaded_by');
    }

    public function drVerifier(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'dr_verified_by');
    }
}