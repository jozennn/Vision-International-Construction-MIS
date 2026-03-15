<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectSiteInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'inspector_id', 'inspector_name', 'position',
        'site_location', 'inspection_date', 'inspection_time',
        'materials_scope', 'notes_remarks', 'checklist',
        'inspection_photo', 'submitted_at',
    ];

    protected $casts = [
        'checklist'       => 'array',
        'inspection_date' => 'date',
        'submitted_at'    => 'datetime',
    ];

    public function project()   { return $this->belongsTo(Project::class); }
    public function inspector() { return $this->belongsTo(User::class, 'inspector_id'); }
}
