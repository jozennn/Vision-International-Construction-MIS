<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectRejectionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'rejected_phase', 'returned_to_phase',
        'reason', 'rejected_by', 'rejected_at',
    ];

    protected $casts = [
        'rejected_at' => 'datetime',
    ];

    public function project()    { return $this->belongsTo(Project::class); }
    public function rejectedBy() { return $this->belongsTo(User::class, 'rejected_by'); }
}
