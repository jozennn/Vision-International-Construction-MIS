<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WarehouseInventory extends Model
{
    use HasFactory;

    protected $table = 'warehouse_inventory';

    protected $fillable = [
        'product_category',
        'product_code',
        'unit',
        'price_per_piece',
        'current_stock',
        'reserve',
        'availability',
        'is_consumable',
        'condition',
        'notes',
    ];

    protected $casts = [
        'is_consumable'   => 'boolean',
        'current_stock'   => 'integer',
        'reserve'         => 'integer',
        'price_per_piece' => 'decimal:2',
    ];

    // ─── Computed Attributes ───────────────────────────────────────────────────

    /**
     * Total quantity after reserve = current_stock - reserve
     */
    public function getTotalAfterReserveAttribute(): int
    {
        return $this->current_stock - $this->reserve;
    }

    /**
     * Total stock value = current_stock * price_per_piece
     */
    public function getTotalStockValueAttribute(): float
    {
        return $this->current_stock * (float) $this->price_per_piece;
    }

    /**
     * Automatically derive availability from current_stock.
     * LOW STOCK threshold: 1–10 units.
     */
    public static function deriveAvailability(int $stock): string
    {
        if ($stock <= 0)  return 'NO STOCK';
        if ($stock <= 10) return 'LOW STOCK';
        return 'ON STOCK';
    }

    // ─── Scopes ────────────────────────────────────────────────────────────────

    public function scopeMainProducts($query)
    {
        return $query->where('is_consumable', false);
    }

    public function scopeConsumables($query)
    {
        return $query->where('is_consumable', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('product_category', $category);
    }

    // ─── Static Helpers ────────────────────────────────────────────────────────

    /**
     * All valid product categories with their default unit.
     */
    public static function categories(): array
    {
        return [
            'NON-DIRECTIONAL (2Mx20Mx2MM)'       => 'Rolls',
            'DIRECTIONAL (2Mx20Mx2MM)'            => 'Rolls',
            'ANTIBACTERIAL VINYL ROLL FORM'       => 'Rolls',
            'CAPPING SEAL'                        => 'Rolls',
            'WELDING ROD'                         => 'Rolls',
            'MAPLE HARDWOOD'                      => 'Pcs',
            'PVC SPORTS ROLL FORM'                => 'Rolls',
            'PVC HOSPITAL HANDRAILS'              => 'Pcs',
            'HANDRAILS HS-616C'                   => 'Pcs',
            'PVC HOSPITAL CORNER GUARDS'          => 'Pcs',
            'CARPET TILES'                        => 'Pcs',
            'ANTI-STATIC VINYL TILES'             => 'Pcs',
            'CONSUMABLES'                         => 'Pcs',
        ];
    }

    /**
     * Preset product codes per category with their units.
     */
    public static function presetCodes(): array
    {
        return [
            'NON-DIRECTIONAL (2Mx20Mx2MM)' => [
                ['code' => '182062',       'unit' => 'Rolls'],
                ['code' => 'BNZ 67 - 002', 'unit' => 'Rolls'],
                ['code' => 'WL 320-6361',  'unit' => 'Rolls'],
                ['code' => '182058',       'unit' => 'Rolls'],
                ['code' => 'WL 310 - 5303','unit' => 'Rolls'],
            ],
            'DIRECTIONAL (2Mx20Mx2MM)' => [
                ['code' => 'F6013', 'unit' => 'Rolls'],
                ['code' => 'F6016', 'unit' => 'Rolls'],
                ['code' => 'F6023', 'unit' => 'Rolls'],
                ['code' => 'F6020', 'unit' => 'Rolls'],
                ['code' => 'F6015', 'unit' => 'Rolls'],
            ],
            'ANTIBACTERIAL VINYL ROLL FORM' => [
                ['code' => 'COVE FORMER', 'unit' => 'Rolls'],
                ['code' => '182068',      'unit' => 'Rolls'],
            ],
            'CAPPING SEAL' => [
                ['code' => 'BNZ 67 - 002', 'unit' => 'Rolls'],
                ['code' => 'F6013',        'unit' => 'Rolls'],
                ['code' => 'F6016',        'unit' => 'Rolls'],
                ['code' => 'WL 410-002',   'unit' => 'Rolls'],
                ['code' => 'HP3006',       'unit' => 'Rolls'],
            ],
            'WELDING ROD' => [
                ['code' => 'F6013',       'unit' => 'Rolls'],
                ['code' => 'BNZ 67 - 002','unit' => 'Rolls'],
                ['code' => 'WL 320-6361', 'unit' => 'Rolls'],
                ['code' => '182056',      'unit' => 'Rolls'],
                ['code' => 'GYM 6502',    'unit' => 'Rolls'],
            ],
            'MAPLE HARDWOOD' => [
                ['code' => 'OLD',     'unit' => 'Pcs'],
                ['code' => 'C&L NEW', 'unit' => 'Pcs'],
                ['code' => 'C&L',     'unit' => 'Pcs'],
                ['code' => 'C&L OLD', 'unit' => 'Pcs'],
            ],
            'PVC SPORTS ROLL FORM' => [
                ['code' => 'GYM - 6502',        'unit' => 'Rolls'],
                ['code' => 'GYM - 6303',        'unit' => 'Rolls'],
                ['code' => 'BAV - 8019',        'unit' => 'Rolls'],
                ['code' => 'BAV - 8019 (GLOSSY)','unit' => 'Rolls'],
                ['code' => 'BAV - 8019 (MATTE)', 'unit' => 'Rolls'],
            ],
            'PVC HOSPITAL HANDRAILS' => [
                ['code' => 'BLUE (RAL 5015)',  'unit' => 'Pcs'],
                ['code' => 'YELLOW-GREEN',     'unit' => 'Pcs'],
                ['code' => 'Orange / Brown',   'unit' => 'Pcs'],
            ],
            'HANDRAILS HS-616C' => [
                ['code' => 'PVC PANEL',              'unit' => 'Pcs'],
                ['code' => 'ALUMINUM PANEL',         'unit' => 'Pcs'],
                ['code' => 'END CAPS',               'unit' => 'Pcs'],
                ['code' => 'BRACKET',                'unit' => 'Pcs'],
                ['code' => 'SCREWS, NUTS, WASHERS',  'unit' => 'Pcs'],
            ],
            'PVC HOSPITAL CORNER GUARDS' => [
                ['code' => 'MILKY-WHITE', 'unit' => 'Pcs'],
                ['code' => 'BEIGE',       'unit' => 'Pcs'],
            ],
            'CARPET TILES' => [
                ['code' => 'H-05 (BITUMEN)',   'unit' => 'Pcs'],
                ['code' => 'C-05 (PVC BACKING)','unit' => 'Pcs'],
            ],
            'ANTI-STATIC VINYL TILES' => [
                ['code' => 'HJ1103',                  'unit' => 'Pcs'],
                ['code' => '600 x 600 3MM THICKNESS', 'unit' => 'Pcs'],
            ],
            'CONSUMABLES' => [
                ['code' => 'SHOE GLUE',                    'unit' => 'Pcs'],
                ['code' => 'SELF LEVELING',                'unit' => 'Bags'],
                ['code' => 'NIPPON VARNISH',               'unit' => 'Gals (6pcs per box)'],
                ['code' => 'ACRYLON 7"',                   'unit' => 'Pcs'],
                ['code' => 'TRUSS HEAD SCREW',             'unit' => 'Pcs'],
                ['code' => 'POLYETHELYLENE PLASTIC SHEET', 'unit' => 'Rolls'],
            ],
        ];
    }
}