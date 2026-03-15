<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectPoOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'po_document', 'po_uploaded_by', 'po_uploaded_at',
        'work_order_document', 'wo_uploaded_by', 'wo_uploaded_at',
        'verified_by', 'verification_status', 'verified_at',
    ];

    protected $casts = [
        'po_uploaded_at' => 'datetime',
        'wo_uploaded_at' => 'datetime',
        'verified_at'    => 'datetime',
    ];

    public function project()    { return $this->belongsTo(Project::class); }
    public function poUploader() { return $this->belongsTo(User::class, 'po_uploaded_by'); }
    public function woUploader() { return $this->belongsTo(User::class, 'wo_uploaded_by'); }
    public function verifier()   { return $this->belongsTo(User::class, 'verified_by'); }
}
