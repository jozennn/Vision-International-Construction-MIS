<?php

namespace App\Http\Controllers;

use App\Models\DatabaseBackup;
use App\Models\BackupSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

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
        return [
            'mysqldump',
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
    // MANUAL BACKUP — saves file on the server
    // ──────────────────────────────────────────────

    public function backup(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filename   = 'vision_backup_' . now()->format('Y-m-d_His') . '.sql';
        $outputPath = $this->backupDir() . '/' . $filename;

        $process = new Process($this->buildDumpCommand($outputPath));
        $process->setTimeout(300);
        $process->run();

        if (!$process->isSuccessful()) {
            Log::error('mysqldump failed: ' . $process->getErrorOutput());
            return response()->json(['message' => 'Backup failed. Check system logs.'], 500);
        }

        $record = DatabaseBackup::create([
            'filename'   => $filename,
            'type'       => 'manual',
            'status'     => 'success',
            'size'       => File::size($outputPath),
            'created_by' => $request->user()->id,
        ]);

        $this->logActivity($request, "Manual database backup created: {$filename}");

        return response()->json(['message' => 'Backup created successfully.', 'backup' => $record]);
    }

    // ──────────────────────────────────────────────
    // EXPORT — streams .sql directly to the browser
    // ──────────────────────────────────────────────

    public function export(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filename   = 'vision_export_' . now()->format('Y-m-d_His') . '.sql';
        $outputPath = $this->backupDir() . '/' . $filename;

        $process = new Process($this->buildDumpCommand($outputPath));
        $process->setTimeout(300);
        $process->run();

        if (!$process->isSuccessful()) {
            Log::error('mysqldump export failed: ' . $process->getErrorOutput());
            return response()->json(['message' => 'Export failed. Check system logs.'], 500);
        }

        // Also record it in the backups table
        DatabaseBackup::create([
            'filename'   => $filename,
            'type'       => 'manual',
            'status'     => 'success',
            'size'       => File::size($outputPath),
            'created_by' => $request->user()->id,
        ]);

        $this->logActivity($request, "Database exported by {$request->user()->name}: {$filename}");

        return response()->download($outputPath, $filename, [
            'Content-Type'        => 'application/octet-stream',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ])->deleteFileAfterSend(false);
    }

    // ──────────────────────────────────────────────
    // DOWNLOAD A SAVED BACKUP FILE
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
    // DELETE A SAVED BACKUP
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
    // IMPORT — restore from an uploaded .sql file
    // ──────────────────────────────────────────────

    public function import(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'sql_file' => 'required|file|mimes:sql,txt|max:524288', // max 512 MB
        ]);

        $file     = $request->file('sql_file');
        $path     = $file->storeAs('temp-imports', $file->getClientOriginalName(), 'local');
        $fullPath = storage_path('app/' . $path);

        $db   = config('database.connections.mysql.database');
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');

        // Use shell command to pipe the SQL file into mysql
        $command = "mysql --host={$host} --port={$port} --user={$user} --password={$pass} {$db} < {$fullPath}";
        $process = Process::fromShellCommandline($command);
        $process->setTimeout(600);
        $process->run();

        // Always clean up the temp file
        File::delete($fullPath);

        if (!$process->isSuccessful()) {
            Log::error('MySQL import failed: ' . $process->getErrorOutput());
            return response()->json(['message' => 'Import failed. Ensure the file is a valid SQL dump.'], 500);
        }

        $this->logActivity(
            $request,
            "Database restored from import by {$request->user()->name}: {$file->getClientOriginalName()}"
        );

        return response()->json(['message' => 'Database restored successfully.']);
    }

    // ──────────────────────────────────────────────
    // SCHEDULES — List
    // ──────────────────────────────────────────────

    public function listSchedules(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['schedules' => BackupSchedule::orderBy('created_at', 'desc')->get()]);
    }

    // ──────────────────────────────────────────────
    // SCHEDULES — Create
    // ──────────────────────────────────────────────

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

    // ──────────────────────────────────────────────
    // SCHEDULES — Toggle / Update
    // ──────────────────────────────────────────────

    public function updateSchedule(Request $request, $id)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = BackupSchedule::findOrFail($id);
        $schedule->update($request->only(['enabled', 'name', 'cron', 'retention']));

        return response()->json(['schedule' => $schedule]);
    }

    // ──────────────────────────────────────────────
    // SCHEDULES — Delete
    // ──────────────────────────────────────────────

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
    // STATIC — Called by Kernel.php for scheduled runs
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

        $process = new Process([
            'mysqldump',
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

        // Update last_run timestamp on the schedule
        $schedule->update(['last_run' => now()]);

        // Enforce retention — delete backups older than retention days for this schedule
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
    }
}