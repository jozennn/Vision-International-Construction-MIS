<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialRequestItem extends Model
{
    protected $fillable = [
        'material_request_id',
        'description',
        'product_code',
        'unit',
        'requested_qty',
    ];

    protected $casts = [
        'requested_qty' => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────────────────

    public function materialRequest(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class);
    }

    /**
     * Convenience accessor — resolves the live warehouse inventory row
     * for this item based on product_code.
     */
    public function warehouseInventory(): BelongsTo
    {
        return $this->belongsTo(WarehouseInventory::class, 'product_code', 'product_code');
    }
}
