<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentProject extends Model
{
    protected $fillable = [
        'shipment_id',
        'project_name',      // nullable for NEW_STOCK
        'product_category',
        'product_code',      // new
        'unit',              // new
        'quantity',
        'coverage_sqm',      // only for RESERVE_FOR_PROJECT
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
