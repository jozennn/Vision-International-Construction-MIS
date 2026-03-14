<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryMaterial extends Model
{
    use HasFactory;

    // This line tells Laravel exactly which table to use
    protected $table = 'delivery_materials';

    // Ensure these match your DB columns exactly
   protected $fillable = [
    'item_name', 'category', 'destination', 'quantity', 
    'driver_name', 'recipient', 'status', 'departure_time', 'expected_delivery_date'
    ];
}