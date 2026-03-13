<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = ['user_id', 'year', 'month', 'day', 'date', 'status'];

    /**
     * Get the user/employee associated with this attendance record.
     */
    public function employee(): BelongsTo
    {
        // We name this 'employee' so that ->with('employee') works in your controller
        // but it points to the User model using the 'user_id' column.
        return $this->belongsTo(User::class, 'user_id');
    }
}