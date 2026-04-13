<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WarehouseInventory;

class WarehouseInventorySeeder extends Seeder
{
    public function run(): void
    {
        WarehouseInventory::truncate();

        $products = [
            // ── NON-DIRECTIONAL ──────────────────────────────────────────────
            ['product_category' => 'NON-DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => '182062',        'unit' => 'Rolls', 'price_per_piece' => 4500.00,  'current_stock' => 0,  'delivery_in' => 0,   'delivery_out' => 23,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'NON-DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'BNZ 67 - 002',  'unit' => 'Rolls', 'price_per_piece' => 4800.00,  'current_stock' => 7,  'delivery_in' => 7,   'delivery_out' => 15,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'NON-DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'WL 320-6361',   'unit' => 'Rolls', 'price_per_piece' => 4600.00,  'current_stock' => 1,  'delivery_in' => 0,   'delivery_out' => 0,   'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'NON-DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => '182058',        'unit' => 'Rolls', 'price_per_piece' => 4500.00,  'current_stock' => 1,  'delivery_in' => 0,   'delivery_out' => 0,   'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'NON-DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'WL 310 - 5303', 'unit' => 'Rolls', 'price_per_piece' => 4400.00,  'current_stock' => 3,  'delivery_in' => 5,   'delivery_out' => 1,   'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── DIRECTIONAL ──────────────────────────────────────────────────
            ['product_category' => 'DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'F6013', 'unit' => 'Rolls', 'price_per_piece' => 5200.00,  'current_stock' => 1,  'delivery_in' => 0, 'delivery_out' => 2,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'F6016', 'unit' => 'Rolls', 'price_per_piece' => 5200.00,  'current_stock' => 1,  'delivery_in' => 0, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'F6023', 'unit' => 'Rolls', 'price_per_piece' => 5400.00,  'current_stock' => 4,  'delivery_in' => 0, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'F6020', 'unit' => 'Rolls', 'price_per_piece' => 5300.00,  'current_stock' => 1,  'delivery_in' => 0, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'DIRECTIONAL (2Mx20Mx2MM)', 'product_code' => 'F6015', 'unit' => 'Rolls', 'price_per_piece' => 5200.00,  'current_stock' => 6,  'delivery_in' => 11,'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 5],

            // ── ANTIBACTERIAL VINYL ROLL FORM ─────────────────────────────────
            ['product_category' => 'ANTIBACTERIAL VINYL ROLL FORM', 'product_code' => 'COVE FORMER', 'unit' => 'Rolls', 'price_per_piece' => 1200.00,  'current_stock' => 13, 'delivery_in' => 16, 'delivery_out' => 50, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'ANTIBACTERIAL VINYL ROLL FORM', 'product_code' => '182068',      'unit' => 'Rolls', 'price_per_piece' => 6500.00,  'current_stock' => 4,  'delivery_in' => 4,  'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── CAPPING SEAL ─────────────────────────────────────────────────
            ['product_category' => 'CAPPING SEAL', 'product_code' => 'BNZ 67 - 002', 'unit' => 'Rolls', 'price_per_piece' => 850.00,   'current_stock' => 2,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 10],
            ['product_category' => 'CAPPING SEAL', 'product_code' => 'F6013',        'unit' => 'Rolls', 'price_per_piece' => 900.00,   'current_stock' => 1,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'CAPPING SEAL', 'product_code' => 'F6016',        'unit' => 'Rolls', 'price_per_piece' => 900.00,   'current_stock' => 1,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'CAPPING SEAL', 'product_code' => 'WL 410-002',   'unit' => 'Rolls', 'price_per_piece' => 875.00,   'current_stock' => 11, 'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'CAPPING SEAL', 'product_code' => 'HP3006',       'unit' => 'Rolls', 'price_per_piece' => 820.00,   'current_stock' => 0,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── WELDING ROD ───────────────────────────────────────────────────
            ['product_category' => 'WELDING ROD', 'product_code' => 'F6013',        'unit' => 'Rolls', 'price_per_piece' => 380.00,   'current_stock' => 2,  'delivery_in' => 0, 'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'WELDING ROD', 'product_code' => 'BNZ 67 - 002', 'unit' => 'Rolls', 'price_per_piece' => 380.00,   'current_stock' => 3,  'delivery_in' => 0, 'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'WELDING ROD', 'product_code' => 'WL 320-6361',  'unit' => 'Rolls', 'price_per_piece' => 360.00,   'current_stock' => 1,  'delivery_in' => 0, 'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'WELDING ROD', 'product_code' => '182056',       'unit' => 'Rolls', 'price_per_piece' => 350.00,   'current_stock' => 1,  'delivery_in' => 0, 'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'WELDING ROD', 'product_code' => 'GYM 6502',     'unit' => 'Rolls', 'price_per_piece' => 370.00,   'current_stock' => 0,  'delivery_in' => 0, 'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── MAPLE HARDWOOD ────────────────────────────────────────────────
            ['product_category' => 'MAPLE HARDWOOD', 'product_code' => 'OLD',     'unit' => 'Pcs', 'price_per_piece' => 1800.00,  'current_stock' => 45, 'delivery_in' => 0,  'delivery_out' => 12, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'MAPLE HARDWOOD', 'product_code' => 'C&L NEW', 'unit' => 'Pcs', 'price_per_piece' => 2200.00,  'current_stock' => 80, 'delivery_in' => 80, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 20],
            ['product_category' => 'MAPLE HARDWOOD', 'product_code' => 'C&L',     'unit' => 'Pcs', 'price_per_piece' => 2100.00,  'current_stock' => 30, 'delivery_in' => 0,  'delivery_out' => 5,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'MAPLE HARDWOOD', 'product_code' => 'C&L OLD', 'unit' => 'Pcs', 'price_per_piece' => 1700.00,  'current_stock' => 2,  'delivery_in' => 0,  'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── PVC SPORTS ROLL FORM ──────────────────────────────────────────
            ['product_category' => 'PVC SPORTS ROLL FORM', 'product_code' => 'GYM - 6502',          'unit' => 'Rolls', 'price_per_piece' => 7500.00,  'current_stock' => 5,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC SPORTS ROLL FORM', 'product_code' => 'GYM - 6303',          'unit' => 'Rolls', 'price_per_piece' => 7200.00,  'current_stock' => 3,  'delivery_in' => 0,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC SPORTS ROLL FORM', 'product_code' => 'BAV - 8019',          'unit' => 'Rolls', 'price_per_piece' => 8000.00,  'current_stock' => 8,  'delivery_in' => 10, 'delivery_out' => 2, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC SPORTS ROLL FORM', 'product_code' => 'BAV - 8019 (GLOSSY)', 'unit' => 'Rolls', 'price_per_piece' => 8500.00,  'current_stock' => 4,  'delivery_in' => 4,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC SPORTS ROLL FORM', 'product_code' => 'BAV - 8019 (MATTE)',  'unit' => 'Rolls', 'price_per_piece' => 8500.00,  'current_stock' => 2,  'delivery_in' => 2,  'delivery_out' => 0, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── PVC HOSPITAL HANDRAILS ────────────────────────────────────────
            ['product_category' => 'PVC HOSPITAL HANDRAILS', 'product_code' => 'BLUE (RAL 5015)', 'unit' => 'Pcs', 'price_per_piece' => 3200.00,  'current_stock' => 15, 'delivery_in' => 20, 'delivery_out' => 5,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC HOSPITAL HANDRAILS', 'product_code' => 'YELLOW-GREEN',    'unit' => 'Pcs', 'price_per_piece' => 3200.00,  'current_stock' => 8,  'delivery_in' => 8,  'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC HOSPITAL HANDRAILS', 'product_code' => 'Orange / Brown',  'unit' => 'Pcs', 'price_per_piece' => 3200.00,  'current_stock' => 0,  'delivery_in' => 0,  'delivery_out' => 10, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── HANDRAILS HS-616C ─────────────────────────────────────────────
            ['product_category' => 'HANDRAILS HS-616C', 'product_code' => 'PVC PANEL',             'unit' => 'Pcs', 'price_per_piece' => 1500.00,  'current_stock' => 24, 'delivery_in' => 30, 'delivery_out' => 6,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'HANDRAILS HS-616C', 'product_code' => 'ALUMINUM PANEL',        'unit' => 'Pcs', 'price_per_piece' => 2800.00,  'current_stock' => 12, 'delivery_in' => 12, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'HANDRAILS HS-616C', 'product_code' => 'END CAPS',              'unit' => 'Pcs', 'price_per_piece' => 85.00,    'current_stock' => 50, 'delivery_in' => 50, 'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 10],
            ['product_category' => 'HANDRAILS HS-616C', 'product_code' => 'BRACKET',               'unit' => 'Pcs', 'price_per_piece' => 320.00,   'current_stock' => 3,  'delivery_in' => 20, 'delivery_out' => 17, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'HANDRAILS HS-616C', 'product_code' => 'SCREWS, NUTS, WASHERS', 'unit' => 'Pcs', 'price_per_piece' => 12.00,    'current_stock' => 200,'delivery_in' => 200,'delivery_out' => 0,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── PVC HOSPITAL CORNER GUARDS ────────────────────────────────────
            ['product_category' => 'PVC HOSPITAL CORNER GUARDS', 'product_code' => 'MILKY-WHITE', 'unit' => 'Pcs', 'price_per_piece' => 950.00,   'current_stock' => 6,  'delivery_in' => 10, 'delivery_out' => 4, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'PVC HOSPITAL CORNER GUARDS', 'product_code' => 'BEIGE',       'unit' => 'Pcs', 'price_per_piece' => 950.00,   'current_stock' => 0,  'delivery_in' => 0,  'delivery_out' => 8, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── CARPET TILES ──────────────────────────────────────────────────
            ['product_category' => 'CARPET TILES', 'product_code' => 'H-05 (BITUMEN)',     'unit' => 'Pcs', 'price_per_piece' => 280.00,   'current_stock' => 120, 'delivery_in' => 200, 'delivery_out' => 80,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'CARPET TILES', 'product_code' => 'C-05 (PVC BACKING)', 'unit' => 'Pcs', 'price_per_piece' => 320.00,   'current_stock' => 60,  'delivery_in' => 100, 'delivery_out' => 40,  'return_out' => 0, 'return_in' => 0, 'reserve' => 20],

            // ── ANTI-STATIC VINYL TILES ───────────────────────────────────────
            ['product_category' => 'ANTI-STATIC VINYL TILES', 'product_code' => 'HJ1103',                  'unit' => 'Pcs', 'price_per_piece' => 420.00,   'current_stock' => 45, 'delivery_in' => 50, 'delivery_out' => 5,  'return_out' => 0, 'return_in' => 0, 'reserve' => 0],
            ['product_category' => 'ANTI-STATIC VINYL TILES', 'product_code' => '600 x 600 3MM THICKNESS', 'unit' => 'Pcs', 'price_per_piece' => 480.00,   'current_stock' => 2,  'delivery_in' => 30, 'delivery_out' => 28, 'return_out' => 0, 'return_in' => 0, 'reserve' => 0],

            // ── CONSUMABLES ───────────────────────────────────────────────────
            ['product_category' => 'CONSUMABLES', 'product_code' => 'SHOE GLUE',                    'unit' => 'Pcs',              'price_per_piece' => 185.00,   'current_stock' => 7,    'delivery_in' => 0,   'delivery_out' => 29,  'return_out' => 23,  'return_in' => 0,  'reserve' => 0,  'is_consumable' => true],
            ['product_category' => 'CONSUMABLES', 'product_code' => 'SELF LEVELING',                'unit' => 'Bags',             'price_per_piece' => 650.00,   'current_stock' => 0,    'delivery_in' => 166, 'delivery_out' => 166, 'return_out' => 0,   'return_in' => 0,  'reserve' => 80, 'is_consumable' => true],
            ['product_category' => 'CONSUMABLES', 'product_code' => 'NIPPON VARNISH',               'unit' => 'Gals (6pcs/box)', 'price_per_piece' => 1200.00,  'current_stock' => 34,   'delivery_in' => 17,  'delivery_out' => 21,  'return_out' => 0,   'return_in' => 0,  'reserve' => 0,  'is_consumable' => true],
            ['product_category' => 'CONSUMABLES', 'product_code' => 'ACRYLON 7"',                   'unit' => 'Pcs',              'price_per_piece' => 95.00,    'current_stock' => 3,    'delivery_in' => 0,   'delivery_out' => 0,   'return_out' => 0,   'return_in' => 0,  'reserve' => 0,  'is_consumable' => true],
            ['product_category' => 'CONSUMABLES', 'product_code' => 'TRUSS HEAD SCREW',             'unit' => 'Pcs',              'price_per_piece' => 8.00,     'current_stock' => 69,   'delivery_in' => 0,   'delivery_out' => 504, 'return_out' => 0,   'return_in' => 0,  'reserve' => 0,  'is_consumable' => true],
            ['product_category' => 'CONSUMABLES', 'product_code' => 'POLYETHELYLENE PLASTIC SHEET', 'unit' => 'Rolls',            'price_per_piece' => 750.00,   'current_stock' => 3,    'delivery_in' => 9,   'delivery_out' => 7,   'return_out' => 0,   'return_in' => 0,  'reserve' => 0,  'is_consumable' => true],
        ];

        foreach ($products as $product) {
            $isConsumable = $product['is_consumable']
                ?? ($product['product_category'] === 'CONSUMABLES');

            WarehouseInventory::create([
                'product_category' => $product['product_category'],
                'product_code'     => $product['product_code'],
                'unit'             => $product['unit'],
                'price_per_piece'  => $product['price_per_piece'] ?? 0,
                'current_stock'    => $product['current_stock'],
                'reserve'          => $product['reserve']      ?? 0,
                'condition'        => 'Good',
                'is_consumable'    => $isConsumable,
                'availability'     => WarehouseInventory::deriveAvailability($product['current_stock']),
            ]);
        }

        $this->command->info('✅  Seeded ' . count($products) . ' warehouse inventory products.');
    }
}