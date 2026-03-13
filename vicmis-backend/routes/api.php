<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController,
    EmployeeController,
    AttendanceController,
    HRDashboardController,
    EmployeeRequestController,
    EngineeringController,
    LeadController,
    InventoryController,
    MaterialRequestController,
    ProjectController,
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
    // --- EMPLOYEE DIRECTORY ---
    Route::apiResource('employees', EmployeeController::class)->except(['show']);


    // --- ENGINEERING & LEADS ---
    Route::get('/engineering/dashboard-stats', [EngineeringController::class, 'getStats']);

        // TRASH ROUTES (Must be placed before apiResource)
    Route::get('/leads/trash/all', [LeadController::class, 'trashed']);
    Route::put('/leads/{id}/restore', [LeadController::class, 'restore']);
    Route::delete('/leads/{id}/force', [LeadController::class, 'forceDelete']);
    
    Route::apiResource('leads', LeadController::class);
    Route::patch('/leads/{id}/status', [LeadController::class, 'update']);

    // --- INVENTORY MANAGEMENT ---
    Route::prefix('inventory')->group(function () {
        Route::get('/alerts', [InventoryController::class, 'getLowStockAlerts']);
        Route::post('/stock-in', [InventoryController::class, 'stockIn']);
        Route::post('/stock-out', [InventoryController::class, 'stockOut']);
        Route::get('/shipments', [InventoryController::class, 'getShipmentHistory']);
        Route::get('/logistics', [InventoryController::class, 'getLogisticsHistory']);
        Route::patch('/shipments/{id}/receive', [InventoryController::class, 'markAsReceived']);
        Route::patch('/logistics/{id}/delivered', [InventoryController::class, 'markAsDelivered']);
        Route::get('/construction', [InventoryController::class, 'getConstruction']);
        Route::get('/office', [InventoryController::class, 'getOffice']);
        Route::get('/incoming', [InventoryController::class, 'getIncoming']);
        Route::get('/delivery', [InventoryController::class, 'getDelivery']);
        Route::get('/requests', [InventoryController::class, 'getRequests']);
        Route::get('/pending', [InventoryController::class, 'getPendingActions']);
        Route::post('/approve/{type}/{id}', [InventoryController::class, 'approveAction']);
        Route::post('/reject/{type}/{id}', [InventoryController::class, 'rejectAction']);
        Route::delete('/{type}/{id}', [InventoryController::class, 'destroy']);
    });

    Route::get('/fetch-image', [App\Http\Controllers\ProjectController::class, 'fetchImage']);
});
