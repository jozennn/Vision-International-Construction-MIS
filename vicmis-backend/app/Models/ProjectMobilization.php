<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectMobilization extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'subcontractor_name',
        'subcontractor_agreement_document',
        'contract_uploaded_by',
        'contract_signed_at',
        'mobilization_photo',
        'deployment_notes',
        'deployed_by',
        'deployed_at',
        'installer_roster',   // JSON: [{ "name": "...", "position": "..." }, ...]
        'installer_count',
    ];

    protected $casts = [
        'contract_signed_at' => 'datetime',
        'deployed_at'        => 'datetime',
        'installer_roster'   => 'array',  // auto encode/decode JSON
    ];

    // ── Auto-sync installer_count whenever roster is set ─────────────
    public function setInstallerRosterAttribute(array|null $roster): void
    {
        $this->attributes['installer_roster'] = json_encode($roster ?? []);
        $this->attributes['installer_count']  = count(
            array_filter($roster ?? [], fn($i) => !empty($i['name']))
        );
    }

    // ── Relationships ─────────────────────────────────────────────────
    public function project(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function contractUploader(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'contract_uploaded_by');
    }

    public function deployer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'deployed_by');
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /** Returns only installers with a non-empty name. */
    public function getValidInstallersAttribute(): array
    {
        return array_values(
            array_filter($this->installer_roster ?? [], fn($i) => !empty($i['name']))
        );
    }

    /** Count by position, e.g. $mob->countByPosition('Lead Installer') */
    public function countByPosition(string $position): int
    {
        return count(array_filter(
            $this->installer_roster ?? [],
            fn($i) => ($i['position'] ?? '') === $position && !empty($i['name'])
        ));
    }
}
