export const WAITING_MSG = {
  'Floor Plan':                                  { dept: 'Sales',                   msg: 'upload the initial Floor Plan' },
  'Measurement based on Plan':                   { dept: 'Engineering',             msg: 'complete the Plan Measurement & BOQ' },
  'Actual Measurement':                          { dept: 'Engineering',             msg: 'submit the Actual Site Measurement' },
  'Pending Head Review':                         { dept: 'Engineering Head',        msg: 'review and approve the Final BOQ' },
  'Purchase Order':                              { dept: 'Sales',                   msg: 'upload the Purchase Order' },
  'P.O & Work Order':                            { dept: 'Sales',                   msg: 'prepare and upload the Work Order' },
  'Pending Work Order Verification':             { dept: 'Sales Head',              msg: 'verify and approve the Work Order' },
  'Initial Site Inspection':                     { dept: 'Engineering',             msg: 'complete the Initial Site Inspection' },
  'Checking of Delivery of Materials':           { dept: 'Engineering / Logistics', msg: 'verify delivery of materials' },
  'Pending DR Verification':                     { dept: 'Logistics',               msg: 'verify stock availability and the P.O / Proof of Payment' },
  'Bidding of Project':                          { dept: 'Management',              msg: 'complete the internal bidding documentation and contractor evaluation' },
  'Awarding of Project':                         { dept: 'Management',              msg: 'complete the internal bidding documentation and contractor evaluation' },
  'Contract Signing for Installer':              { dept: 'Management',              msg: 'complete the Subcontractor Handover' },
  'Deployment and Orientation of Installers':    { dept: 'Engineering',             msg: 'complete Site Mobilization' },
  'Site Inspection & Project Monitoring':        { dept: 'Engineering',             msg: 'complete active construction monitoring' },
  'Request Materials Needed':                    { dept: 'Logistics',               msg: 'dispatch the requested materials' },
  'Request Billing':                             { dept: 'Accounting',              msg: 'process the Progress Billing' },
  'Site Inspection & Quality Checking':          { dept: 'Engineering',             msg: 'complete internal QA/QC' },
  'Pending QA Verification':                     { dept: 'Engineering Head',        msg: 'verify the QA photo' },
  'Final Site Inspection with the Client':       { dept: 'Engineering',             msg: 'complete the Client Walkthrough' },
  'Signing of COC':                              { dept: 'Engineering',             msg: 'upload the Certificate of Completion' },
  'Request Final Billing':                       { dept: 'Accounting',              msg: 'process the Final Billing' },
};

// locked: true  = a head approved this phase; nobody can go back past it
// headOnly: true = phase has no UI component; only management sees an advance button
export const PHASE_ORDER = [
  { status: 'Floor Plan',                                owner: 'sales'       },
  { status: 'Measurement based on Plan',                 owner: 'engineering' },
  { status: 'Actual Measurement',                        owner: 'engineering' },
  { status: 'Pending Head Review',                       owner: 'eng_head',   locked: true },
  { status: 'Purchase Order',                            owner: 'sales'       },
  { status: 'P.O & Work Order',                         owner: 'sales'       },
  { status: 'Pending Work Order Verification',           owner: 'sales_head', locked: true },
  { status: 'Initial Site Inspection',                   owner: 'engineering' },
  { status: 'Checking of Delivery of Materials',         owner: 'engineering' },
  { status: 'Pending DR Verification',                   owner: 'logistics',  locked: true },
  { status: 'Bidding of Project',                        owner: 'management', headOnly: true },
  { status: 'Awarding of Project',                       owner: 'management', headOnly: true },
  { status: 'Contract Signing for Installer',            owner: 'management' },
  { status: 'Deployment and Orientation of Installers',  owner: 'engineering' },
  { status: 'Site Inspection & Project Monitoring',      owner: 'engineering' },
  { status: 'Request Materials Needed',                  owner: 'logistics'   },
  { status: 'Request Billing',                           owner: 'accounting'  },
  { status: 'Site Inspection & Quality Checking',        owner: 'engineering' },
  { status: 'Pending QA Verification',                   owner: 'eng_head',   locked: true },
  { status: 'Final Site Inspection with the Client',     owner: 'engineering' },
  { status: 'Signing of COC',                            owner: 'engineering' },
  { status: 'Request Final Billing',                     owner: 'accounting'  },
  { status: 'Completed',                                 owner: 'all'         },
  { status: 'Archived',                                  owner: 'all'         },
];

// Phases that have NO component — always render WaitingView only
export const WAITING_ONLY_PHASES = new Set([
  'Purchase Order', 
  'P.O & Work Order',
  'Pending Work Order Verification',
  'Bidding of Project',
  'Awarding of Project',
  'Contract Signing for Installer',
  'Pending QA Verification',
  'Final Site Inspection with the Client',
  'Signing of COC',
  'Request Final Billing',
]);

export const LOGISTICS_PHASES = [
  'Checking of Delivery of Materials',
  'Pending DR Verification',
  'Request Materials Needed',
];

export const ACCOUNTING_PHASES = [
  'Request Billing',
  'Request Final Billing',
];

export const PHASE_COMPONENT_MAP = {
  'Floor Plan':                                'PhaseFloorPlan',
  'Measurement based on Plan':                 'PhaseBoqPlan',
  'Actual Measurement':                        'PhaseBoqActual',
  'Pending Head Review':                       'PhaseBOQReview',
  'Initial Site Inspection':                   'PhaseSiteInspection',
  'Checking of Delivery of Materials':         'PhaseMaterials',
  'Pending DR Verification':                   'PhaseMaterials',
  'Deployment and Orientation of Installers':  'PhaseMobilization',
  'Site Inspection & Project Monitoring':      'PhaseCommandCenter',
  'Request Materials Needed':                  'PhaseCommandCenter',
  'Request Billing':                           'PhaseBilling',
  'Site Inspection & Quality Checking':        'PhaseQAHandover',
  'Completed':                                 'PhaseCompleted',
  'Archived':                                  'PhaseCompleted',
};

export const getPreviousPhase = (currentStatus) => {
  const idx = PHASE_ORDER.findIndex(p => p.status === currentStatus);
  if (idx <= 0) return null;
  const prevPhase = PHASE_ORDER[idx - 1];
  if (!prevPhase || prevPhase.locked) return null;
  return prevPhase.status;
};

const isDeptHead = (user) => user?.role === 'dept_head';

export const canAccessProject = (project, user, userDept) => {
  if (!project) return false;

  const dept  = (userDept ?? '').toLowerCase();
  const role  = (user?.role ?? '').toLowerCase();
  const email = (user?.email ?? '').toLowerCase();

  if (role === 'admin' || role === 'manager') return true;
  if (isDeptHead(user)) return true;
  if (dept.includes('management') || email.includes('ops') || email.includes('admin')) return true;
  if (dept.includes('engineering') || email.includes('eng')) return true;

  if (dept.includes('sales') || email.includes('sales')) {
    const createdById = project?.created_by || project?.lead?.created_by_id;
    if (!createdById) return true;
    return String(createdById) === String(user?.id);
  }

  if (dept.includes('logistics') || dept.includes('inventory') || email.includes('logistic')) {
    return LOGISTICS_PHASES.includes(project?.status);
  }

  if (
    dept.includes('accounting') || dept.includes('finance') ||
    dept.includes('procurement') || role.includes('accounting') ||
    email.includes('accounting')
  ) {
    return ACCOUNTING_PHASES.includes(project?.status);
  }

  return false;
};

export const getPhaseAccess = (status, {
  isSales, isEng, isEngHead, isSalesHead,
  isLogistics, isAccounting, isOpsAss,
}) => {
  if (isOpsAss) return 'active';

  const map = {
    'Floor Plan':                                isSales    || isSalesHead,
    'Measurement based on Plan':                 isEng      || isEngHead,
    'Actual Measurement':                        isEng      || isEngHead,
    'Pending Head Review':                       isEngHead,
    'Purchase Order':                            isSales    || isSalesHead,
    'P.O & Work Order':                          isSales    || isSalesHead,
    'Pending Work Order Verification':           isSalesHead,
    'Initial Site Inspection':                   isEng      || isEngHead,
    'Checking of Delivery of Materials':         isEng      || isEngHead || isLogistics,
    'Pending DR Verification':                   isLogistics,
    'Bidding of Project':                        false,
    'Awarding of Project':                       false,
    'Contract Signing for Installer':            isEng      || isEngHead,
    'Deployment and Orientation of Installers':  isEng      || isEngHead,
    'Site Inspection & Project Monitoring':      isEng      || isEngHead,
    'Request Materials Needed':                  isLogistics,
    'Request Billing':                           isAccounting,
    'Site Inspection & Quality Checking':        isEng      || isEngHead,
    'Pending QA Verification':                   isEngHead,
    'Final Site Inspection with the Client':     isEng      || isEngHead,
    'Signing of COC':                            isEng      || isEngHead,
    'Request Final Billing':                     isAccounting,
    'Completed':                                 true,
    'Archived':                                  true,
  };

  return map[status] ? 'active' : 'waiting';
};

// ── Phase-owner-aware advance permission ──────────────────────────────────────
// Controls who sees the "Advance to X" button in WaitingView
export const canAdvanceWaitingPhase = (status, user, userDept) => {
  const dept  = (userDept ?? '').toLowerCase();
  const role  = (user?.role ?? '').toLowerCase();
  const email = (user?.email ?? '').toLowerCase();

  // Admins and managers can always advance
  if (role === 'admin' || role === 'manager') return true;

  const phase = PHASE_ORDER.find(p => p.status === status);
  if (!phase) return false;

  switch (phase.owner) {
    case 'sales':
      return dept.includes('sales') || email.includes('sales');

    case 'sales_head':
      return (dept.includes('sales') || email.includes('sales')) && role === 'dept_head';

    case 'engineering':
      return dept.includes('engineering') || email.includes('eng');

    case 'eng_head':
      return (dept.includes('engineering') || email.includes('eng')) && role === 'dept_head';

    case 'logistics':
      return dept.includes('logistics') || dept.includes('inventory') || email.includes('logistic');

    case 'accounting':
      return dept.includes('accounting') || dept.includes('finance') || email.includes('accounting');

    case 'management':
      // Only actual management dept — NOT dept_heads from other departments
      return dept.includes('management')
        || email.includes('ops')
        || email.includes('admin');

    case 'all':
      return true;

    default:
      return false;
  }
};