<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Logistics extends Model
{
    protected $table = 'logistics';

    protected $fillable = [
        'trucking_service',
        'product_category',
        'product_code',       // ← added
        'is_consumable',      // ← fixed from 'consumable'/'consumables'
        'project_name',
        'driver_name',
        'destination',
        'quantity',           // ← added
        'date_of_delivery',
        'date_delivered',
        'status',
    ];

    protected $casts = [
        'is_consumable'  => 'boolean',
        'date_delivered' => 'datetime',
        'quantity'       => 'integer',
    ];
}