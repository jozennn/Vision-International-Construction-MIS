<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentLog extends Model
{
    protected $fillable = [
        'name',
        'supplier',
        'quantity',
        'description',
        'unit',
        'unit_price',
        'status'
    ];
}
