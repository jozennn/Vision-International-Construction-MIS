<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    // 🚨 THE VIP BOUNCER LIST 🚨
    protected $fillable = [
        'lead_id',
        'project_name',
        'client_name',
        'location',
        'project_type',
        'status',
        'plan_measurement',
        'plan_boq',
        'actual_measurement',
        'final_boq',
        'completed_tasks',
        'is_phase1_approved',

        // All Document Pockets Allowed!
        'floor_plan_image',
        'po_document',
        'work_order_document',
        'site_inspection_photo',
        'delivery_receipt_document',
        'bidding_document',
        'subcontractor_agreement_document',
        'coc_document',

        // Subcontractor Details
        'subcontractor_name',
        'contract_amount',
        // 🚨 ADD THIS LINE:
        'materials_tracking', // 🚨 ADD THIS
        'timeline_tracking',  // 🚨 ADD THIS
         'site_inspection_report',
        'rejection_notes',
        'qa_photo',
        'client_walkthrough_doc',
        'final_invoice_document',
        // Tracking roles 
        'sales_agent_id',
        'engineer_id',
        'ops_ass_id',
        // Add 'site_inspection_report' to the existing array
       
        'is_completed'

    ];

    protected $casts = [
        'completed_tasks' => 'array',
        'is_phase1_approved' => 'boolean',
        'is_completed' => 'boolean',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
    public function salesAgent()
    {
        return $this->belongsTo(User::class, 'sales_agent_id');
    }
    public function engineer()
    {
        return $this->belongsTo(User::class, 'engineer_id');
    }
    public function opsAss()
    {
        return $this->belongsTo(User::class, 'ops_ass_id');
    }
}
