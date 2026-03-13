<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OfficeMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 
        'description', 
        'quantity', 
        'unit', 
        'unit_price'
    ];
}