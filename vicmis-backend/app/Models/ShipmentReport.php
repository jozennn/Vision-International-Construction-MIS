<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentReport extends Model
{
    protected $fillable = [
        'shipment_id',
        'shipment_number',
        'items',       // JSON array of { product_category, product_code, issue, condition }
        'filed_by',    // user_id (nullable)
    ];

    protected $casts = [
        'items' => 'array',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}