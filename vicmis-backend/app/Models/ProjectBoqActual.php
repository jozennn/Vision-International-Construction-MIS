<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectBoqActual extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'submitted_by', 'reviewed_by',
        'actual_measurement', 'actual_sqm',
        'boq_rows', 'grand_total',
        'review_status', 'submitted_at', 'reviewed_at',
    ];

    protected $casts = [
        'boq_rows'     => 'array',
        'grand_total'  => 'decimal:2',
        'actual_sqm'   => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at'  => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
    public function reviewedBy()  { return $this->belongsTo(User::class, 'reviewed_by'); }
}
