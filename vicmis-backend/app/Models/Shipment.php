<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Shipment extends Model
{
    use HasFactory, SoftDeletes;
    use LogsActivity;
    // These are the fields we allow React to fill
    protected $fillable = [
        'origin_type',
        'shipment_purpose',        // 👈 ADDED
        'shipment_number', 
        'container_type',
        'tentative_arrival',
        'status',
        'location',
        'shipment_status',
        'added_to_inventory',       // 👈 ADDED
    ];

    // This defines that one Shipment has many Projects inside it
    public function projects()
    {
        return $this->hasMany(ShipmentProject::class);
    }
}