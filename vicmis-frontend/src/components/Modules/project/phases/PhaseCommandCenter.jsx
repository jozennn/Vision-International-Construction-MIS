import React, { useState, useMemo } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import InstallerMonitoring  from './InstallerMonitoring.jsx';
import TimelineGantt        from './TimelineGantt.jsx';
import MaterialsMonitoring  from './MaterialsMonitoring.jsx';
import SiteInspectionReport from './SiteInspectionReport.jsx';
import '../css/PhaseCommandCenter.css';

// ── Material Requisition Modal ────────────────────────────────────────────────
const MaterialReqModal = ({ finalBOQ, requestItems, onQtyChange, onToggle, onSubmit, onClose }) => (
  <div className="pm-modal-overlay">
    <div className="pm-modal-content pm-modal-orange large">
      <div className="pm-flex-between mb-4">
        <h3 className="pm-title-lg pm-text-orange">📦 Material Requisition Alert</h3>
        <button onClick={onClose} className="pm-close-btn">✕</button>
      </div>
      <p className="pm-text-muted">Select items from the approved Final BOQ to request delivery from Logistics.</p>
      <div className="pm-modal-table-scroll">
        <table className="pm-table text-center">
          <thead className="pm-thead-sticky">
            <tr>
              <th className="text-left">Description</th>
              <th>Unit</th>
              <th>Needed Qty</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {finalBOQ.map((item, idx) => {
              const isSel = requestItems.some(i => i.description === item.description);
              const cur   = requestItems.find(i => i.description === item.description);
              return (
                <tr key={idx} className={isSel ? 'pm-tr-selected' : ''}>
                  <td className="pm-td-bold text-left">{item.description}</td>
                  <td>{item.unit}</td>
                  <td>
                    <input type="number" placeholder="Qty"
                      className={`pm-input pm-req-qty-input text-center ${isSel ? 'pm-req-qty-active' : ''}`}
                      value={cur ? cur.requestedQty : ''}
                      onChange={e => onQtyChange(item, e.target.value)}
                      disabled={!isSel} />
                  </td>
                  <td>
                    <input type="checkbox" className="pm-req-checkbox"
                      checked={isSel} onChange={e => onToggle(item, e.target.checked)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pm-grid-2 mt-4">
        <button className="pm-btn pm-btn-outline" onClick={onClose}>Cancel</button>
        <PrimaryButton variant="orange" onClick={onSubmit}>🚀 Send Request</PrimaryButton>
      </div>
    </div>
  </div>
);

// ── Extracted Logistics panel so it can have its own hooks legally ────────────
const LogisticsDispatch = ({ onAdvance }) => {
  const [checks, setChecks] = useState({ inventory: false, transport: false, notified: false });
  const ready = checks.inventory && checks.transport && checks.notified;

  return (
    <div className="pm-cc-wrapper">
      <div className="pm-card">
        <div className="pm-card-navy pm-navy-orange">
          <h3 className="pm-title-md pm-text-white">🚚 Logistics: Material Dispatch Center</h3>
        </div>
        <div className="pm-cc-body">
          <div className="pm-card-cream pm-cream-orange">
            <h4 className="pm-title-lg pm-text-orange-dark">Dispatch Preparation Checklist</h4>
            <div className="pm-grid-3 mb-4">
              <label className="pm-checklist-item pm-checklist-orange">
                <input type="checkbox" checked={checks.inventory}
                  onChange={e => setChecks(c => ({ ...c, inventory: e.target.checked }))} />
                <span className="pm-text-orange-dark">📦 Pulled from Inventory</span>
              </label>
              <label className="pm-checklist-item pm-checklist-orange">
                <input type="checkbox" checked={checks.transport}
                  onChange={e => setChecks(c => ({ ...c, transport: e.target.checked }))} />
                <span className="pm-text-orange-dark">🚚 Transport Assigned</span>
              </label>
              <label className="pm-checklist-item pm-checklist-orange">
                <input type="checkbox" checked={checks.notified}
                  onChange={e => setChecks(c => ({ ...c, notified: e.target.checked }))} />
                <span className="pm-text-orange-dark">📱 Eng Team Notified</span>
              </label>
            </div>
            <PrimaryButton disabled={!ready} variant="orange"
              onClick={() => onAdvance('Site Inspection & Project Monitoring')}>
              ✓ Confirm Dispatch & Return to Engineer
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
const PhaseCommandCenter = ({ project, cc, tracking, onAdvance, onUploadAdvance, isLogistics, user }) => {
  const [activeTab, setActiveTab] = useState('installers');

  const { status } = project;

  const {
    requestItems, showRequestModal, setShowRequestModal,
    handleRequestQtyChange, handleRequestToggle, submitMaterialRequest,
    issueLog, setIssueLog, issuesHistory, isSubmittingIssue, handleIssueSubmit,
  } = cc;

  const { boqData } = tracking;

  const timelineTrackingData = useMemo(() => {
    try {
      const raw = typeof tracking?.timeline_tracking === 'string'
        ? JSON.parse(tracking.timeline_tracking)
        : (tracking?.timeline_tracking ?? {});
      return raw;
    } catch { return {}; }
  }, [tracking?.timeline_tracking]);

  if (status === 'Request Materials Needed' && isLogistics) {
    return <LogisticsDispatch onAdvance={onAdvance} />;
  }

  return (
    <div className="pm-cc-wrapper">
      {showRequestModal && (
        <MaterialReqModal
          finalBOQ={boqData?.finalBOQ ?? []}
          requestItems={requestItems}
          onQtyChange={handleRequestQtyChange}
          onToggle={handleRequestToggle}
          onSubmit={() => submitMaterialRequest(user)}
          onClose={() => setShowRequestModal(false)}
        />
      )}

      <div className="pm-card">
        {/* Tabs */}
        <div className="pm-tabs-wrapper">
          {[
            ['installers', '📋 INSTALLER MONITORING'],
            ['timeline',   '⏳ PROJECT TIMELINE'],
            ['materials',  '📦 MATERIALS MONITORING'],
            ['issues',     '⚠️ ISSUES & SOLUTIONS'],
            ['inspection', '✅ SITE INSPECTION'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`pm-tab-btn ${activeTab === key ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="pm-cc-body">

          {/*
           * FIX: Instead of display:none/block, we use the .pm-tab-panel pattern.
           *
           * display:none removes the element from layout entirely, so when the tab
           * becomes visible the browser has never calculated the panel's width.
           * Child components that rely on their container's width for responsive
           * breakpoints (min-width media queries on fixed containers, overflow-x
           * scroll wrappers, table min-width rules, etc.) all silently break.
           *
           * The fix: keep every panel in the normal flow but use
           *   visibility: hidden  +  height: 0  +  overflow: hidden  +  pointer-events: none
           * for inactive panels.  The browser still computes layout (so responsive
           * CSS works), but the user never sees or interacts with inactive tabs.
           *
           * The active panel gets:
           *   visibility: visible  +  height: auto  +  overflow: visible
           */}

          {/* TAB 1: Installer Monitoring */}
          <div className={`pm-tab-panel${activeTab === 'installers' ? ' pm-tab-panel--active' : ''}`}>
            <InstallerMonitoring project={project} user={user} onLogSaved={() => {}} />
          </div>

          {/* TAB 2: Project Timeline */}
          <div className={`pm-tab-panel${activeTab === 'timeline' ? ' pm-tab-panel--active' : ''}`}>
            <TimelineGantt
              project={project}
              user={user}
              trackingData={timelineTrackingData}
              onSave={() => {}} />
          </div>

          {/* TAB 3: Materials Monitoring */}
          <div className={`pm-tab-panel${activeTab === 'materials' ? ' pm-tab-panel--active' : ''}`}>
            <MaterialsMonitoring
              project={project}
              user={user}
              trackingData={tracking}
              onSave={() => {}} />
          </div>

          {/* TAB 4: Issues & Solutions */}
          <div className={`pm-tab-panel${activeTab === 'issues' ? ' pm-tab-panel--active' : ''}`}>
            <div className="pm-animate-fadein">
              <h4 className="pm-title-lg">Problem Encountered & Solution Log</h4>
              <div className="pm-grid-2 mb-4">
                <div className="pm-card-red pm-no-margin">
                  <label className="pm-label pm-label-red">⚠️ Problem Encountered *</label>
                  <textarea value={issueLog.problem || ''}
                    onChange={e => setIssueLog({ ...issueLog, problem: e.target.value })}
                    className="pm-textarea" placeholder="Describe the issue..." />
                </div>
                <div className="pm-card pm-card-solution pm-no-margin">
                  <label className="pm-label pm-label-green">✅ Solution / Action Taken</label>
                  <textarea value={issueLog.solution || ''}
                    onChange={e => setIssueLog({ ...issueLog, solution: e.target.value })}
                    className="pm-textarea" placeholder="Describe the action taken..." />
                </div>
              </div>
              <PrimaryButton variant="navy" onClick={handleIssueSubmit} disabled={isSubmittingIssue}>
                {isSubmittingIssue ? 'Logging...' : '💾 Log Issue'}
              </PrimaryButton>
              {issuesHistory.length > 0 && (
                <div className="pm-history-section">
                  <h4 className="pm-title-md pm-no-margin" style={{ marginBottom: 12 }}>🕒 Issues History</h4>
                  <div className="pm-grid-1">
                    {issuesHistory.map(issue => (
                      <div key={issue.id} className="pm-card pm-no-margin">
                        <div className="pm-issue-problem-block">
                          <span className="pm-label pm-label-red">⚠️ Problem:</span>
                          <p className="pm-td-bold pm-no-margin">{issue.problem}</p>
                        </div>
                        <div>
                          <span className="pm-label pm-label-green">✅ Solution:</span>
                          <p className="pm-text-muted pm-no-margin">{issue.solution || 'No solution logged yet.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TAB 5: Site Inspection */}
          <div className={`pm-tab-panel${activeTab === 'inspection' ? ' pm-tab-panel--active' : ''}`}>
            <SiteInspectionReport project={project} user={user} onSave={() => {}} />
          </div>

          {/* Bottom Action Cards — always visible, outside tab panels */}
          <hr className="pm-section-divider" />
          <div className="pm-grid-3">
            <div className="pm-action-card" data-variant="orange">
              <h4 className="pm-action-title">Material Requisition</h4>
              <p className="pm-text-muted">Out of stock? Submit a requisition alert to Logistics.</p>
              <PrimaryButton variant="orange" onClick={() => setShowRequestModal(true)}>📦 Request Materials</PrimaryButton>
            </div>
            <div className="pm-action-card" data-variant="blue">
              <h4 className="pm-action-title">Progress Billing</h4>
              <p className="pm-text-muted">Hit a completion milestone? Notify Accounting to release payment.</p>
              <PrimaryButton variant="navy" onClick={() => onAdvance('Request Billing')}>💸 Request Billing</PrimaryButton>
            </div>
            <div className="pm-action-card" data-variant="red">
              <h4 className="pm-action-title">Construction Complete</h4>
              <p className="pm-text-muted">Physical build is done. Proceed to QC.</p>
              <PrimaryButton variant="red" onClick={() => onAdvance('Site Inspection & Quality Checking')}>✓ Initiate Final QC</PrimaryButton>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PhaseCommandCenter;