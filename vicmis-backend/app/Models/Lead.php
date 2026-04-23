<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity; // 1. IMPORT THE TRAIT HERE

class Lead extends Model
{
    use SoftDeletes;
    use LogsActivity; // 2. USE THE TRAIT INSIDE THE CLASS

    protected $fillable = [
        'client_name', 
        'project_name', 
        'location', 
        'contact_no', 
        'email', 
        'address', 
        'notes', 
        'status', 
        'approval_status', 
        'sales_rep_id'
    ];

    /**
     * Fetch the User (Sales Rep) associated with this lead.
     */
    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }
}