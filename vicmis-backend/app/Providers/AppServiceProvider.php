<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // --- RATE LIMITERS ---
        RateLimiter::for('api-writes', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('api-reads', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // --- GATES ---

        // Only super_admin or admin can perform destructive/admin actions
        Gate::define('admin-action', function (User $user): bool {
            return in_array($user->role, ['super_admin', 'admin']);
        });

        // Managers and above can approve BOQ, update project status, etc.
        Gate::define('manager-action', function (User $user): bool {
            return in_array($user->role, ['super_admin', 'admin', 'manager']);
        });

        // Engineering department or above
        Gate::define('engineering-action', function (User $user): bool {
            return in_array($user->role, ['super_admin', 'admin', 'manager'])
                || strtolower($user->department ?? '') === 'engineering';
        });

        // Inventory / logistics department or above
        Gate::define('inventory-action', function (User $user): bool {
            return in_array($user->role, ['super_admin', 'admin', 'manager'])
                || in_array(strtolower($user->department ?? ''), ['inventory', 'logistics']);
        });
    }
}