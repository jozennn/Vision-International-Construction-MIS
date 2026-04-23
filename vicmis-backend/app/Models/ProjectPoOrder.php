<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectPoOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',

        // ── Purchase Order ────────────────────────────────────────────────
        'po_document',
        'po_uploaded_by',
        'po_uploaded_at',

        // ── Work Order ────────────────────────────────────────────────────
        'work_order_document',
        'wo_uploaded_by',
        'wo_uploaded_at',

        // ── Sales Head verification ───────────────────────────────────────
        'verified_by',
        'verification_status',
        'verified_at',

        // ── Rejection ────────────────────────────────────────────────────
        'rejected_by',
        'rejected_at',
        'rejection_notes',
    ];

    protected $casts = [
        'po_uploaded_at' => 'datetime',
        'wo_uploaded_at' => 'datetime',
        'verified_at'    => 'datetime',
        'rejected_at'    => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────

    public function project()    { return $this->belongsTo(Project::class); }
    public function poUploader() { return $this->belongsTo(User::class, 'po_uploaded_by'); }
    public function woUploader() { return $this->belongsTo(User::class, 'wo_uploaded_by'); }
    public function verifier()   { return $this->belongsTo(User::class, 'verified_by'); }
    public function rejector()   { return $this->belongsTo(User::class, 'rejected_by'); }

    // ── Helpers ───────────────────────────────────────────────────────────

    public function isPending()  { return $this->verification_status === 'pending'; }
    public function isApproved() { return $this->verification_status === 'approved'; }
    public function isRejected() { return $this->verification_status === 'rejected'; }

    public function hasBothDocuments(): bool
    {
        return !empty($this->po_document) && !empty($this->work_order_document);
    }
}