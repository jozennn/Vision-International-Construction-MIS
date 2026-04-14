<?php

namespace App\Http\Controllers;

use App\Models\DatabaseBackup;
use App\Models\BackupSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use Exception;

class DatabaseBackupController extends Controller
{
    // ──────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────

    private function isSuperAdmin(Request $request): bool
    {
        return $request->user()->role === 'super_admin';
    }

    private function backupDir(): string
    {
        $dir = storage_path('app/database-backups');
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }
        return $dir;
    }

    private function buildDumpCommand(string $outputPath): array
    {
        // Add support for custom dump paths in your .env file
        $dumpPath = env('DB_DUMP_PATH', 'mysqldump');

        return [
            $dumpPath,
            '--host='      . config('database.connections.mysql.host'),
            '--port='      . config('database.connections.mysql.port'),
            '--user='      . config('database.connections.mysql.username'),
            '--password='  . config('database.connections.mysql.password'),
            '--single-transaction',
            '--routines',
            '--triggers',
            '--add-drop-table',
            config('database.connections.mysql.database'),
            '--result-file=' . $outputPath,
        ];
    }

    private function logActivity(Request $request, string $description): void
    {
        \App\Models\ActivityLog::create([
            'user_id'     => $request->user()->id,
            'user_name'   => $request->user()->name,
            'module'      => 'Database',
            'description' => $description,
        ]);
    }

    // ──────────────────────────────────────────────
    // LIST BACKUPS
    // ──────────────────────────────────────────────

    public function index(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $backups = DatabaseBackup::orderBy('created_at', 'desc')->get()->map(function ($b) {
            $path    = $this->backupDir() . '/' . $b->filename;
            $b->size = File::exists($path) ? File::size($path) : null;
            return $b;
        });

        return response()->json(['backups' => $backups]);
    }

    // ──────────────────────────────────────────────
    // MANUAL BACKUP
    // ──────────────────────────────────────────────

    public function backup(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filename   = 'vision_backup_' . now()->format('Y-m-d_His') . '.sql';
        $outputPath = $this->backupDir() . '/' . $filename;

        try {
            $process = new Process($this->buildDumpCommand($outputPath));
            $process->setTimeout(300);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::error('mysqldump failed: ' . $process->getErrorOutput());
                return response()->json(['message' => 'Backup failed: ' . $process->getErrorOutput()], 500);
            }

            $record = DatabaseBackup::create([
                'filename'   => $filename,
                'type'       => 'manual',
                'status'     => 'success',
                'size'       => File::exists($outputPath) ? File::size($outputPath) : 0,
                'created_by' => $request->user()->id,
            ]);

            $this->logActivity($request, "Manual database backup created: {$filename}");

            return response()->json(['message' => 'Backup created successfully.', 'backup' => $record]);

        } catch (Exception $e) {
            Log::error('Database Backup Exception: ' . $e->getMessage());
            return response()->json(['message' => 'Server configuration error: ' . $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────
    // EXPORT
    // ──────────────────────────────────────────────

    public function export(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filename   = 'vision_export_' . now()->format('Y-m-d_His') . '.sql';
        $outputPath = $this->backupDir() . '/' . $filename;

        try {
            $process = new Process($this->buildDumpCommand($outputPath));
            $process->setTimeout(300);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::error('mysqldump export failed: ' . $process->getErrorOutput());
                return response()->json(['message' => 'Export failed: ' . $process->getErrorOutput()], 500);
            }

            DatabaseBackup::create([
                'filename'   => $filename,
                'type'       => 'manual',
                'status'     => 'success',
                'size'       => File::exists($outputPath) ? File::size($outputPath) : 0,
                'created_by' => $request->user()->id,
            ]);

            $this->logActivity($request, "Database exported by {$request->user()->name}: {$filename}");

            return response()->download($outputPath, $filename, [
                'Content-Type'        => 'application/octet-stream',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ])->deleteFileAfterSend(false);

        } catch (Exception $e) {
            Log::error('Database Export Exception: ' . $e->getMessage());
            // Using a JSON response here even for download route so your React app catches the exact error
            return response()->json(['message' => 'Server configuration error: ' . $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────
    // DOWNLOAD SAVED BACKUP
    // ──────────────────────────────────────────────

    public function download(Request $request, $id)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $backup = DatabaseBackup::findOrFail($id);
        $path   = $this->backupDir() . '/' . $backup->filename;

        if (!File::exists($path)) {
            return response()->json(['message' => 'Backup file not found on disk.'], 404);
        }

        return response()->download($path, $backup->filename);
    }

    // ──────────────────────────────────────────────
    // DELETE SAVED BACKUP
    // ──────────────────────────────────────────────

    public function destroy(Request $request, $id)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $backup = DatabaseBackup::findOrFail($id);
        $path   = $this->backupDir() . '/' . $backup->filename;

        if (File::exists($path)) {
            File::delete($path);
        }

        $backup->delete();
        $this->logActivity($request, "Deleted backup file: {$backup->filename}");

        return response()->json(['message' => 'Backup deleted successfully.']);
    }

    // ──────────────────────────────────────────────
    // IMPORT
    // ──────────────────────────────────────────────

    public function import(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'sql_file' => 'required|file|mimes:sql,txt|max:524288',
        ]);

        $file     = $request->file('sql_file');
        $path     = $file->storeAs('temp-imports', $file->getClientOriginalName(), 'local');
        $fullPath = storage_path('app/' . $path);

        $db   = config('database.connections.mysql.database');
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');

        try {
            $mysqlPath = env('DB_MYSQL_PATH', 'mysql');
            $command = "{$mysqlPath} --host={$host} --port={$port} --user={$user} --password={$pass} {$db} < {$fullPath}";
            
            $process = Process::fromShellCommandline($command);
            $process->setTimeout(600);
            $process->run();

            File::delete($fullPath);

            if (!$process->isSuccessful()) {
                Log::error('MySQL import failed: ' . $process->getErrorOutput());
                return response()->json(['message' => 'Import failed: ' . $process->getErrorOutput()], 500);
            }

            $this->logActivity($request, "Database restored from import by {$request->user()->name}: {$file->getClientOriginalName()}");

            return response()->json(['message' => 'Database restored successfully.']);

        } catch (Exception $e) {
            if (File::exists($fullPath)) File::delete($fullPath);
            Log::error('Database Import Exception: ' . $e->getMessage());
            return response()->json(['message' => 'Server configuration error: ' . $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────
    // SCHEDULES (List, Store, Update, Destroy)
    // ──────────────────────────────────────────────
    public function listSchedules(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json(['schedules' => BackupSchedule::orderBy('created_at', 'desc')->get()]);
    }

    public function storeSchedule(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'cron'      => 'required|string',
            'retention' => 'required|integer|min:1|max:365',
            'enabled'   => 'boolean',
        ]);

        $schedule = BackupSchedule::create($validated);
        $this->logActivity($request, "Backup schedule created: {$schedule->name} ({$schedule->cron})");

        return response()->json(['schedule' => $schedule], 201);
    }

    public function updateSchedule(Request $request, $id)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $schedule = BackupSchedule::findOrFail($id);
        $schedule->update($request->only(['enabled', 'name', 'cron', 'retention']));
        return response()->json(['schedule' => $schedule]);
    }

    public function destroySchedule(Request $request, $id)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $schedule = BackupSchedule::findOrFail($id);
        $name     = $schedule->name;
        $schedule->delete();
        $this->logActivity($request, "Deleted backup schedule: {$name}");
        return response()->json(['message' => 'Schedule removed successfully.']);
    }

    // ──────────────────────────────────────────────
    // STATIC — Called by Kernel.php
    // ──────────────────────────────────────────────
    public static function runScheduledBackup(BackupSchedule $schedule): void
    {
        $dir      = storage_path('app/database-backups');
        $safeName = str_replace([' ', '/'], '-', $schedule->name);
        $filename = 'vision_scheduled_' . now()->format('Y-m-d_His') . '_' . $safeName . '.sql';
        $path     = $dir . '/' . $filename;

        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        $dumpPath = env('DB_DUMP_PATH', 'mysqldump');

        try {
            $process = new Process([
                $dumpPath,
                '--host='     . config('database.connections.mysql.host'),
                '--port='     . config('database.connections.mysql.port'),
                '--user='     . config('database.connections.mysql.username'),
                '--password=' . config('database.connections.mysql.password'),
                '--single-transaction', '--routines', '--triggers', '--add-drop-table',
                config('database.connections.mysql.database'),
                '--result-file=' . $path,
            ]);

            $process->setTimeout(300);
            $process->run();

            $status = $process->isSuccessful() ? 'success' : 'failed';

            DatabaseBackup::create([
                'filename'           => $filename,
                'type'               => 'scheduled',
                'status'             => $status,
                'size'               => ($status === 'success' && File::exists($path)) ? File::size($path) : null,
                'backup_schedule_id' => $schedule->id,
            ]);

            $schedule->update(['last_run' => now()]);

            if ($status === 'success' && $schedule->retention) {
                $cutoff = now()->subDays($schedule->retention);
                $old    = DatabaseBackup::where('type', 'scheduled')
                    ->where('backup_schedule_id', $schedule->id)
                    ->where('created_at', '<', $cutoff)
                    ->get();

                foreach ($old as $oldBackup) {
                    $oldPath = $dir . '/' . $oldBackup->filename;
                    if (File::exists($oldPath)) {
                        File::delete($oldPath);
                    }
                    $oldBackup->delete();
                }
            }

            if (!$process->isSuccessful()) {
                Log::error("[ScheduledBackup:{$schedule->name}] mysqldump failed: " . $process->getErrorOutput());
            }
        } catch (Exception $e) {
            Log::error("[ScheduledBackup:{$schedule->name}] Process Exception: " . $e->getMessage());
        }
    }
}