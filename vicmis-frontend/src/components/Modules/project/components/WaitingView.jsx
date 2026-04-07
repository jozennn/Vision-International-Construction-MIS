import React, { useState } from 'react';
import { WAITING_MSG, PHASE_ORDER, WAITING_ONLY_PHASES } from '../projectConfig.js';

const WaitingView = ({ status, project, user, onAdvance }) => {
  const info = WAITING_MSG[status] || { dept: 'Another department', msg: 'complete their phase' };
  const [loading, setLoading] = useState(false);

  // ── Who can advance a waiting-only phase ──────────────────────────────────
  const role  = (user?.role  ?? '').toLowerCase();
  const email = (user?.email ?? '').toLowerCase();
  const canAdvance =
    role === 'admin'     ||
    role === 'manager'   ||
    role === 'dept_head' ||
    email.includes('ops') ||
    email.includes('admin');

  // Only show the advance button on phases that have no real component
  const isWaitingOnly = WAITING_ONLY_PHASES.has(status);

  const getNextStatus = () => {
    const idx = PHASE_ORDER.findIndex(p => p.status === status);
    return idx >= 0 && idx < PHASE_ORDER.length - 1
      ? PHASE_ORDER[idx + 1].status
      : null;
  };

  const handleAdvance = async () => {
    const next = getNextStatus();
    if (!next) return;
    if (!window.confirm(`Advance project from "${status}" to "${next}"?`)) return;
    setLoading(true);
    try {
      await onAdvance(next);
    } finally {
      setLoading(false);
    }
  };

  const nextStatus = getNextStatus();

  return (
    <div className="pm-waiting-wrapper">
      <div className="pm-waiting-card">
        <div className="pm-waiting-icon">⏳</div>
        <h3 className="pm-waiting-title">Waiting for {info.dept}</h3>
        <p className="pm-waiting-msg">
          This project is currently in the <strong>{status}</strong> phase.<br />
          Waiting for <strong>{info.dept}</strong> to {info.msg}.
        </p>
        <span className="pm-waiting-badge">{status}</span>
        <p className="pm-waiting-hint">
          You'll be able to act on this project once it reaches your phase.<br />
          The project summary is shown below for your reference.
        </p>

        {/* ── Advance button: only on waiting-only phases, only for heads ── */}
        {isWaitingOnly && canAdvance && nextStatus && (
          <button
            className="pm-advance-btn"
            onClick={handleAdvance}
            disabled={loading}
            style={{ marginTop: '1.25rem' }}
          >
            {loading ? 'Advancing…' : `Advance to "${nextStatus}" →`}
          </button>
        )}
      </div>

      <div className="pm-readonly-summary">
        <div className="pm-readonly-header">📋 Project Summary (Read Only)</div>
        <div className="pm-readonly-grid">
          {[
            ['Project',         project.project_name],
            ['Client',          project.client_name],
            ['Current Phase',   project.status, 'red'],
            ['Contract Amount', project.contract_amount
              ? `₱${parseFloat(project.contract_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : 'TBD'],
            project.created_by_name    && ['Created By (Sales)',  project.created_by_name],
            project.assigned_engineers && ['Assigned Engineers',  project.assigned_engineers],
          ].filter(Boolean).map(([label, value, color]) => (
            <div key={label} className="pm-readonly-item">
              <span className="pm-readonly-label">{label}</span>
              <span
                className="pm-readonly-val"
                style={color === 'red' ? { color: 'var(--pm-red)', fontWeight: 900 } : {}}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WaitingView;