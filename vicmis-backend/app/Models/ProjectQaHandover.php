<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectQaHandover extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',

        // ── Internal QA ───────────────────────────────────────────────────
        'qa_photo',
        'qa_submitted_by',
        'qa_submitted_at',

        // ── QA Checklist checkboxes (auto-saved per toggle) ───────────────
        'qa_check_boq',
        'qa_check_debris',
        'qa_check_defect',

        // ── QA Verification (Engineering Head) ────────────────────────────
        'qa_verified_by',
        'qa_status',
        'qa_verified_at',

        // ── Client Walkthrough ────────────────────────────────────────────
        'client_walkthrough_doc',
        'walkthrough_completed_at',

        // ── Certificate of Completion ─────────────────────────────────────
        'coc_document',
        'coc_uploaded_by',
        'coc_signed_at',
    ];

    protected $casts = [
        'qa_submitted_at'          => 'datetime',
        'qa_verified_at'           => 'datetime',
        'walkthrough_completed_at' => 'datetime',
        'coc_signed_at'            => 'datetime',

        // Cast booleans so they come back as true/false, not 0/1
        'qa_check_boq'    => 'boolean',
        'qa_check_debris' => 'boolean',
        'qa_check_defect' => 'boolean',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function qaSubmitter() { return $this->belongsTo(User::class, 'qa_submitted_by'); }
    public function qaVerifier()  { return $this->belongsTo(User::class, 'qa_verified_by'); }
    public function cocUploader() { return $this->belongsTo(User::class, 'coc_uploaded_by'); }
}