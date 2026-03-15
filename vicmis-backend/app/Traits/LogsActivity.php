<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    public static function bootLogsActivity()
    {
        // 1. Catches when something is Created
        static::created(function ($model) {
            static::recordActivity($model, 'Created new');
        });

        // 2. Catches when something is Updated (or Status changed)
        static::updated(function ($model) {
            if ($model->isDirty('status') || $model->isDirty('shipment_status')) {
                $newStatus = $model->status ?? $model->shipment_status;
                static::recordActivity($model, "Changed status to '{$newStatus}' for");
            } else {
                static::recordActivity($model, 'Updated details for');
            }
        });

        // 3. Catches Deletions (Handles both Soft Deletes and Permanent)
        static::deleted(function ($model) {
            if (method_exists($model, 'isForceDeleting') && $model->isForceDeleting()) {
                static::recordActivity($model, 'Permanently deleted');
            } else {
                static::recordActivity($model, 'Moved to trash (Soft Deleted)');
            }
        });

        // 4. Catches Restorations from the Trash
        if (method_exists(static::class, 'restored')) {
            static::restored(function ($model) {
                static::recordActivity($model, 'Restored from trash');
            });
        }
    }

    protected static function recordActivity($model, $action)
    {
        $user = Auth::user();
        if (!$user) return; 

        // Get the Model name (e.g., "Lead", "Project", "WarehouseInventory")
        $moduleName = class_basename($model);
        
        // Find the most logical name for the item being tracked
        $itemName = $model->project_name 
                 ?? $model->client_name 
                 ?? $model->product_code 
                 ?? $model->shipment_number 
                 ?? "ID: {$model->id}";

        ActivityLog::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'module' => $moduleName,
            'description' => "{$action} {$moduleName}: {$itemName}"
        ]);
    }
}