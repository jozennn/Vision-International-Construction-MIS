<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConstructionMaterial extends Model
{
    use HasFactory;

    // This allows React to send data to these columns
    protected $fillable = [
        'name', 
        'description', 
        'quantity', 
        'unit', 
        'unit_price',
        'supplier',

    ];
}