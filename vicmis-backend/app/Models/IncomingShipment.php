<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;
    

class IncomingShipment extends Model
{
    use HasFactory;
    use LogsActivity;

protected $fillable = ['item_name', 'category', 'supplier', 'quantity', 'status', 'date_received'];
}