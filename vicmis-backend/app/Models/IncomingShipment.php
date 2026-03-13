<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncomingShipment extends Model
{
    use HasFactory;

protected $fillable = ['item_name', 'category', 'supplier', 'quantity', 'status', 'date_received'];
}