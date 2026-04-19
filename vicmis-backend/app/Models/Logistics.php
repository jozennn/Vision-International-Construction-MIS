<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Logistics extends Model
{
    protected $table = 'logistics';
    use SoftDeletes;

    protected $fillable = [
        'material_request_id', // ← NEW: links delivery back to the engineer's request
        'trucking_service',
        'product_category',
        'product_code',
        'is_consumable',
        'project_name',
        'driver_name',
        'destination',
        'quantity',
        'date_of_delivery',
        'date_delivered',
        'status',
    ];

    protected $casts = [
        'is_consumable'  => 'boolean',
        'date_delivered' => 'datetime',
        'quantity'       => 'integer',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    /**
     * The material request this delivery was created from.
     * NULL when the delivery was scheduled manually by Logistics.
     */
    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }
}