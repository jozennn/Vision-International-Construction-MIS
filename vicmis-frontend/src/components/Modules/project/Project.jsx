import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import ProjectManagement from './tab/ProjectManagement.jsx';

// Config
import { canAccessProject, getPhaseAccess, getPreviousPhase } from './projectConfig.js';

// Hooks
import { useProjectActions } from './hooks/useProjectActions.js';
import { useCommandCenter }  from './hooks/useCommandCenter.js';
import { useTracking }       from './hooks/useTracking.js';

// Shared components
import PersonnelBar  from './components/PersonnelBar.jsx';
import WaitingView   from './components/WaitingView.jsx';
import RejectModal   from './components/RejectModal.jsx';

// Phase components
import PhaseFloorPlan      from './phases/PhaseFloorPlan.jsx';
import PhaseBoqPlan        from './phases/PhaseBoqPlan.jsx';
import PhaseBoqActual      from './phases/PhaseBoqActual.jsx';
import PhaseBOQReview      from './phases/PhaseBOQReview.jsx';
import PhasePOWorkOrder    from './phases/PhasePOWorkOrder.jsx';
import PhaseSiteInspection from './phases/PhaseSiteInspection.jsx';
import PhaseMaterials      from './phases/PhaseMaterials.jsx';
import PhaseMobilization   from './phases/PhaseMobilization.jsx';
import PhaseCommandCenter  from './phases/PhaseCommandCenter.jsx';
import PhaseBilling        from './phases/PhaseBilling.jsx';
import PhaseQAHandover     from './phases/PhaseQAHandover.jsx';
import PhaseCompleted      from './phases/PhaseCompleted.jsx';

import './css/Project.css';

// ── user comes from App.jsx via props (React state restored from cookie/session)
// ── Never read from sessionStorage — it's empty after a page refresh
const Project = ({ user, projects, setProjects }) => {
  const userDept = (user?.dept || user?.department || '').toLowerCase();

  // ── Role flags ───────────────────────────────────────────────────────────
  const isSales      = userDept.includes('sales');
  const isSalesHead  = userDept.includes('sales')       && user?.role === 'dept_head';
  const isEng        = userDept.includes('engineering');
  const isEngHead    = userDept.includes('engineering') && user?.role === 'dept_head';
  const isLogistics  = userDept.includes('logistics')  || userDept.includes('inventory');
  const isAccounting = userDept.includes('accounting') || userDept.includes('finance');
  const isOpsAss     = userDept.includes('management') || user?.role === 'admin' || user?.role === 'manager';

  // Any dept_head (sales, engineering, logistics, accounting, etc.) sees ALL projects
  const isDeptHeadAny = user?.role === 'dept_head';

  const roles = { isSales, isSalesHead, isEng, isEngHead, isLogistics, isAccounting, isOpsAss, isDeptHeadAny };

  const userDeptMode = isSalesHead    ? 'SALES HEAD'
    : isSales                         ? 'SALES'
    : isEngHead                       ? 'ENGINEERING HEAD'
    : isEng                           ? 'ENGINEERING'
    : isLogistics                     ? 'LOGISTICS'
    : isAccounting                    ? 'ACCOUNTING'
    : isOpsAss                        ? 'MANAGEMENT'
    : isDeptHeadAny                   ? 'DEPT HEAD'
    : (user?.department || 'STAFF').toUpperCase();

  // ── Views ────────────────────────────────────────────────────────────────
  const [currentView,     setCurrentView]     = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPhase,     setRejectPhase]     = useState('');

  // ── Hooks ────────────────────────────────────────────────────────────────
  const refreshProject = async () => {
    if (!selectedProject?.id) return;
    try {
      const res = await api.get(`/projects/${selectedProject.id}`);
      setSelectedProject(res.data.project || res.data);
    } catch (err) {
      console.error('Refresh failed', err);
    }
  };

  const actions  = useProjectActions(selectedProject, refreshProject);
  const cc       = useCommandCenter(selectedProject);
  const tracking = useTracking(selectedProject, user?.name);

  // ── Teleporter ───────────────────────────────────────────────────────────
  useEffect(() => {
    const teleport = async (id) => {
      try {
        const res  = await api.get(`/projects/${id}`);
        const proj = res.data.project || res.data;
        if (!proj?.id) return alert('Project not found or out of scope.');
        if (!canAccessProject(proj, user, userDept)) return alert("You don't have access to this project.");
        setSelectedProject(proj);
        setCurrentView('workflow-detail');
      } catch (err) {
        console.error('Teleport failed', err);
      }
    };

    const pending = sessionStorage.getItem('autoOpenProjectId');
    if (pending) {
      sessionStorage.removeItem('autoOpenProjectId');
      teleport(pending);
    }

    const handler = (e) => {
      sessionStorage.removeItem('autoOpenProjectId');
      teleport(e.detail);
    };

    window.addEventListener('open-project', handler);
    return () => window.removeEventListener('open-project', handler);
  }, []);

  // ── Init tracking when project changes ───────────────────────────────────
  useEffect(() => {
    if (selectedProject) {
      tracking.initFromProject(selectedProject);
      cc.fetchCommandCenterData(selectedProject.id);
    }
  }, [selectedProject?.id]);

  // ── Submit plan/actual helpers ────────────────────────────────────────────
  const submitPlanPhase = async () => {
    try {
      await api.post(`/projects/${selectedProject.id}/submit-plan`, {
        plan_measurement: tracking.boqData.planMeasurement,
        plan_sqm:         tracking.boqData.planSqm,
        plan_boq:         JSON.stringify(tracking.boqData.planBOQ),
      });
      await refreshProject();
    } catch (err) {
      alert(`Failed to save Plan Data: ${err.message}`);
    }
  };

  const submitActualPhase = async () => {
    try {
      await api.post(`/projects/${selectedProject.id}/submit-actual`, {
        actual_measurement: tracking.boqData.actualMeasurement,
        actual_sqm:         tracking.boqData.actualSqm,
        final_boq:          JSON.stringify(tracking.boqData.finalBOQ),
      });
      await refreshProject();
    } catch (err) {
      alert(`Failed to submit Actual BOQ: ${err.message}`);
    }
  };

  // ── Render document link helper ───────────────────────────────────────────
  const renderDocumentLink = (label, filePath) => {
    if (!filePath) return null;
    return (
      <div className="pm-doc-link no-print">
        <span className="pm-doc-label">📄 {label}</span>
        <a
          href={`/storage/${filePath}`}
          target="_blank"
          rel="noreferrer"
          className="pm-doc-btn"
        >
          View Document
        </a>
      </div>
    );
  };

  // ── HOME VIEW ─────────────────────────────────────────────────────────────
  if (currentView === 'home') {
    return (
      <ProjectManagement
        onSelectProject={(proj) => {
          if (!canAccessProject(proj, user, userDept)) {
            alert("You don't have access to this project.");
            return;
          }
          setSelectedProject(proj);
          setCurrentView('workflow-detail');
        }}
        currentUserId={user?.id}
        currentUserDept={userDept}
        currentUserRole={user?.role}
        isDeptHeadAny={isDeptHeadAny}
      />
    );
  }

  // ── WORKFLOW DETAIL VIEW ──────────────────────────────────────────────────
  const { status } = selectedProject;
  const phaseAccess   = getPhaseAccess(status, roles);
  const previousPhase = phaseAccess === 'active' ? getPreviousPhase(status, roles) : null;
  const latestLog     = cc.dailyLogsHistory[0] || null;

  // Shared props passed to every phase component
  const sharedPhaseProps = {
    project:            selectedProject,
    onAdvance:          actions.advanceStatus,
    onUploadAdvance:    actions.uploadAndAdvance,
    onReject:           (phase) => { setRejectPhase(phase); setShowRejectModal(true); },
    renderDocumentLink,
    ...roles,
  };

  return (
    <div className="pm-container">

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <RejectModal
          targetPhase={rejectPhase}
          onConfirm={(phase, reason) => {
            actions.executeRejection(phase, reason);
            setShowRejectModal(false);
          }}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="pm-header no-print">
        <div className="pm-header-left">
          <button onClick={() => setCurrentView('home')} className="pm-back-btn">
            ← BACK TO DASHBOARD
          </button>
          {previousPhase && (
            <button
              className="pm-back-phase-btn"
              onClick={() => actions.handleGoBackPhase(previousPhase)}
              disabled={actions.goBackLoading}
            >
              {actions.goBackLoading ? '⏳ Going back…' : `↩ Back to: ${previousPhase}`}
            </button>
          )}
        </div>
        <h2 className="pm-header-title">
          {selectedProject.project_name} | <span>{status}</span>
        </h2>
      </div>

      {/* ── Personnel Bar ── */}
      <PersonnelBar project={selectedProject} userDeptMode={userDeptMode} />

      {/* ── Phase Container ── */}
      <div className="pm-phase-container">

        {phaseAccess === 'waiting' && (
          <WaitingView status={status} project={selectedProject} />
        )}

        {phaseAccess === 'active' && (
          <>
            {status === 'Floor Plan' && (
              <PhaseFloorPlan {...sharedPhaseProps} />
            )}

            {status === 'Measurement based on Plan' && (
              <PhaseBoqPlan
                {...sharedPhaseProps}
                boqData={tracking.boqData}
                setBoqData={tracking.setBoqData}
                addBoqRow={tracking.addBoqRow}
                removeBoqRow={tracking.removeBoqRow}
                handleBoqChange={tracking.handleBoqChange}
                onSubmitPlan={submitPlanPhase}
              />
            )}

            {status === 'Actual Measurement' && (
              <PhaseBoqActual
                {...sharedPhaseProps}
                boqData={tracking.boqData}
                setBoqData={tracking.setBoqData}
                addBoqRow={tracking.addBoqRow}
                removeBoqRow={tracking.removeBoqRow}
                handleBoqChange={tracking.handleBoqChange}
                onSubmitActual={submitActualPhase}
              />
            )}

            {status === 'Pending Head Review' && (
              <PhaseBOQReview {...sharedPhaseProps} boqData={tracking.boqData} />
            )}

            {/* Purchase Order only — P.O & Work Order and Pending Work Order Verification removed (no template yet) */}
            {status === 'Purchase Order' && (
              <PhasePOWorkOrder {...sharedPhaseProps} />
            )}

            {status === 'Initial Site Inspection' && (
              <PhaseSiteInspection {...sharedPhaseProps} />
            )}

            {/* Awarding of Project removed (no template yet) */}
            {['Checking of Delivery of Materials', 'Pending DR Verification', 'Bidding of Project'].includes(status) && (
              <PhaseMaterials {...sharedPhaseProps} boqData={tracking.boqData} />
            )}

            {/* Contract Signing for Installer removed (no template yet) */}
            {status === 'Deployment and Orientation of Installers' && (
              <PhaseMobilization {...sharedPhaseProps} />
            )}

            {['Site Inspection & Project Monitoring', 'Request Materials Needed'].includes(status) && (
              <PhaseCommandCenter
                {...sharedPhaseProps}
                cc={cc}
                tracking={tracking}
                user={user}
              />
            )}

            {status === 'Request Billing' && (
              <PhaseBilling {...sharedPhaseProps} latestLog={latestLog} />
            )}

            {/* Pending QA Verification, Final Site Inspection with the Client,
                Signing of COC, and Request Final Billing removed (no template yet) */}
            {status === 'Site Inspection & Quality Checking' && (
              <PhaseQAHandover {...sharedPhaseProps} />
            )}

            {['Completed', 'Archived'].includes(status) && (
              <PhaseCompleted {...sharedPhaseProps} exportCOABoardToExcel={() => {}} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Project;