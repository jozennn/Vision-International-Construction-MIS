<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteInspection extends Model
{
    use HasFactory;

    protected $table = 'site_inspections';

    protected $fillable = [
        'project_id',
        'project_name',
        'site_location',
        'inspection_date',
        'inspection_time',
        'inspector_id',
        'inspector_name',
        'position',
        'materials_scope',
        'notes_remarks',
        'checklist',
    ];

    /**
     * Cast checklist to/from array automatically.
     */
    protected $casts = [
        'checklist'       => 'array',
        'inspection_date' => 'date:Y-m-d',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
