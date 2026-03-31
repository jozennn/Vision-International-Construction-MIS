<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefreshToken extends Model
{
    protected $fillable = [
        'user_id',
        'token',       // SHA-256 hash of the raw token — never store raw
        'user_agent',
        'ip_address',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to only return non-expired tokens.
     */
    public function scopeValid($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
