<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentProject extends Model
{
    protected $fillable = ['project_name', 'product_category', 'quantity', 'coverage_sqm'];

    // Tells the project which shipment it belongs to
    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}