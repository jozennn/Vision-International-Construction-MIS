<?php

namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class BackupSchedule extends Model
{
    protected $fillable = [
        'name',
        'cron',        // e.g. '0 2 * * *'
        'retention',   // days to keep backups
        'enabled',
        'last_run',
        'next_run',
    ];
 
    protected $casts = [
        'enabled'  => 'boolean',
        'last_run' => 'datetime',
        'next_run' => 'datetime',
    ];
 
    public function backups()
    {
        return $this->hasMany(DatabaseBackup::class);
    }
}