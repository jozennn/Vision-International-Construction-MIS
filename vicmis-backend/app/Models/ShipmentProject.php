<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentProject extends Model
{
    protected $fillable = [
        'shipment_id',           // 👈 ADDED
        'project_name',
        'product_category',
        'product_code',          // 👈 ADDED
        'unit',                  // 👈 ADDED
        'quantity',
        'coverage_sqm',
    ];

    // Tells the project which shipment it belongs to
    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}