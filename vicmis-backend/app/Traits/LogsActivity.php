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

        $moduleName = class_basename($model);
        
        // ---------------------------------------------------------
        // Custom formatting based on the module
        // ---------------------------------------------------------
        if ($moduleName === 'Lead') {
            
            $projectName = $model->project_name ?? "Lead ID: {$model->id}";
            $clientName  = $model->client_name ? " (Client: {$model->client_name})" : '';
            $itemName    = $projectName . $clientName;
            
        } elseif ($moduleName === 'Project') {
            
            // NEW: Exact same logic, but for Projects!
            // (Checks 'name' or 'project_name', and grabs the client)
            $projectName = $model->project_name ?? $model->name ?? "Project ID: {$model->id}";
            $clientName  = $model->client_name ? " (Client: {$model->client_name})" : '';
            $itemName    = $projectName . $clientName;
            
        } else {
            // Default fallback for everything else
            $itemName = $model->customer_name 
                     ?? $model->client_name 
                     ?? $model->company_name 
                     ?? $model->name
                     ?? $model->project_name 
                     ?? $model->product_code 
                     ?? $model->shipment_number 
                     ?? "ID: {$model->id}";
        }

        // Save to database
        ActivityLog::create([
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'module'      => $moduleName,
            'description' => "{$action} {$moduleName}: {$itemName}"
        ]);
    }
}