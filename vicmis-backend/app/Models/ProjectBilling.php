<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectBilling extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'billing_type',
        'invoice_document', 'amount',
        'submitted_by', 'status',
        'submitted_at', 'paid_at',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'submitted_at' => 'datetime',
        'paid_at'      => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
}
