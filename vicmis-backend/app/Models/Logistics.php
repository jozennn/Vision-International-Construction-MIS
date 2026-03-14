<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Logistics extends Model
{
    protected $table = 'logistics';

    protected $fillable = [
        'trucking_service',
        'product_category',
        'product_code',
        'is_consumable',
        'project_name',
        'driver_name',
        'destination',
        'date_of_delivery',
        'date_delivered',
        'status',
        'quantity',
    ];

    protected $casts = [
        'is_consumable'  => 'boolean',
        'date_delivered' => 'datetime',
        'quantity'       => 'integer',
    ];
}
