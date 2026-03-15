import React, { useState } from 'react';
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

  // ── Logistics Dispatch ──────────────────────────────────────────────────────
  if (status === 'Request Materials Needed' && isLogistics) {
    const [checks, setChecks] = React.useState({ inventory: false, transport: false, notified: false });
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
                  <input type="checkbox" checked={checks.inventory} onChange={e => setChecks({ ...checks, inventory: e.target.checked })} />
                  <span className="pm-text-orange-dark">📦 Pulled from Inventory</span>
                </label>
                <label className="pm-checklist-item pm-checklist-orange">
                  <input type="checkbox" checked={checks.transport} onChange={e => setChecks({ ...checks, transport: e.target.checked })} />
                  <span className="pm-text-orange-dark">🚚 Transport Assigned</span>
                </label>
                <label className="pm-checklist-item pm-checklist-orange">
                  <input type="checkbox" checked={checks.notified} onChange={e => setChecks({ ...checks, notified: e.target.checked })} />
                  <span className="pm-text-orange-dark">📱 Eng Team Notified</span>
                </label>
              </div>
              <PrimaryButton disabled={!ready} variant="orange" onClick={() => onAdvance('Site Inspection & Project Monitoring')}>
                ✓ Confirm Dispatch & Return to Engineer
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Command Center ─────────────────────────────────────────────────────
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

          {/* ── TAB 1: Installer Monitoring ── */}
          {activeTab === 'installers' && (
            <InstallerMonitoring project={project} user={user} onLogSaved={() => {}} />
          )}

          {/* ── TAB 2: Materials Monitoring ── */}
          {activeTab === 'materials' && (
            <MaterialsMonitoring
              project={project}
              user={user}
              trackingData={tracking}
              onSave={() => {}} />
          )}

          {/* ── TAB 3: Timeline + Gantt ── */}
          {activeTab === 'timeline' && (
            <TimelineGantt
              project={project}
              user={user}
              trackingData={(() => {
                try {
                  const raw = typeof tracking?.timeline_tracking === 'string'
                    ? JSON.parse(tracking.timeline_tracking)
                    : (tracking?.timeline_tracking ?? {});
                  return raw;
                } catch { return {}; }
              })()}
              onSave={() => {}} />
          )}

          {/* ── TAB 4: Issues ── */}
          {activeTab === 'issues' && (
            <div className="pm-animate-fadein">
              <h4 className="pm-title-lg">Problem Encountered & Solution Log</h4>
              <div className="pm-grid-2 mb-4">
                <div className="pm-card-red pm-no-margin">
                  <label className="pm-label pm-label-red">⚠️ Problem Encountered *</label>
                  <textarea value={issueLog.problem || ''} onChange={e => setIssueLog({ ...issueLog, problem: e.target.value })} className="pm-textarea" placeholder="Describe the issue..." />
                </div>
                <div className="pm-card pm-card-solution pm-no-margin">
                  <label className="pm-label pm-label-green">✅ Solution / Action Taken</label>
                  <textarea value={issueLog.solution || ''} onChange={e => setIssueLog({ ...issueLog, solution: e.target.value })} className="pm-textarea" placeholder="Describe the action taken..." />
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
          )}

          {/* ── TAB 5: Site Inspection ── */}
          {activeTab === 'inspection' && (
            <SiteInspectionReport project={project} user={user} onSave={() => {}} />
          )}

          {/* ── Bottom Action Cards ── */}
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
