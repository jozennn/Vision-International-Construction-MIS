<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController,
    EmployeeController,
    EngineeringController,
    LeadController,
    MaterialRequestController,
    ProjectController,
    WarehouseInventoryController,
    IncomingShipmentController,
    LogisticsController,
    AdminUserController,
    DatabaseBackupController, 
    ReorderRequestController,   
};

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/login',      [AuthController::class, 'login']);
    Route::post('/verify-2fa', [AuthController::class, 'verify2FA']);
    // Public — called when session is dead but refresh_token cookie exists.
    // Must be outside auth:sanctum otherwise it 401s before it can restore the session.
    Route::post('/refresh',    [AuthController::class, 'refresh']);
});

/*
|--------------------------------------------------------------------------
| Protected Routes (Sanctum + Rate Limited)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api-reads'])->group(function () {

    // --- USER & AUTH ---
    Route::get('/user', function (Request $request) {
    $user = $request->user();
    $dept = strtolower($user->department ?? '');

        if (in_array($user->role, ['super_admin', 'admin', 'manager'])) {
            $permissions = ['Dashboard', 'Project', 'Documents', 'Inventory', 'Accounting', 'Setting', 'Human Resource', 'Customer'];
        } else {
            $permissions = match(true) {
                $dept === 'engineering'                                                  => ['Dashboard', 'Project', 'Documents', 'Inventory', 'Setting'],
                $dept === 'hr'                                                           => ['Dashboard', 'Human Resource', 'Documents', 'Setting'],
                $dept === 'sales'                                                        => ['Dashboard', 'Customer', 'Project', 'Documents', 'Inventory'],
                in_array($dept, ['inventory', 'logistics'])                              => ['Dashboard', 'Inventory', 'Project', 'Documents', 'Setting'],
                str_contains($dept, 'accounting') || str_contains($dept, 'procurement') => ['Dashboard', 'Documents', 'Setting', 'Accounting'],
                default                                                                  => ['Dashboard'],
            };
        }

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'department'  => $user->department,
            'permissions' => $permissions,
        ];
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- NOTIFICATIONS ---
    Route::get('/notifications',             [ProjectController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read',  [ProjectController::class, 'markNotificationRead']);

    // --- PROJECTS (read) ---
    Route::get('/projects',      [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);

    // Site Inspection (read)
    Route::get('/projects/{id}/site-inspection', [ProjectController::class, 'getSiteInspection']);

    // Mobilization (read)
    Route::get('/projects/{id}/mobilization', [ProjectController::class, 'getMobilization']);

    // Command Center (read)
    Route::get('/projects/{id}/daily-logs',  [ProjectController::class, 'getDailyLogs']);
    Route::get('/projects/{id}/issues',      [ProjectController::class, 'getIssues']);

    // Material Requests (read)
    Route::get('/projects/{id}/material-requests', [MaterialRequestController::class, 'getProjectRequests']);
    Route::get('/material-requests/pending',        [MaterialRequestController::class, 'getPending']);

    // Image proxy
    Route::get('/fetch-image', [ProjectController::class, 'fetchImage']);

    // --- SALES DASHBOARD (read) ---
    Route::get('/sales/dashboard-stats', [ProjectController::class, 'getSalesStats']);
    Route::get('/sales/leads/recent',    [ProjectController::class, 'getRecentLeads']);

    // --- ENGINEERING DASHBOARD (read) ---
    Route::prefix('engineering')->group(function () {
        Route::get('/dashboard-stats', [EngineeringController::class, 'getDashboardStats']);
        Route::get('/engineers',       [EngineeringController::class, 'getEngineers']);
    });

    // --- LEADS (read) ---
    Route::get('/leads',           [LeadController::class, 'index']);
    Route::get('/leads/trashed',   [LeadController::class, 'trashed']);  // ← move UP before {id}
    Route::get('/leads/trash/all', [LeadController::class, 'trashed']);  // ← move UP before {id}
    Route::get('/leads/{id}',      [LeadController::class, 'show']);

    // --- INVENTORY (read) ---
    Route::prefix('inventory')->group(function () {
        Route::get('/alerts',            [WarehouseInventoryController::class, 'getAlerts']);
        Route::get('/shipments/meta',    [IncomingShipmentController::class, 'meta']);
        Route::get('/shipments/reports', [IncomingShipmentController::class, 'getReports']);
        Route::get('/shipments',         [IncomingShipmentController::class, 'getShipments']);
        Route::get('/logistics/meta',    [LogisticsController::class, 'meta']);
        Route::get('/logistics',         [LogisticsController::class, 'index']);
    });

    // --- WAREHOUSE INVENTORY (read) ---
    Route::prefix('warehouse-inventory')->group(function () {
        Route::get('/meta', [WarehouseInventoryController::class, 'meta']);
        Route::get('/',     [WarehouseInventoryController::class, 'index']);
        Route::get('/{id}', [WarehouseInventoryController::class, 'show']);
    });

    // --- ADMIN (read) ---
    Route::middleware('can:admin-action')->group(function () {
        Route::get('/admin/users',           [AdminUserController::class, 'index']);
        Route::get('/admin/system-logs',     [AdminUserController::class, 'getSystemLogs']);
        Route::get('/admin/activities',      [AdminUserController::class, 'getActivities']);
        Route::get('/admin/dashboard-stats', [AdminUserController::class, 'getDashboardStats']);
    });
});

/*
|--------------------------------------------------------------------------
| Protected Mutating Routes (Sanctum + Write Rate Limit + Origin Check)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api-writes'])->group(function () {

    // --- PROJECTS (write) ---
    Route::post('/projects', [ProjectController::class, 'store']);

    Route::patch('/projects/{id}/status', [ProjectController::class, 'updateStatus']);
    Route::post('/projects/{id}/status',  [ProjectController::class, 'updateStatus']);

    // BOQ
    Route::post('/projects/{id}/submit-plan',   [ProjectController::class, 'submitPlanData']);
    Route::post('/projects/{id}/submit-actual', [ProjectController::class, 'submitActualData']);
    Route::middleware('can:manager-action')->group(function () {
        Route::post('/projects/{id}/approve-boq', [ProjectController::class, 'approveBOQ']);
    });

    // Site Inspection
    Route::post('/projects/{id}/site-inspection', [ProjectController::class, 'submitSiteInspection']);

    // Mobilization
    Route::post('/projects/{id}/mobilization/contract', [ProjectController::class, 'saveMobilizationContract']);
    Route::post('/projects/{id}/mobilization/deploy',   [ProjectController::class, 'saveMobilizationDeploy']);

    // Tracking
    Route::patch('/projects/{id}/tracking/materials', [ProjectController::class, 'saveTrackingMaterials']);
    Route::patch('/projects/{id}/tracking/timeline',  [ProjectController::class, 'saveTrackingTimeline']);
    Route::patch('/projects/{id}/tracking',           [ProjectController::class, 'saveTrackingLegacy']);

    // Command Center (write)
    Route::post('/projects/{id}/daily-logs', [ProjectController::class, 'storeDailyLog']);
    Route::post('/projects/{id}/issues',     [ProjectController::class, 'storeIssue']);
    Route::patch('/projects/{id}/qa-checks', [ProjectController::class, 'saveQaChecks']);

    // Material Requests (write)
    Route::post('/projects/{id}/material-requests', [MaterialRequestController::class, 'store']);
    Route::patch('/material-requests/{id}',         [MaterialRequestController::class, 'updateStatus']);

    // --- ENGINEERING (write) ---
    Route::prefix('engineering')->middleware('can:engineering-action')->group(function () {
        Route::post('/assign-task',  [EngineeringController::class, 'assignTask']);
        Route::post('/pick-project', [EngineeringController::class, 'pickProject']);
    });

    // --- LEADS (write) ---
    Route::post('/leads',              [LeadController::class, 'store']);
    Route::put('/leads/{id}',          [LeadController::class, 'update']);
    Route::patch('/leads/{id}/status', [LeadController::class, 'update']);
    Route::delete('/leads/{id}',       [LeadController::class, 'destroy']);
    Route::put('/leads/{id}/restore',  [LeadController::class, 'restore']);
    Route::delete('/leads/{id}/force', [LeadController::class, 'forceDelete']);


    // --- EMPLOYEES (write) ---
    Route::middleware('can:manager-action')->group(function () {
        Route::apiResource('employees', EmployeeController::class)->except(['show']);
    });

    // --- INVENTORY (write) ---
    Route::prefix('inventory')->group(function () {
        Route::post('/shipments/report',                [IncomingShipmentController::class, 'storeReport']);
        Route::post('/shipments',                       [IncomingShipmentController::class, 'storeShipment']);
        Route::put('/shipments/{id}',                   [IncomingShipmentController::class, 'updateShipment']);
        Route::post('/shipments/{id}/add-to-inventory', [IncomingShipmentController::class, 'addToInventory']);
        Route::patch('/shipments/{id}/receive',         [IncomingShipmentController::class, 'markAsReceived']);

        Route::post('/logistics',                 [LogisticsController::class, 'store']);
        Route::patch('/logistics/{id}/delivered', [LogisticsController::class, 'markDelivered']);
        Route::delete('/logistics/{id}',          [LogisticsController::class, 'destroy']);

        Route::get('/reorder-requests',               [ReorderRequestController::class, 'index']);
        Route::post('/reorder-requests',              [ReorderRequestController::class, 'store']);
        Route::patch('/reorder-requests/{id}/status', [ReorderRequestController::class, 'updateStatus']);
    });

    // --- WAREHOUSE INVENTORY (write) ---
    Route::prefix('warehouse-inventory')->group(function () {
        Route::post('/',       [WarehouseInventoryController::class, 'store']);
        Route::put('/{id}',    [WarehouseInventoryController::class, 'update']);
        Route::delete('/{id}', [WarehouseInventoryController::class, 'destroy']);
    });

    // --- ADMIN (write — admin only) ---
    Route::middleware('can:admin-action')->group(function () {
        Route::post('/admin/users',        [AdminUserController::class, 'store']);
        Route::put('/admin/users/{id}',    [AdminUserController::class, 'update']);
        Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);

        Route::prefix('admin/database')->group(function () {
            Route::get('/backups',               [DatabaseBackupController::class, 'index']);
            Route::post('/backup',               [DatabaseBackupController::class, 'backup']);
            Route::post('/export',               [DatabaseBackupController::class, 'export']);
            Route::get('/backups/{id}/download', [DatabaseBackupController::class, 'download']);
            Route::delete('/backups/{id}',       [DatabaseBackupController::class, 'destroy']);
            Route::post('/import',               [DatabaseBackupController::class, 'import']);
            Route::get('/schedules',             [DatabaseBackupController::class, 'listSchedules']);
            Route::post('/schedules',            [DatabaseBackupController::class, 'storeSchedule']);
            Route::patch('/schedules/{id}',      [DatabaseBackupController::class, 'updateSchedule']);
            Route::delete('/schedules/{id}',     [DatabaseBackupController::class, 'destroySchedule']);
        });
    });
});