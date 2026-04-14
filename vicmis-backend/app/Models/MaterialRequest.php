<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialRequest extends Model
{
    // 👇 Update fillable to match actual table columns
    protected $fillable = [
        'project_id',
        'project_name',
        'requester_name',      // 👈 Actual column in table
        'status',
        'approver_name',       // 👈 Actual column in table
        'items',               // 👈 Actual JSON column in table
    ];

    protected $casts = [
        'items'      => 'array',     // 👈 Cast JSON column
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────────────────

    public function items(): HasMany
    {
        return $this->hasMany(MaterialRequestItem::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'reordering']);
    }
}