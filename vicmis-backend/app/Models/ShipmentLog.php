<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;
class ShipmentLog extends Model
{
    use LogsActivity;
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
