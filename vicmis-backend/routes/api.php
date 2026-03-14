<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController,
    EmployeeController,
    EngineeringController,
    LeadController,
    InventoryController,
    MaterialRequestController,
    ProjectController,
    WarehouseInventoryController,
    IncomingShipmentController,
    LogisticsController,
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

    //NOTIFICATION
    Route::get('/notifications', [App\Http\Controllers\ProjectController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read', [App\Http\Controllers\ProjectController::class, 'markNotificationRead']);

    // --- PROJECTS & WORKFLOW ---
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::patch('/projects/{id}/tasks', [ProjectController::class, 'updateTasks']);
    Route::patch('/projects/{id}/assign-engineer', [ProjectController::class, 'startEngineering']);

    // The Super-Updater (Handles images & text statuses)
    Route::patch('/projects/{id}/status', [ProjectController::class, 'updateStatus']);

    // Phase 1 BOQ Steps
    Route::post('/projects/{id}/submit-plan', [ProjectController::class, 'submitPlanData']);
    Route::post('/projects/{id}/submit-actual', [ProjectController::class, 'submitActualData']);
    Route::post('/projects/{id}/approve-boq', [ProjectController::class, 'approveBOQ']);

    // --- SALES DASHBOARD ---
    Route::get('/sales/dashboard-stats', [ProjectController::class, 'getSalesStats']);
    Route::get('/sales/leads/recent', [ProjectController::class, 'getRecentLeads']);
    // For the Project.jsx modal (Engineering)
    Route::post('/projects/{id}/material-requests', [MaterialRequestController::class, 'store']);

    // For the MaterialRequest.jsx tab (Logistics/Inventory)
    Route::get('/material-requests/pending', [MaterialRequestController::class, 'getPending']);
    Route::patch('/material-requests/{id}', [MaterialRequestController::class, 'updateStatus']);
    Route::post('/projects/{id}/material-requests', [App\Http\Controllers\MaterialRequestController::class, 'store']);
    Route::get('/projects/{id}/material-requests', [App\Http\Controllers\MaterialRequestController::class, 'getProjectRequests']);

    Route::post('/projects/{id}/daily-logs', [App\Http\Controllers\ProjectController::class, 'storeDailyLog']);
    Route::get('/projects/{id}/daily-logs', [App\Http\Controllers\ProjectController::class, 'getDailyLogs']);

    Route::get('/projects/{id}/issues', [App\Http\Controllers\ProjectController::class, 'getIssues']);
    Route::post('/projects/{id}/issues', [App\Http\Controllers\ProjectController::class, 'storeIssue']);
    Route::post('/projects/{id}/tracking', [App\Http\Controllers\ProjectController::class, 'saveTracking']);
    Route::get('/projects/{project}', [App\Http\Controllers\ProjectController::class, 'show']);
    // --- EMPLOYEE DIRECTORY ---
    Route::apiResource('employees', EmployeeController::class)->except(['show']);


    // --- ENGINEERING & LEADS ---
    Route::get('/engineering/dashboard-stats', [EngineeringController::class, 'getStats']);
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

    Route::get('/fetch-image', [App\Http\Controllers\ProjectController::class, 'fetchImage']);
});
