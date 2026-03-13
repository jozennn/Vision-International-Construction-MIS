<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RequestSeeder extends Seeder
{
    public function run()
    {
        // Use emails instead of department to be 100% sure we get the right person
        $engineer = User::where('email', 'eng@vision.com')->first();
        $sales = User::where('email', 'sales@vision.com')->first();

        // Safety check: if the users don't exist, stop here so we don't crash
        if (!$engineer || !$sales) {
            $this->command->error("Seeding failed: Could not find users eng@vision.com or sales@vision.com. Make sure UserSeeder runs first!");
            return;
        }

        $requests = [
            [
                'user_id' => $engineer->id,
                'type' => 'ot',
                'date' => now()->format('Y-m-d'),
                'hours' => 4.0,
                'reason' => 'Structural calculation for Project X',
                'status' => 'pending',
                'start_date' => now()->format('Y-m-d'), // Added for your Dashboard logic
                'end_date' => now()->format('Y-m-d'),   // Added for your Dashboard logic
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $sales->id,
                'type' => 'leave',
                'date' => now()->addDays(3)->format('Y-m-d'),
                'hours' => null,
                'reason' => 'Family vacation',
                'status' => 'pending',
                'start_date' => now()->addDays(3)->format('Y-m-d'),
                'end_date' => now()->addDays(7)->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $engineer->id,
                'type' => 'half-day',
                'date' => now()->addDays(1)->format('Y-m-d'),
                'hours' => 4.0,
                'reason' => 'Doctor appointment',
                'status' => 'pending',
                'start_date' => now()->addDays(1)->format('Y-m-d'),
                'end_date' => now()->addDays(1)->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('employee_requests')->insert($requests);
    }
}