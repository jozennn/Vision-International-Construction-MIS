<?php
// ═══════════════════════════════════════════════════════════════════════════
// Supporting Models
// Split each class into its own file in app/Models/ in your actual project.
// e.g. app/Models/Lead.php, app/Models/ProjectAssignment.php, etc.
// ═══════════════════════════════════════════════════════════════════════════

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// ── Lead ──────────────────────────────────────────────────────────────────
class Lead extends Model
{
    use HasFactory;

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
        'sales_rep_id',
    ];

    /**
     * The sales rep who created / owns this lead.
     * sales_rep_id → users.id
     * Access name via: $lead->salesRep->name
     */
    public function salesRep()
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    /**
     * The project spawned from this lead (if converted).
     */
    public function project()
    {
        return $this->hasOne(Project::class);
    }
}

// ── ProjectAssignment ─────────────────────────────────────────────────────
class ProjectAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'role',          // 'sales' | 'lead_engineer' | 'support_engineer' | 'ops' | 'management'
        'assigned_by',
        'assigned_at',
        'removed_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'removed_at'  => 'datetime',
    ];

    public function project()  { return $this->belongsTo(Project::class); }
    public function user()     { return $this->belongsTo(User::class); }
    public function assigner() { return $this->belongsTo(User::class, 'assigned_by'); }
}

// ── ProjectBoqPlan ────────────────────────────────────────────────────────
class ProjectBoqPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'submitted_by',
        'plan_measurement',
        'plan_sqm',
        'boq_rows',
        'grand_total',
        'submitted_at',
    ];

    protected $casts = [
        'boq_rows'     => 'array',
        'grand_total'  => 'decimal:2',
        'plan_sqm'     => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
}

// ── ProjectBoqActual ──────────────────────────────────────────────────────
class ProjectBoqActual extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'submitted_by',
        'reviewed_by',
        'actual_measurement',
        'actual_sqm',
        'boq_rows',
        'grand_total',
        'review_status',
        'submitted_at',
        'reviewed_at',
    ];

    protected $casts = [
        'boq_rows'     => 'array',
        'grand_total'  => 'decimal:2',
        'actual_sqm'   => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at'  => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
    public function reviewedBy()  { return $this->belongsTo(User::class, 'reviewed_by'); }
}

// ── ProjectPoOrder ────────────────────────────────────────────────────────
class ProjectPoOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'po_document',
        'po_uploaded_by',
        'po_uploaded_at',
        'work_order_document',
        'wo_uploaded_by',
        'wo_uploaded_at',
        'verified_by',
        'verification_status',
        'verified_at',
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

// ── ProjectSiteInspection ─────────────────────────────────────────────────
class ProjectSiteInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'inspector_id',
        'inspector_name',
        'position',
        'site_location',
        'inspection_date',
        'inspection_time',
        'materials_scope',
        'notes_remarks',
        'checklist',
        'inspection_photo',
        'submitted_at',
    ];

    protected $casts = [
        'checklist'       => 'array',
        'inspection_date' => 'date',
        'submitted_at'    => 'datetime',
    ];

    public function project()   { return $this->belongsTo(Project::class); }

    /**
     * The inspector is fetched from the engineers list (users table).
     * inspector_id → users.id
     * Access via: $inspection->inspector->name
     */
    public function inspector() { return $this->belongsTo(User::class, 'inspector_id'); }
}

// ── ProjectMaterial ───────────────────────────────────────────────────────
class ProjectMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'delivery_receipt_document',
        'dr_uploaded_by',
        'dr_uploaded_at',
        'dr_verified_by',
        'dr_verification_status',
        'dr_verified_at',
        'bidding_document',
        'bidding_submitted_at',
        'subcontractor_name',
        'awarded_amount',
        'awarded_at',
        'material_items', 
        'timeline_tracking',      // replaces materials_tracking JSON blob
    ];

    protected $casts = [
        'material_items'       => 'array',
        'dr_uploaded_at'       => 'datetime',
        'dr_verified_at'       => 'datetime',
        'bidding_submitted_at' => 'datetime',
        'awarded_at'           => 'datetime',
        'awarded_amount'       => 'decimal:2',
    ];

    public function project()    { return $this->belongsTo(Project::class); }
    public function drUploader() { return $this->belongsTo(User::class, 'dr_uploaded_by'); }
    public function drVerifier() { return $this->belongsTo(User::class, 'dr_verified_by'); }
}

// ── ProjectMobilization ───────────────────────────────────────────────────
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
        'installer_count',
    ];

    protected $casts = [
        'contract_signed_at' => 'datetime',
        'deployed_at'        => 'datetime',
    ];

    public function project()          { return $this->belongsTo(Project::class); }
    public function contractUploader() { return $this->belongsTo(User::class, 'contract_uploaded_by'); }
    public function deployer()         { return $this->belongsTo(User::class, 'deployed_by'); }
}

// ── ProjectQaHandover ─────────────────────────────────────────────────────
class ProjectQaHandover extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'qa_photo',
        'qa_submitted_by',
        'qa_submitted_at',
        'qa_verified_by',
        'qa_status',
        'qa_verified_at',
        'client_walkthrough_doc',
        'walkthrough_completed_at',
        'coc_document',
        'coc_uploaded_by',
        'coc_signed_at',
    ];

    protected $casts = [
        'qa_submitted_at'         => 'datetime',
        'qa_verified_at'          => 'datetime',
        'walkthrough_completed_at'=> 'datetime',
        'coc_signed_at'           => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function qaSubmitter() { return $this->belongsTo(User::class, 'qa_submitted_by'); }
    public function qaVerifier()  { return $this->belongsTo(User::class, 'qa_verified_by'); }
    public function cocUploader() { return $this->belongsTo(User::class, 'coc_uploaded_by'); }
}

// ── ProjectBilling ────────────────────────────────────────────────────────
class ProjectBilling extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'billing_type',     // 'progress' | 'final'
        'invoice_document',
        'amount',
        'submitted_by',
        'status',           // 'pending' | 'paid' | 'disputed'
        'submitted_at',
        'paid_at',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'submitted_at' => 'datetime',
        'paid_at'      => 'datetime',
    ];

    public function project()     { return $this->belongsTo(Project::class); }
    public function submittedBy() { return $this->belongsTo(User::class, 'submitted_by'); }
}

// ── ProjectRejectionLog ───────────────────────────────────────────────────
class ProjectRejectionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'rejected_phase',
        'returned_to_phase',
        'reason',
        'rejected_by',
        'rejected_at',
    ];

    protected $casts = [
        'rejected_at' => 'datetime',
    ];

    public function project()    { return $this->belongsTo(Project::class); }
    public function rejectedBy() { return $this->belongsTo(User::class, 'rejected_by'); }
}
