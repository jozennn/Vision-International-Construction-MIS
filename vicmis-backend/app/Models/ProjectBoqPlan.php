<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectBoqPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'submitted_by',
        'plan_measurement', 'plan_sqm',
        'boq_rows', 'grand_total', 'submitted_at',
    ];

    protected $casts = [
        'boq_rows'     => 'array',
        'grand_total'  => 'decimal:2',
        'plan_sqm'     => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
}
