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
};

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-2fa', [AuthController::class, 'verify2FA']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

  // --- USER & AUTH ---
    Route::get('/user', fn(Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- NOTIFICATION ---
    Route::get('/notifications', [ProjectController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read', [ProjectController::class, 'markNotificationRead']);

    // --- PROJECTS & WORKFLOW ---
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{id}/tasks', [ProjectController::class, 'updateTasks']);
    Route::patch('/projects/{id}/assign-engineer', [ProjectController::class, 'startEngineering']);

    // 🚨 Status Updates (PATCH for text/status, POST for file uploads via FormData)
    Route::patch('/projects/{id}/status', [ProjectController::class, 'updateStatus']);
    Route::post('/projects/{id}/status', [ProjectController::class, 'updateStatus']); // Catches FormData file uploads

    // Phase 1 BOQ Steps
    Route::post('/projects/{id}/submit-plan', [ProjectController::class, 'submitPlanData']);
    Route::post('/projects/{id}/submit-actual', [ProjectController::class, 'submitActualData']);
    Route::post('/projects/{id}/approve-boq', [ProjectController::class, 'approveBOQ']);

    // 🚨 MEGASUITE COMMAND CENTER LOGIC 🚨
    Route::post('/projects/{id}/daily-logs', [ProjectController::class, 'storeDailyLog']);
    Route::get('/projects/{id}/daily-logs', [ProjectController::class, 'getDailyLogs']);
    
    Route::get('/projects/{id}/issues', [ProjectController::class, 'getIssues']);
    Route::post('/projects/{id}/issues', [ProjectController::class, 'storeIssue']);
    
    // Fixed: Changed to PATCH to match the React frontend (saveTrackingData function)
    Route::patch('/projects/{id}/tracking', [ProjectController::class, 'saveTracking']); 

    // Material Requests (Project side)
    Route::get('/projects/{id}/material-requests', [MaterialRequestController::class, 'getProjectRequests']);
    Route::post('/projects/{id}/material-requests', [MaterialRequestController::class, 'store']);

    // --- SALES DASHBOARD ---
    Route::get('/sales/dashboard-stats', [ProjectController::class, 'getSalesStats']);
    Route::get('/sales/leads/recent', [ProjectController::class, 'getRecentLeads']);

    // --- LOGISTICS & INVENTORY (Material Requests Tab) ---
    Route::get('/material-requests/pending', [MaterialRequestController::class, 'getPending']);
    Route::patch('/material-requests/{id}', [MaterialRequestController::class, 'updateStatus']);

    // --- EMPLOYEE DIRECTORY ---
    Route::apiResource('employees', EmployeeController::class)->except(['show']);

    // --- ENGINEERING DASHBOARD 🚨 (Missing Routes Added Here) ---
    Route::prefix('engineering')->group(function () {
        Route::get('/dashboard-stats', [EngineeringController::class, 'getDashboardStats']);
        Route::post('/assign-task', [EngineeringController::class, 'assignTask']); // Added!
        Route::post('/pick-project', [EngineeringController::class, 'pickProject']); // Added!
    });
    Route::apiResource('leads', LeadController::class);
    Route::patch('/leads/{id}/status', [LeadController::class, 'update']);

    // --- INVENTORY MANAGEMENT ---
     Route::prefix('inventory')->group(function () {

        // ── Your existing routes (keep all of these) ──
        Route::get('/alerts',    [InventoryController::class, 'getLowStockAlerts']);
        Route::post('/stock-in', [InventoryController::class, 'stockIn']);
        Route::post('/stock-out', [InventoryController::class, 'stockOut']);
        Route::get('/logistics/meta',              [LogisticsController::class, 'meta']);
        Route::get('/logistics',                   [LogisticsController::class, 'index']);
        Route::post('/logistics',                  [LogisticsController::class, 'store']);
        Route::patch('/logistics/{id}/delivered',  [LogisticsController::class, 'markDelivered']);
        Route::delete('/logistics/{id}',           [LogisticsController::class, 'destroy']);
        Route::patch('/shipments/{id}/receive', [InventoryController::class, 'markAsReceived']);
        Route::get('/construction', [InventoryController::class, 'getConstruction']);
        Route::get('/office',       [InventoryController::class, 'getOffice']);
        Route::get('/incoming',     [InventoryController::class, 'getIncoming']);
        Route::get('/delivery',     [InventoryController::class, 'getDelivery']);
        Route::get('/requests',     [InventoryController::class, 'getRequests']);
        Route::get('/pending',      [InventoryController::class, 'getPendingActions']);
        Route::post('/approve/{type}/{id}', [InventoryController::class, 'approveAction']);
        Route::post('/reject/{type}/{id}',  [InventoryController::class, 'rejectAction']);
        Route::delete('/{type}/{id}',       [InventoryController::class, 'destroy']);

        // ── Shipment routes — ORDER MATTERS: specific paths before {id} wildcard ──
        Route::get('/shipments/meta',     [IncomingShipmentController::class, 'meta']);
        Route::get('/shipments',          [IncomingShipmentController::class, 'getShipments']);
        Route::post('/shipments',         [IncomingShipmentController::class, 'storeShipment']);

        // ── NEW: Add to inventory ──────────────────────────────────────────────────
        Route::post('/shipments/{id}/add-to-inventory', [IncomingShipmentController::class, 'addToInventory']);

        // ── NEW: Report / Return ──────────────────────────────────────────────────
        Route::get('/shipments/reports',   [IncomingShipmentController::class, 'getReports']);
        Route::post('/shipments/report',   [IncomingShipmentController::class, 'storeReport']);

        // ── Existing update route ─────────────────────────────────────────────────
        Route::put('/shipments/{id}',     [IncomingShipmentController::class, 'updateShipment']);
    });

    Route::prefix('warehouse-inventory')->group(function () {
        Route::get('/meta', [WarehouseInventoryController::class, 'meta']);
        Route::get('/', [WarehouseInventoryController::class, 'index']);
        Route::post('/', [WarehouseInventoryController::class, 'store']);
        Route::get('/{id}', [WarehouseInventoryController::class, 'show']);
        Route::put('/{id}', [WarehouseInventoryController::class, 'update']);
        Route::delete('/{id}', [WarehouseInventoryController::class, 'destroy']);
    });

    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);

    // System Error Logs Route
    Route::get('/admin/system-logs', [AdminUserController::class, 'getSystemLogs']);

    Route::get('/fetch-image', [App\Http\Controllers\ProjectController::class, 'fetchImage']);
});
