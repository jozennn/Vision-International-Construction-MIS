// ─── VICMIS Project Module — Central Configuration ────────────────────────────
// All phase constants, waiting messages, access logic, and phase order live here.
// Import from this file in any phase component or hook.

export const WAITING_MSG = {
  'Floor Plan':                                { dept: 'Sales',                   msg: 'upload the initial Floor Plan' },
  'Measurement based on Plan':                 { dept: 'Engineering',             msg: 'complete the Plan Measurement & BOQ' },
  'Actual Measurement':                        { dept: 'Engineering',             msg: 'submit the Actual Site Measurement' },
  'Pending Head Review':                       { dept: 'Engineering Head',        msg: 'review and approve the Final BOQ' },
  'Purchase Order':                            { dept: 'Sales',                   msg: 'upload the Purchase Order' },
  'P.O & Work Order':                          { dept: 'Sales',                   msg: 'prepare and upload the Work Order' },
  'Pending Work Order Verification':           { dept: 'Sales Head',              msg: 'verify and approve the Work Order' },
  'Initial Site Inspection':                   { dept: 'Engineering',             msg: 'complete the Initial Site Inspection' },
  'Checking of Delivery of Materials':         { dept: 'Engineering / Logistics', msg: 'verify delivery of materials' },
  'Pending DR Verification':                   { dept: 'Logistics',               msg: 'verify stock availability and the P.O / Proof of Payment' }, // ← changed from Engineering Head
  'Bidding of Project':                        { dept: 'Management',              msg: 'complete the Bidding phase' },
  'Awarding of Project':                       { dept: 'Management',              msg: 'complete the Project Awarding' },
  'Contract Signing for Installer':            { dept: 'Engineering',             msg: 'complete the Subcontractor Handover' },
  'Deployment and Orientation of Installers':  { dept: 'Engineering',             msg: 'complete Site Mobilization' },
  'Site Inspection & Project Monitoring':      { dept: 'Engineering',             msg: 'complete active construction monitoring' },
  'Request Materials Needed':                  { dept: 'Logistics',               msg: 'dispatch the requested materials' },
  'Request Billing':                           { dept: 'Accounting',              msg: 'process the Progress Billing' },
  'Site Inspection & Quality Checking':        { dept: 'Engineering',             msg: 'complete internal QA/QC' },
  'Pending QA Verification':                   { dept: 'Engineering Head',        msg: 'verify the QA photo' },
  'Final Site Inspection with the Client':     { dept: 'Engineering',             msg: 'complete the Client Walkthrough' },
  'Signing of COC':                            { dept: 'Engineering',             msg: 'upload the Certificate of Completion' },
  'Request Final Billing':                     { dept: 'Accounting',              msg: 'process the Final Billing' },
};

// locked: true = a head approved this phase; nobody can go back past it
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
  { status: 'Pending DR Verification',                   owner: 'logistics',  locked: true }, // ← changed from eng_head
  { status: 'Bidding of Project',                        owner: 'management'  },
  { status: 'Awarding of Project',                       owner: 'management'  },
  { status: 'Contract Signing for Installer',            owner: 'engineering' },
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

// Phase → component file map (used by the orchestrator)
export const PHASE_COMPONENT_MAP = {
  'Floor Plan':                                'PhaseFloorPlan',
  'Measurement based on Plan':                 'PhaseBoqPlan',
  'Actual Measurement':                        'PhaseBoqActual',
  'Pending Head Review':                       'PhaseBOQReview',
  'Purchase Order':                            'PhasePOWorkOrder',
  'P.O & Work Order':                          'PhasePOWorkOrder',
  'Pending Work Order Verification':           'PhasePOWorkOrder',
  'Initial Site Inspection':                   'PhaseSiteInspection',
  'Checking of Delivery of Materials':         'PhaseMaterials',
  'Pending DR Verification':                   'PhaseMaterials',
  'Bidding of Project':                        'PhaseMaterials',
  'Awarding of Project':                       'PhaseMaterials',
  'Contract Signing for Installer':            'PhaseMobilization',
  'Deployment and Orientation of Installers':  'PhaseMobilization',
  'Site Inspection & Project Monitoring':      'PhaseCommandCenter',
  'Request Materials Needed':                  'PhaseCommandCenter',
  'Request Billing':                           'PhaseBilling',
  'Site Inspection & Quality Checking':        'PhaseQAHandover',
  'Pending QA Verification':                   'PhaseQAHandover',
  'Final Site Inspection with the Client':     'PhaseQAHandover',
  'Signing of COC':                            'PhaseQAHandover',
  'Request Final Billing':                     'PhaseBilling',
  'Completed':                                 'PhaseCompleted',
  'Archived':                                  'PhaseCompleted',
};

// Returns the immediately previous phase (one step back), or null if locked
export const getPreviousPhase = (currentStatus, roles) => {
  const idx = PHASE_ORDER.findIndex(p => p.status === currentStatus);
  if (idx <= 0) return null;

  const prevPhase = PHASE_ORDER[idx - 1];
  if (!prevPhase) return null;

  if (prevPhase.locked) return null;

  const lockedBetween = PHASE_ORDER.slice(idx, idx).some(p => p.locked);
  if (lockedBetween) return null;

  return prevPhase.status;
};

// ── Helper: check if the user is any kind of dept_head ───────────────────────
const isDeptHead = (user) => user?.role === 'dept_head';

// Returns true if the user is allowed to open/see this project
export const canAccessProject = (project, user, userDept) => {
  if (!project) return false;

  if (user?.role === 'admin' || user?.role === 'manager') return true;
  if (isDeptHead(user)) return true;

  if (userDept.includes('management')) return true;

  if (userDept.includes('sales')) {
    const createdById = project?.created_by || project?.lead?.created_by_id;
    if (!createdById) return true;
    return String(createdById) === String(user?.id);
  }

  if (userDept.includes('engineering')) {
    const assignedIds = project?.assigned_engineer_ids || [];
    if (assignedIds.length === 0) return true;
    return assignedIds.map(String).includes(String(user?.id));
  }

  return true;
};

// Returns 'active' | 'waiting' for the current user + phase combo
export const getPhaseAccess = (status, { isSales, isEng, isEngHead, isSalesHead, isLogistics, isAccounting, isOpsAss, isDeptHeadAny }) => {
  if (isOpsAss) return 'active';

  const map = {
    'Floor Plan':                                isSales      || isSalesHead,
    'Measurement based on Plan':                 isEng        || isEngHead,
    'Actual Measurement':                        isEng        || isEngHead,
    'Pending Head Review':                       isEngHead,
    'Purchase Order':                            isSales      || isSalesHead,
    'P.O & Work Order':                          isSales      || isSalesHead,
    'Pending Work Order Verification':           isSalesHead,
    'Initial Site Inspection':                   isEng        || isEngHead,
    'Checking of Delivery of Materials':         isEng        || isEngHead   || isLogistics,
    'Pending DR Verification':                   isLogistics,                               // ← changed from isEngHead
    'Bidding of Project':                        isOpsAss,
    'Awarding of Project':                       isOpsAss,
    'Contract Signing for Installer':            isEng        || isEngHead,
    'Deployment and Orientation of Installers':  isEng        || isEngHead,
    'Site Inspection & Project Monitoring':      isEng        || isEngHead,
    'Request Materials Needed':                  isLogistics,
    'Request Billing':                           isAccounting,
    'Site Inspection & Quality Checking':        isEng        || isEngHead,
    'Pending QA Verification':                   isEngHead,
    'Final Site Inspection with the Client':     isEng        || isEngHead,
    'Signing of COC':                            isEng        || isEngHead,
    'Request Final Billing':                     isAccounting,
    'Completed':                                 true,
    'Archived':                                  true,
  };
  return map[status] ? 'active' : 'waiting';
};

import { useState } from 'react';
import api from '@/api/axios';

/**
 * useProjectActions
 * Provides all project status-transition actions.
 */
export const useProjectActions = (selectedProject, refreshProject) => {
  const [goBackLoading, setGoBackLoading] = useState(false);

  const advanceStatus = async (nextStatus) => {
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, { status: nextStatus });
      await refreshProject();
    } catch (err) {
      alert(`Error updating status: ${err.response?.data?.message ?? err.message}`);
    }
  };

  const uploadAndAdvance = async (nextStatus, fileKey, uploadFile, awardDetails = {}) => {
    if (!uploadFile && fileKey) return alert('Please select a file first to proceed!');
    try {
      const fd = new FormData();
      fd.append('status', nextStatus);
      if (fileKey) fd.append(fileKey, uploadFile);
      fd.append('_method', 'PATCH');
      if (awardDetails.name)   fd.append('subcontractor_name', awardDetails.name);
      if (awardDetails.amount) fd.append('contract_amount',    awardDetails.amount);
      await api.post(`/projects/${selectedProject.id}/status`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProject();
    } catch (err) {
      alert(`Upload Failed: ${err.response?.data?.message ?? err.message}`);
    }
  };

  const executeRejection = async (rejectTargetPhase, rejectionReason) => {
    if (!rejectionReason.trim()) return alert('Please provide a specific reason for rejection.');
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, {
        status:          rejectTargetPhase,
        rejection_notes: rejectionReason,
      });
      await refreshProject();
    } catch (err) {
      alert(`Failed to reject project: ${err.response?.data?.message ?? err.message}`);
    }
  };

  const handleGoBackPhase = async (targetPhase) => {
    if (!window.confirm(
      `Go back to "${targetPhase}"?\n\nThis will reopen that phase for editing.`
    )) return;
    setGoBackLoading(true);
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, {
        status:  targetPhase,
        go_back: true,
      });
      await refreshProject();
    } catch (err) {
      alert(`Failed to go back: ${err.response?.data?.message ?? err.message}`);
    } finally {
      setGoBackLoading(false);
    }
  };

  return { advanceStatus, uploadAndAdvance, executeRejection, handleGoBackPhase, goBackLoading };
};