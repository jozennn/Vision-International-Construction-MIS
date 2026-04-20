<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailySiteLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 
        'log_date', 
        'client_start_date',
        'client_end_date',
        'start_date',
        'end_date',
        'lead_man',
        'total_area',
        'accomplishment_percent',
        'workers_count',
        'installers_data',
        'team_photo_1',      // 👈 ADD THIS
        'team_photo_2',      // 👈 ADD THIS
        'remarks',
        'photo_path'
    ];
    
    protected $casts = [
        'installers_data' => 'array',
        'log_date' => 'date',
        'client_start_date' => 'date',
        'client_end_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}