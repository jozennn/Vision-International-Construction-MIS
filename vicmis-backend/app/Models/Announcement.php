<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = [
        'event_date', 
        'message', 
        'type'
    ];

    protected $casts = [
        'event_date' => 'date',
    ];
}