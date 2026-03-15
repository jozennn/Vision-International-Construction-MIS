<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'delivery_receipt_document', 'dr_uploaded_by', 'dr_uploaded_at',
        'dr_verified_by', 'dr_verification_status', 'dr_verified_at',
        'bidding_document', 'bidding_submitted_at',
        'subcontractor_name', 'awarded_amount', 'awarded_at',
        'material_items',
        'timeline_tracking',
    ];

    protected $casts = [
        'material_items'       => 'array',
        'dr_uploaded_at'       => 'datetime',
        'dr_verified_at'       => 'datetime',
        'bidding_submitted_at' => 'datetime',
        'awarded_at'           => 'datetime',
        'awarded_amount'       => 'decimal:2',
    ];

    public function project()    { return $this->belongsTo(Project::class); }
    public function drUploader() { return $this->belongsTo(User::class, 'dr_uploaded_by'); }
    public function drVerifier() { return $this->belongsTo(User::class, 'dr_verified_by'); }
}
