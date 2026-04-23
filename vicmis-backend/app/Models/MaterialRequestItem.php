<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\LogsActivity;
class MaterialRequestItem extends Model
{
    use LogsActivity;
    protected $fillable = [
        'material_request_id',
        'description',
        'product_code',
        'product_category',
        'unit',
        'requested_qty',
        'unit_cost',      // 👈 Added
        'total_cost', 
    ];

    protected $casts = [
        'requested_qty' => 'decimal:2',
        'unit_cost'     => 'decimal:2',  // 👈 Added
        'total_cost'    => 'decimal:2',  // 👈 Added
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
