<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'name', 
        'position', 
        'department', 
        'status',
        'status',
        'birthday',      
        'rate_per_day',
    ];
}