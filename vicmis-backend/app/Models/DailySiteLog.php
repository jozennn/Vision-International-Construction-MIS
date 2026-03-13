<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailySiteLog extends Model
{
    use HasFactory;

protected $fillable = [
        'project_id', 'log_date', 'client_start_date', 'client_end_date', // 🚨 ADDED
        'start_date', 'end_date', 'lead_man', 'total_area', 
        'accomplishment_percent', 'workers_count', 'installers_data', 
        'remarks', 'photo_path'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
