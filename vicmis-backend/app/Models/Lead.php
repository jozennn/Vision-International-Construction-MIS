<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
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
        'sales_rep_id' // This is the foreign key
    ];

    /**
     * Fetch the User (Sales Rep) associated with this lead.
     */
    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }
}