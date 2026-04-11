<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReorderRequest extends Model {
    protected $fillable = [
        'warehouse_inventory_id', 'product_category', 'product_code',
        'current_stock', 'unit', 'availability', 'status', 'quantity_needed', 'notes',
    ];
}