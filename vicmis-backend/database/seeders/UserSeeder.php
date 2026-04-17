<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    public function run()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        User::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');



        $users = [
            // --- IT / ADMIN (System Access) ---
            ['name' => 'Admin User', 'email' => 'admin@vision.com', 'role' => 'admin', 'dept' => 'IT', 'pos' => 'System Admin', 'rate' => 2500],

            // --- SUPER ADMIN ---
            ['name' => 'Super Admin', 'email' => 'superadmin@vision.com', 'role' => 'super_admin', 'dept' => 'IT', 'pos' => 'System Owner / Super Admin', 'rate' => 5000],
            ['name' => 'Nico', 'email' => 'akosinicolas1+sp1@gmail.com', 'role' => 'super_admin', 'dept' => 'IT', 'pos' => 'System Owner / Super Admin', 'rate' => 5000],
            ['name' => 'King Kurt', 'email' => 'kingkurtu+sp2@gmail.com', 'role' => 'super_admin', 'dept' => 'IT', 'pos' => 'System Owner / Super Admin', 'rate' => 5000],
            ['name' => 'Justine', 'email' => 'jdlarkin20+sp3@gmail.com', 'role' => 'super_admin', 'dept' => 'IT', 'pos' => 'System Owner / Super Admin', 'rate' => 5000],

            // --- MANAGEMENT (Includes Ops Assistant for Bidding/Awarding Phase) ---
            ['name' => 'General Manager', 'email' => 'mgmt@vision.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'GM', 'rate' => 3000],
            ['name' => 'Operations Assistant', 'email' => 'ops@vision.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'Operations Assistant', 'rate' => 1500],
            ['name' => 'Kurt', 'email' => 'visionintl123+gm1@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'GM', 'rate' => 1500],
            ['name' => 'Kurt', 'email' => 'kingkurtu+oa2@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' =>  'Operations Assistant', 'rate' => 1500],

            ['name' => 'Nico', 'email' => 'visionintl123+gm2@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'GM', 'rate' => 1500],
            ['name' => 'Nico', 'email' => 'akosinicolas1+oa2@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'Operations Assistant', 'rate' => 1500],

            ['name' => 'Justine', 'email' => 'visionintl12+gm3@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'GM', 'rate' => 1500],
            ['name' => 'Justine', 'email' => 'jdlarkin20+oa3@gmail.com', 'role' => 'manager', 'dept' => 'Management', 'pos' => 'Operations Assistant', 'rate' => 1500],

            // --- SALES ---
            ['name' => 'Victor Sales Head', 'email' => 'sales@vision.com', 'role' => 'dept_head', 'dept' => 'Sales', 'pos' => 'Sales Head', 'rate' => 1500],
            ['name' => 'Sam Sales Staff', 'email' => 'sales_staff@vision.com', 'role' => 'sales_employee', 'dept' => 'Sales', 'pos' => 'Sales Associate', 'rate' => 700],
            ['name' => 'Kurt', 'email' => 'visionintl123+shead1@gmail.com', 'role' => 'dept_head', 'dept' => 'Sales', 'pos' => 'Sales Head', 'rate' => 1500],
            ['name' => 'Kurt', 'email' => 'kingkurtu+ss1@gmail.com', 'role' => 'sales_employee', 'dept' => 'Sales', 'pos' => 'Sales Associate', 'rate' => 1500],
            ['name' => 'Nico', 'email' => 'visionintl123+shead2@gmail.com', 'role' => 'dept_head', 'dept' => 'Sales', 'pos' => 'Sales Head', 'rate' => 1500],
            ['name' => 'Nico', 'email' => 'akosinicolas+ss2@gmail.com', 'role' => 'sales_employee', 'dept' => 'Sales', 'pos' => 'Sales Associate', 'rate' => 1500],
            ['name' => 'Justine', 'email' => 'visionintl123+shead3@gmail.com', 'role' => 'dept_head', 'dept' => 'Sales', 'pos' => 'Sales Head', 'rate' => 1500],
            ['name' => 'Justine', 'email' => 'jdlarkin20+ss3@gmail.com', 'role' => 'dept_employee', 'dept' => 'Sales', 'pos' => 'Sales Associate', 'rate' => 1500],

            // --- LOGISTICS ---
            ['name' => 'Larry Logistics Head', 'email' => 'logistics@vision.com', 'role' => 'dept_head', 'dept' => 'Logistics', 'pos' => 'Logistics Manager', 'rate' => 1400],
            ['name' => 'Luke Logistics Staff', 'email' => 'logistics_staff@vision.com', 'role' => 'logistics_employee', 'dept' => 'Logistics', 'pos' => 'Warehouse Staff', 'rate' => 650],
            ['name' => 'Kurt', 'email' => 'visionintl123+lhead1@gmail.com', 'role' => 'dept_head', 'dept' => 'Logistics', 'pos' => 'Logistics Manager', 'rate' => 1500],
            ['name' => 'Kurt', 'email' => 'kingkurtu+ls1@gmail.com', 'role' => 'logistics_employee', 'dept' => 'Logistics', 'pos' => 'Warehouse Staff', 'rate' => 1500],
            ['name' => 'Nico', 'email' => 'visionintl123+lhead2@gmail.com', 'role' => 'dept_head', 'dept' => 'Logistics', 'pos' => 'Logistics Manager', 'rate' => 1500],
            ['name' => 'Nico', 'email' => 'akosinicolas1+ls2@gmail.com', 'role' => 'logistics_employee', 'dept' => 'Logistics', 'pos' => 'Warehouse Staff', 'rate' => 1500],
            ['name' => 'Justine', 'email' => 'visionintl123+lhead3@gmail.com', 'role' => 'dept_head', 'dept' => 'Logistics', 'pos' => 'Logistics Manager', 'rate' => 1500],
            ['name' => 'Justine', 'email' => 'jdlarkin20+ls3@gmail.com', 'role' => 'logistics_employee', 'dept' => 'Logistics', 'pos' => 'Warehouse Staff', 'rate' => 1500],

            // --- ENGINEERING ---
            ['name' => 'Engr. David Chief', 'email' => 'eng@vision.com', 'role' => 'dept_head', 'dept' => 'Engineering', 'pos' => 'Chief Engineer', 'rate' => 2200],
            ['name' => 'Engr. Eric Staff', 'email' => 'eng_staff@vision.com', 'role' => 'engineering_employee', 'dept' => 'Engineering', 'pos' => 'Junior Engineer', 'rate' => 1200],
            ['name' => 'Kurt', 'email' => 'visionintl123+ehead1@gmail.com', 'role' => 'dept_head', 'dept' => 'Engineering', 'pos' => 'Head Engineer', 'rate' => 1500],
            ['name' => 'Kurt', 'email' => 'kingkurtu+es1@gmail.com', 'role' => 'engineering_employee', 'dept' => 'Engineering', 'pos' =>  'Engineer', 'rate' => 1500],

            ['name' => 'Nico', 'email' => 'visionintl123+ehead2@gmail.com', 'role' => 'dept_head', 'dept' => 'Engineering', 'pos' => 'Chief Engineer', 'rate' => 1500],
	        ['name' => 'Nico', 'email' => 'akosinicolas1+es2@gmail.com', 'role' => 'engineering_employee', 'dept' => 'Engineering', 'pos' => 'Junior Engineer', 'rate' => 1500],

	        ['name' => 'Justine', 'email' => 'visionintl123+ehead3@gmail.com', 'role' => 'dept_head', 'dept' => 'Engineering', 'pos' => 'Head Engineer', 'rate' => 1500],
	        ['name' => 'Justine', 'email' => 'jdlarkin20+es3@gmail.com', 'role' => 'engineering_employee', 'dept' => 'Engineering', 'pos' => 'Junior Engineer', 'rate' => 1500],

            // --- ACCOUNTING / PROCUREMENT ---
            ['name' => 'Alice Accounting Head', 'email' => 'accounting@vision.com', 'role' => 'dept_head', 'dept' => 'Accounting/Procurement', 'pos' => 'Procurement Head', 'rate' => 1700],
            ['name' => 'Arnold Accounting Staff', 'email' => 'accounting_staff@vision.com', 'role' => 'accounting_employee', 'dept' => 'Accounting/Procurement', 'pos' => 'Purchasing Clerk', 'rate' => 850],
	        ['name' => 'Kurt', 'email' => 'visionintl123+ahead1@gmail.com', 'role' => 'dept_head', 'dept' => 'Accounting/Procurement', 'pos' => 'Procurement Head', 'rate' => 1500],
	        ['name' => 'Kurt', 'email' => 'kingkurtu+as1@gmail.com', 'role' => 'accounting_employee', 'dept' => 'Accounting/Procurement', 'pos' => 'Purchasing Clerk', 'rate' => 1500],

	        ['name' => 'Nico', 'email' => 'visionintl123+ahead2@gmail.com', 'role' => 'dept_head', 'dept' => 'Accounting/Procurement', 'pos' => 'Procurement Head', 'rate' => 1500],
 	        ['name' => 'Nico', 'email' => 'akosinicolas1+as2@gmail.com', 'role' => 'accounting_employee', 'dept' => 'Accounting/Procurement', 'pos' => 'Purchasing Clerk', 'rate' => 1500],

	        ['name' => 'Justine', 'email' => 'visionintl123+ahead3@gmail.com', 'role' => 'dept_head', 'dept' => 'Accounting/Procurement', 'pos' => 'Procurement Head', 'rate' => 1500],
	        ['name' => 'Nico', 'email' => 'jdlarkin20+as3@gmail.com', 'role' => 'accounting_employee', 'dept' => 'Accounting/Procurement', 'pos' => 'Purchasing Clerk', 'rate' => 1500],

        ];

        foreach ($users as $u) {
            $user = User::create([
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'],
                'department' => $u['dept'],
                'password' => Hash::make('password123'),
                'status' => 'Active',
            ]);

            $tableName = $this->getTableName($u['dept']);

            if ($tableName) {
                DB::table($tableName)->insert([
                    'user_id' => $user->id,
                    'position' => $u['pos'],
                    'rate_per_day' => $u['rate'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function getTableName($dept)
    {
        return match ($dept) {
            'Engineering'            => 'engineering_dept_table',
            'Sales'                  => 'sales_dept_table',
            'Management'             => 'management_dept_table',
            'Logistics'              => 'logistics_dept_table',
            'IT'                     => 'it_dept_table',
            'Accounting/Procurement' => 'accounting_dept_table',
            default                  => null, 
        };
    }
}
