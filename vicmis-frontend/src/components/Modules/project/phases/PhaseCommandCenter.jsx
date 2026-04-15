import React, { useState, useMemo } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import InstallerMonitoring from './InstallerMonitoring.jsx';
import TimelineGantt from './TimelineGantt.jsx';
import MaterialsMonitoring from './MaterialsMonitoring.jsx';
import SiteInspectionReport from './SiteInspectionReport.jsx';
import '../css/PhaseCommandCenter.css';

// ─── Material Requisition Modal ───────────────────────────────────────────────
const MaterialReqModal = ({ finalBOQ, requestItems, onQtyChange, onToggle, onSubmit, onClose, submitting, requesterName }) => (
  <div className="pm-modal-overlay">
    <div className="pm-modal-content pm-modal-orange large">
      <div className="pm-modal-header">
        <h3 className="pm-title-lg pm-text-orange">📦 Material Requisition Alert</h3>
        <button onClick={onClose} className="pm-close-btn">✕</button>
      </div>

      {/* Requester info */}
      <div className="pm-requester-info">
        <span className="pm-requester-icon">👤</span>
        <div>
          <span className="pm-requester-label">Requested By</span>
          <span className="pm-requester-name">{requesterName || '—'}</span>
        </div>
      </div>

      <p className="pm-text-muted pm-modal-desc">
        Select items from the approved Final BOQ to request delivery from Logistics.
      </p>

      <div className="pm-modal-table-scroll">
        <table className="pm-table text-center">
          <thead className="pm-thead-sticky">
            <tr>
              <th className="text-left">Category</th>
              <th className="text-left">Product Code</th>
              <th>Unit</th>
              <th>Unit Cost (₱)</th>
              <th>Needed Qty</th>
              <th>Total (₱)</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {finalBOQ.map((item, idx) => {
              const isSel    = requestItems.some(i => i.product_code === item.product_code);
              const cur      = requestItems.find(i => i.product_code === item.product_code);
              const unitCost = parseFloat(item.unitCost) || 0;
              const qty      = parseFloat(cur?.requestedQty) || 0;
              const total    = unitCost * qty;

              return (
                <tr key={idx} className={isSel ? 'pm-tr-selected' : ''}>
                  <td className="text-left">
                    <span className="pm-category-badge">{item.product_category || '—'}</span>
                  </td>
                  <td className="pm-td-bold text-left">
                    {item.product_code || '—'}
                    {item.description && item.description !== item.product_code && (
                      <div className="pm-td-sub">{item.description}</div>
                    )}
                  </td>
                  <td>{item.unit || '—'}</td>
                  <td>
                    {unitCost > 0
                      ? `₱${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="Qty"
                      min={0}
                      className={`pm-input pm-req-qty-input text-center ${isSel ? 'pm-req-qty-active' : ''}`}
                      value={cur ? cur.requestedQty : ''}
                      onChange={e => onQtyChange(item, e.target.value)}
                      disabled={!isSel}
                    />
                  </td>
                  <td className={isSel && total > 0 ? 'pm-td-total-active' : ''}>
                    {isSel && total > 0
                      ? `₱${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="pm-req-checkbox"
                      checked={isSel}
                      onChange={e => onToggle(item, e.target.checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pm-modal-actions">
        <button className="pm-btn pm-btn-outline" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <PrimaryButton variant="orange" onClick={onSubmit} disabled={submitting}>
          {submitting ? '⏳ Sending…' : '🚀 Send Request'}
        </PrimaryButton>
      </div>
    </div>
  </div>
);

// ─── Request Sent Confirmation Banner ─────────────────────────────────────────
const RequestSentBanner = ({ onDismiss }) => (
  <div className="pm-req-sent-banner">
    <span className="pm-req-sent-icon">✅</span>
    <div className="pm-req-sent-body">
      <strong>Material request sent to Logistics!</strong>
      <p className="pm-text-muted pm-req-sent-msg">
        Logistics will verify stock and schedule a delivery. You'll see new arrivals reflected in Materials Monitoring once delivered.
      </p>
    </div>
    <button className="pm-close-btn" onClick={onDismiss}>✕</button>
  </div>
);

// ─── Logistics Dispatch View ───────────────────────────────────────────────────
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

            <div className="pm-checklist-grid">
              {Object.entries({
                inventory: '📦 Pulled from Inventory',
                transport: '🚚 Transport Assigned',
                notified:  '📱 Eng Team Notified',
              }).map(([key, label]) => (
                <label key={key} className="pm-checklist-item pm-checklist-orange">
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))}
                  />
                  <span className="pm-text-orange-dark">{label}</span>
                </label>
              ))}
            </div>

            <PrimaryButton
              disabled={!ready}
              variant="orange"
              onClick={() => onAdvance('Site Inspection & Project Monitoring')}
            >
              ✓ Confirm Dispatch & Return to Engineer
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab Config ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'installers', label: '📋 Installers'  },
  { key: 'timeline',   label: '⏳ Timeline'    },
  { key: 'materials',  label: '📦 Materials'   },
  { key: 'issues',     label: '⚠️ Issues'      },
  { key: 'inspection', label: '✅ Inspection'  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const PhaseCommandCenter = ({
  project,
  cc,
  tracking,
  onAdvance,
  isLogistics,
  user,
}) => {
  const [activeTab, setActiveTab]         = useState('installers');
  const [reqSentBanner, setReqSentBanner] = useState(false);

  const { status } = project;

  const {
    requestItems,
    showRequestModal,
    setShowRequestModal,
    handleRequestQtyChange,
    handleRequestToggle,
    submitMaterialRequest,
    submittingRequest,
    issueLog,
    setIssueLog,
    issuesHistory,
    isSubmittingIssue,
    handleIssueSubmit,
  } = cc;

  const { boqData } = tracking;

  const timelineTrackingData = useMemo(() => {
    try {
      return typeof tracking?.timeline_tracking === 'string'
        ? JSON.parse(tracking.timeline_tracking)
        : (tracking?.timeline_tracking ?? {});
    } catch {
      return {};
    }
  }, [tracking?.timeline_tracking]);

  if (status === 'Request Materials Needed' && isLogistics) {
    return <LogisticsDispatch onAdvance={onAdvance} />;
  }

  const handleSubmitRequest = async () => {
    await submitMaterialRequest(user);
    setShowRequestModal(false);
    setReqSentBanner(true);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'installers':
        return (
          <InstallerMonitoring
            key="installers"
            project={project}
            user={user}
            onLogSaved={() => {}}
          />
        );

      case 'timeline':
        return (
          <TimelineGantt
            key="timeline"
            project={project}
            user={user}
            trackingData={timelineTrackingData}
            onSave={() => {}}
          />
        );

      case 'materials':
        return (
          <MaterialsMonitoring
            key="materials"
            project={project}
            user={user}
            trackingData={tracking}
            boqData={boqData}
            onSave={() => {}}
          />
        );

      case 'issues':
        return (
          <div key="issues" className="pm-animate-fadein">
            <h4 className="pm-title-lg">Problem Encountered & Solution Log</h4>
            <div className="pm-issues-grid">
              <div className="pm-card-red pm-no-margin">
                <label className="pm-label pm-label-red">⚠️ Problem Encountered *</label>
                <textarea
                  value={issueLog.problem || ''}
                  onChange={e => setIssueLog({ ...issueLog, problem: e.target.value })}
                  className="pm-textarea"
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="pm-card pm-card-solution pm-no-margin">
                <label className="pm-label pm-label-green">✅ Solution / Action Taken</label>
                <textarea
                  value={issueLog.solution || ''}
                  onChange={e => setIssueLog({ ...issueLog, solution: e.target.value })}
                  className="pm-textarea"
                  placeholder="Describe the action taken..."
                />
              </div>
            </div>

            <PrimaryButton
              variant="navy"
              onClick={handleIssueSubmit}
              disabled={isSubmittingIssue}
            >
              {isSubmittingIssue ? 'Logging...' : '💾 Log Issue'}
            </PrimaryButton>

            {issuesHistory.length > 0 && (
              <div className="pm-history-section">
                <h4 className="pm-title-md">🕒 Issues History</h4>
                {issuesHistory.map(issue => (
                  <div key={issue.id} className="pm-card pm-no-margin">
                    <p><strong>⚠️ Problem:</strong> {issue.problem}</p>
                    <p><strong>✅ Solution:</strong> {issue.solution || 'No solution yet.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'inspection':
        return (
          <SiteInspectionReport
            key="inspection"
            project={project}
            user={user}
            onSave={() => {}}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="pm-cc-wrapper">

      {/* ── Material Request Modal ── */}
      {showRequestModal && (
        <MaterialReqModal
          finalBOQ={boqData?.finalBOQ ?? []}
          requestItems={requestItems}
          onQtyChange={handleRequestQtyChange}
          onToggle={handleRequestToggle}
          onSubmit={handleSubmitRequest}
          onClose={() => setShowRequestModal(false)}
          submitting={submittingRequest}
          requesterName={user?.name || user?.username || 'Unknown'}
        />
      )}

      {/* ── Success Banner ── */}
      {reqSentBanner && (
        <RequestSentBanner onDismiss={() => setReqSentBanner(false)} />
      )}

      <div className="pm-card">
        {/* Tabs — horizontally scrollable on mobile */}
        <div className="pm-tabs-wrapper">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pm-tab-btn ${activeTab === key ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pm-cc-body">
          <div key={activeTab} className="pm-animate-fadein">
            {renderActiveTab()}
          </div>

          <hr className="pm-section-divider" />

          {/* Action cards — responsive grid */}
          <div className="pm-action-cards-grid">
            <div className="pm-action-card" data-variant="orange">
              <h4 className="pm-action-title">Material Requisition</h4>
              <p className="pm-text-muted">Out of stock? Submit requisition to Logistics.</p>
              <PrimaryButton variant="orange" onClick={() => setShowRequestModal(true)}>
                📦 Request Materials
              </PrimaryButton>
            </div>

            <div className="pm-action-card" data-variant="blue">
              <h4 className="pm-action-title">Progress Billing</h4>
              <p className="pm-text-muted">Notify Accounting for milestone billing.</p>
              <PrimaryButton variant="navy" onClick={() => onAdvance('Request Billing')}>
                💸 Request Billing
              </PrimaryButton>
            </div>

            <div className="pm-action-card" data-variant="red">
              <h4 className="pm-action-title">Construction Complete</h4>
              <p className="pm-text-muted">Proceed to final quality checking.</p>
              <PrimaryButton
                variant="red"
                onClick={() => onAdvance('Site Inspection & Quality Checking')}
              >
                ✓ Initiate Final QC
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseCommandCenter;