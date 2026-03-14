<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    // These are the fields we allow React to fill
    protected $fillable = [
        'origin_type', 'shipment_number', 
        'container_type', 'tentative_arrival', 'status', 'location', 'shipment_status'
    ];

    // This defines that one Shipment has many Projects inside it
    public function projects()
    {
        return $this->hasMany(ShipmentProject::class);
    }
}