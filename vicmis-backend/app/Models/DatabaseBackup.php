<?php

namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class DatabaseBackup extends Model
{
    protected $fillable = [
        'filename',
        'type',           // 'manual' | 'scheduled'
        'status',         // 'success' | 'failed' | 'running'
        'size',           // bytes
        'created_by',     // user id (null for scheduled)
        'backup_schedule_id',
    ];
 
    public function schedule()
    {
        return $this->belongsTo(BackupSchedule::class, 'backup_schedule_id');
    }
 
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}