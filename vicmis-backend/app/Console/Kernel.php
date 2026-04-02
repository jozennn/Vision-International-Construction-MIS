<?php

namespace App\Console;

use App\Http\Controllers\DatabaseBackupController;
use App\Models\BackupSchedule;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * Each BackupSchedule record in the database is dynamically registered
     * here. Laravel's scheduler runs via a single crontab entry:
     *
     *   * * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
     *
     * The scheduler evaluates which jobs to run on each minute tick.
     */
    protected function schedule(Schedule $schedule): void
    {
        // ── Dynamically register all enabled backup schedules from DB ─────
        try {
            $schedules = BackupSchedule::where('enabled', true)->get();

            foreach ($schedules as $backupSchedule) {
                $cron = $backupSchedule->cron;

                $schedule->call(function () use ($backupSchedule) {
                    DatabaseBackupController::runScheduledBackup($backupSchedule);
                })
                ->cron($cron)
                ->name("backup:scheduled:{$backupSchedule->id}")
                ->withoutOverlapping()
                ->description("Scheduled backup: {$backupSchedule->name}");
            }
        } catch (\Exception $e) {
            // Silently fail during early boot (e.g., migrations not run yet)
            \Log::warning('ScheduleKernel: Could not load backup schedules — ' . $e->getMessage());
        }

        // ── Built-in: Prune old temporary import files (daily) ───────────
        $schedule->call(function () {
            $tempDir = storage_path('app/temp-imports');
            if (\Illuminate\Support\Facades\File::isDirectory($tempDir)) {
                foreach (\Illuminate\Support\Facades\File::files($tempDir) as $file) {
                    if (now()->diffInHours(\Carbon\Carbon::createFromTimestamp($file->getMTime())) > 24) {
                        \Illuminate\Support\Facades\File::delete($file);
                    }
                }
            }
        })
        ->daily()
        ->name('cleanup:temp-imports')
        ->description('Remove old temporary import files');

        // ── Built-in: Prune activity logs older than 90 days (weekly) ────
        $schedule->call(function () {
            \App\Models\ActivityLog::where('created_at', '<', now()->subDays(90))->delete();
        })
        ->weekly()
        ->name('cleanup:activity-logs')
        ->description('Prune activity logs older than 90 days');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');
        require base_path('routes/console.php');
    }
}
