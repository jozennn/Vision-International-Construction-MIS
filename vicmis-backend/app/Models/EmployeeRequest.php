<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeRequest extends Model
{
    use HasFactory;

    protected $fillable = [
    'user_id',
    'type',
    'reason',
    'status',
    'date',       // For OT date or single-day requests
    'start_date', // For Leave/Absent
    'end_date',   // For Leave/Absent
    'start_time', // NEW: For Overtime
    'end_time',   // NEW: For Overtime
    'hours'
    ];
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}