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

    // --- NOTIFICATIONS ---
    Route::get('/notifications', [ProjectController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read', [ProjectController::class, 'markNotificationRead']);

    // --- PROJECTS & WORKFLOW ---
    Route::get('/projects',      [ProjectController::class, 'index']);
    Route::post('/projects',     [ProjectController::class, 'store']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);

    // Status Updates
    Route::patch('/projects/{id}/status', [ProjectController::class, 'updateStatus']);
    Route::post('/projects/{id}/status',  [ProjectController::class, 'updateStatus']);

    // BOQ
    Route::post('/projects/{id}/submit-plan',   [ProjectController::class, 'submitPlanData']);
    Route::post('/projects/{id}/submit-actual', [ProjectController::class, 'submitActualData']);
    Route::post('/projects/{id}/approve-boq',   [ProjectController::class, 'approveBOQ']);

    // Site Inspection
    Route::post('/projects/{id}/site-inspection', [ProjectController::class, 'submitSiteInspection']);
    Route::get('/projects/{id}/site-inspection',  [ProjectController::class, 'getSiteInspection']);

    // Mobilization — all handled by ProjectController
    Route::get( '/projects/{id}/mobilization',          [ProjectController::class, 'getMobilization']);
    Route::post('/projects/{id}/mobilization/contract', [ProjectController::class, 'saveMobilizationContract']);
    Route::post('/projects/{id}/mobilization/deploy',   [ProjectController::class, 'saveMobilizationDeploy']);

    // Tracking
    Route::patch('/projects/{id}/tracking/materials', [ProjectController::class, 'saveTrackingMaterials']);
    Route::patch('/projects/{id}/tracking/timeline',  [ProjectController::class, 'saveTrackingTimeline']);
    Route::patch('/projects/{id}/tracking',           [ProjectController::class, 'saveTrackingLegacy']);

    // Command Center
    Route::post('/projects/{id}/daily-logs', [ProjectController::class, 'storeDailyLog']);
    Route::get('/projects/{id}/daily-logs',  [ProjectController::class, 'getDailyLogs']);
    Route::get('/projects/{id}/issues',      [ProjectController::class, 'getIssues']);
    Route::post('/projects/{id}/issues',     [ProjectController::class, 'storeIssue']);

    Route::patch('/projects/{id}/qa-checks', [ProjectController::class, 'saveQaChecks']);

    // Material Requests
    Route::get('/projects/{id}/material-requests',  [MaterialRequestController::class, 'getProjectRequests']);
    Route::post('/projects/{id}/material-requests', [MaterialRequestController::class, 'store']);

    Route::get('/fetch-image', [ProjectController::class, 'fetchImage']);

    // --- SALES DASHBOARD ---
    Route::get('/sales/dashboard-stats', [ProjectController::class, 'getSalesStats']);
    Route::get('/sales/leads/recent',    [ProjectController::class, 'getRecentLeads']);

    // --- ENGINEERING DASHBOARD ---
    Route::prefix('engineering')->group(function () {
        Route::get('/dashboard-stats', [EngineeringController::class, 'getDashboardStats']);
        Route::post('/assign-task',    [EngineeringController::class, 'assignTask']);
        Route::post('/pick-project',   [EngineeringController::class, 'pickProject']);
        Route::get('/engineers', [EngineeringController::class, 'getEngineers']);
    });

    // --- LEADS ---
    Route::apiResource('leads', LeadController::class);
    Route::patch('/leads/{id}/status', [LeadController::class, 'update']);

    // --- EMPLOYEES ---
    Route::apiResource('employees', EmployeeController::class)->except(['show']);

    // --- LOGISTICS & MATERIAL REQUESTS ---
    Route::get('/material-requests/pending', [MaterialRequestController::class, 'getPending']);
    Route::patch('/material-requests/{id}',  [MaterialRequestController::class, 'updateStatus']);

    // --- INVENTORY ---
    Route::prefix('inventory')->group(function () {
        Route::get('/shipments/meta',    [IncomingShipmentController::class, 'meta']);
        Route::get('/shipments/reports', [IncomingShipmentController::class, 'getReports']);
        Route::post('/shipments/report', [IncomingShipmentController::class, 'storeReport']);
        Route::get('/shipments',         [IncomingShipmentController::class, 'getShipments']);
        Route::post('/shipments',        [IncomingShipmentController::class, 'storeShipment']);
        Route::put('/shipments/{id}',    [IncomingShipmentController::class, 'updateShipment']);
        Route::post('/shipments/{id}/add-to-inventory', [IncomingShipmentController::class, 'addToInventory']);
        Route::patch('/shipments/{id}/receive',         [IncomingShipmentController::class, 'markAsReceived']);

        Route::get('/logistics/meta',             [LogisticsController::class, 'meta']);
        Route::get('/logistics',                  [LogisticsController::class, 'index']);
        Route::post('/logistics',                 [LogisticsController::class, 'store']);
        Route::patch('/logistics/{id}/delivered', [LogisticsController::class, 'markDelivered']);
        Route::delete('/logistics/{id}',          [LogisticsController::class, 'destroy']);
    });

    // --- WAREHOUSE INVENTORY ---
    Route::prefix('warehouse-inventory')->group(function () {
        Route::get('/meta', [WarehouseInventoryController::class, 'meta']);
        Route::get('/',     [WarehouseInventoryController::class, 'index']);
        Route::post('/',    [WarehouseInventoryController::class, 'store']);
        Route::get('/{id}', [WarehouseInventoryController::class, 'show']);
        Route::put('/{id}', [WarehouseInventoryController::class, 'update']);
        Route::delete('/{id}', [WarehouseInventoryController::class, 'destroy']);
    });

    // --- ADMIN ---
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);

    // System Error Logs Route
    Route::get('/admin/system-logs', [AdminUserController::class, 'getSystemLogs']);

    Route::get('/admin/activities', [AdminUserController::class, 'getActivities']);// get activity logs
    Route::get('/admin/dashboard-stats', [AdminUserController::class, 'getDashboardStats']); //super admin dashboard
});