<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $fillable = [
        'origin_type',
        'shipment_purpose',   // 'RESERVE_FOR_PROJECT' | 'NEW_STOCK'
        'shipment_number',
        'container_type',
        'tentative_arrival',
        'status',
        'location',
        'shipment_status',
    ];

    public function projects()
    {
        return $this->hasMany(ShipmentProject::class);
    }
}
