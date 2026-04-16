import React, { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseCompleted.css';

// ─── Archive Confirmation Modal ────────────────────────────────────────────────
const ArchiveModal = ({ projectName, onConfirm, onCancel }) => (
  <div className="pc-modal-overlay">
    <div className="pc-modal">
      <div className="pc-modal-icon">📁</div>
      <h3 className="pc-modal-title">Move to Storage Vault?</h3>
      <p className="pc-modal-desc">
        <strong>{projectName}</strong> will be archived and hidden from the active
        project list. All documents remain accessible via the Master Database.
      </p>
      <div className="pc-modal-actions">
        <button className="pc-modal-cancel" onClick={onCancel}>Cancel</button>
        <button className="pc-modal-confirm" onClick={onConfirm}>
          📁 Yes, Archive Project
        </button>
      </div>
    </div>
  </div>
);

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d) ? null : d;
};

const formatCurrency = (amount) => {
  if (!amount || amount === 0) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

// ─── PANEL 1: Installer Summary ────────────────────────────────────────────────
const InstallerPanel = ({ project }) => {
  const resolveRoster = () => {
    if (project?.installer_roster && Array.isArray(project.installer_roster)) {
      return project.installer_roster;
    }
    if (project?.assignments) {
      return project.assignments
        .filter(a => ['installer','lead_installer','helper','supervisor'].includes((a.role ?? '').toLowerCase()))
        .map(a => ({ name: a.user?.name ?? a.name ?? '—', position: a.role ?? 'Installer' }));
    }
    return [];
  };

  const roster = resolveRoster();

  const positionColor = {
    'Lead Installer': '#FF1817',
    'Installer':      '#497B97',
    'Helper':         '#6b7280',
    'Supervisor':     '#C20100',
  };

  return (
    <div className="pc-panel">
      <div className="pc-panel-header" style={{ '--accent': '#497B97' }}>
        <span className="pc-panel-icon">👷</span>
        <div>
          <h4 className="pc-panel-title">Installer Team</h4>
          <p className="pc-panel-sub">{roster.length} member{roster.length !== 1 ? 's' : ''} on this project</p>
        </div>
      </div>

      <div className="pc-panel-body">
        {roster.length === 0 ? (
          <div className="pc-panel-empty">
            <span>👷</span>
            <p>No installer records found.</p>
          </div>
        ) : (
          <div className="pc-installer-list">
            {roster.map((inst, i) => (
              <div key={i} className="pc-installer-row">
                <div className="pc-installer-avatar">
                  {(inst.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="pc-installer-info">
                  <span className="pc-installer-name">{inst.name}</span>
                  <span
                    className="pc-installer-pos"
                    style={{ color: positionColor[inst.position] ?? '#6b7280' }}
                  >
                    {inst.position ?? 'Installer'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PANEL 2: Timeline Summary ─────────────────────────────────────────────
const TimelinePanel = ({ project }) => {
  const getTasks = () => {
    if (project?.timeline_tracking) {
      let tracking = project.timeline_tracking;
      if (typeof tracking === 'string') {
        try {
          tracking = JSON.parse(tracking);
        } catch (e) {
          return [];
        }
      }
      
      if (tracking?.tasks && Array.isArray(tracking.tasks)) {
        return tracking.tasks;
      }
      if (Array.isArray(tracking)) {
        return tracking;
      }
    }
    
    if (project?.timeline_tasks && Array.isArray(project.timeline_tasks)) {
      return project.timeline_tasks;
    }
    
    return [];
  };

  const tasks = getTasks();
  
  const regularTasks = tasks.filter(t => t.type !== 'group');
  
  const allStarts = regularTasks.map(t => parseDate(t.start)).filter(Boolean);
  const allEnds   = regularTasks.map(t => parseDate(t.end)).filter(Boolean);
  const projectStart = allStarts.length > 0 ? new Date(Math.min(...allStarts)) : null;
  const projectEnd   = allEnds.length   > 0 ? new Date(Math.max(...allEnds))   : null;
  const totalDays = projectStart && projectEnd
    ? Math.round((projectEnd - projectStart) / 86400000) + 1
    : 0;

  const getActualCompletionDate = (task) => {
    if (task.actualDates) {
      const completedDates = Object.entries(task.actualDates)
        .filter(([, completed]) => completed === true)
        .map(([date]) => date);
      
      if (completedDates.length > 0) {
        completedDates.sort();
        return completedDates[completedDates.length - 1];
      }
    }
    return null;
  };

  const getActualStartDate = (task) => {
    if (task.actualDates) {
      const startedDates = Object.entries(task.actualDates)
        .filter(([, completed]) => completed === true)
        .map(([date]) => date);
      
      if (startedDates.length > 0) {
        startedDates.sort();
        return startedDates[0];
      }
    }
    return null;
  };

  return (
    <div className="pc-panel">
      <div className="pc-panel-header" style={{ '--accent': '#C20100' }}>
        <span className="pc-panel-icon">📊</span>
        <div>
          <h4 className="pc-panel-title">Project Timeline</h4>
          <p className="pc-panel-sub">
            {totalDays > 0 ? `${totalDays}-day project` : 'Duration not set'}
            {projectStart && projectEnd && ` · ${fmtDate(projectStart.toISOString().slice(0,10))} → ${fmtDate(projectEnd.toISOString().slice(0,10))}`}
          </p>
        </div>
      </div>

      <div className="pc-panel-body">
        {tasks.length === 0 ? (
          <div className="pc-panel-empty">
            <span>📋</span>
            <p>No timeline tasks found.</p>
          </div>
        ) : (
          <div className="pc-task-list">
            {tasks.map((task, i) => {
              if (task.type === 'group') {
                return (
                  <div key={task.id ?? i} className="pc-task-group-label">
                    {task.name}
                  </div>
                );
              }

              const ts = parseDate(task.start);
              const te = parseDate(task.end);
              const dur = ts && te ? Math.round((te - ts) / 86400000) + 1 : 0;
              const actualStart = getActualStartDate(task);
              const actualEnd = getActualCompletionDate(task);
              const isCompleted = actualEnd !== null;

              return (
                <div key={task.id ?? i} className="pc-task-row">
                  <div className="pc-task-info">
                    <span className="pc-task-name">{task.name || '(unnamed task)'}</span>
                    <div className="pc-task-dates">
                      <div className="pc-date-row">
                        <span className="pc-date-label">Target:</span>
                        <span className="pc-date-value">
                          {ts ? fmtDate(task.start) : '—'} → {te ? fmtDate(task.end) : '—'}
                          {dur > 0 && <span className="pc-task-dur"> ({dur}d)</span>}
                        </span>
                      </div>
                      {isCompleted && (
                        <div className="pc-date-row pc-actual-row">
                          <span className="pc-date-label pc-actual-label">Actual:</span>
                          <span className="pc-date-value pc-actual-value">
                            {actualStart ? fmtDate(actualStart) : '—'} → {actualEnd ? fmtDate(actualEnd) : '—'}
                            {actualStart && actualEnd && (
                              <span className="pc-task-dur pc-actual-dur">
                                ({Math.round((new Date(actualEnd) - new Date(actualStart)) / 86400000) + 1}d)
                              </span>
                            )}
                          </span>
                          <span className="pc-completed-badge">✓ Completed</span>
                        </div>
                      )}
                      {!isCompleted && actualStart && (
                        <div className="pc-date-row pc-inprogress-row">
                          <span className="pc-date-label pc-actual-label">Actual:</span>
                          <span className="pc-date-value pc-actual-value">
                            Started: {fmtDate(actualStart)} → In Progress
                          </span>
                          <span className="pc-inprogress-badge">⟳ In Progress</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PANEL 3: Materials Summary with BOQ Grand Total ───────────────────────────
const MaterialsPanel = ({ project }) => {
  const getMaterialItems = () => {
    if (project?.material_items) {
      let items = project.material_items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          return [];
        }
      }
      if (Array.isArray(items)) {
        return items;
      }
    }
    return [];
  };

  const items = getMaterialItems();

  // Get BOQ grand total from project (actual BOQ if approved, otherwise plan BOQ)
  const getBoqGrandTotal = () => {
    // First check if there's an approved actual BOQ
    if (project?.final_boq) {
      let boq = project.final_boq;
      if (typeof boq === 'string') {
        try {
          boq = JSON.parse(boq);
        } catch (e) {
          return 0;
        }
      }
      if (Array.isArray(boq)) {
        return boq.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      }
    }
    
    // Check plan BOQ
    if (project?.plan_boq) {
      let boq = project.plan_boq;
      if (typeof boq === 'string') {
        try {
          boq = JSON.parse(boq);
        } catch (e) {
          return 0;
        }
      }
      if (Array.isArray(boq)) {
        return boq.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      }
    }
    
    return 0;
  };

  const deduped = (() => {
    const seen = new Map();
    items.forEach(item => {
      const key = `${(item.name ?? '').trim().toLowerCase()}||${(item.description ?? '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const ex = seen.get(key);
        const exDel = (ex.deliveries ?? []).reduce((s, d) => s + Number(d.qty ?? 0), 0);
        const itDel = (item.deliveries ?? []).reduce((s, d) => s + Number(d.qty ?? 0), 0);
        if (itDel > exDel) seen.set(key, item);
      }
    });
    return Array.from(seen.values());
  })();

  const totalDelivered = (item) =>
    (item.deliveries ?? []).reduce((s, d) => s + Number(d.qty ?? 0), 0);

  const totalInstalled = (item) => {
    const installed = item.installed;
    if (!installed) return 0;
    
    if (typeof installed === 'number') return installed;
    if (Array.isArray(installed)) return installed.reduce((s, v) => s + (Number(v) || 0), 0);
    if (typeof installed === 'object') {
      return Object.values(installed).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    return 0;
  };

  const grandDelivered = deduped.reduce((s, i) => s + totalDelivered(i), 0);
  const grandInstalled = deduped.reduce((s, i) => s + totalInstalled(i), 0);
  const grandRemaining = grandDelivered - grandInstalled;
  const installPct = grandDelivered > 0 ? Math.round((grandInstalled / grandDelivered) * 100) : 0;
  
  const boqTotal = getBoqGrandTotal();

  return (
    <div className="pc-panel">
      <div className="pc-panel-header" style={{ '--accent': '#221F1F' }}>
        <span className="pc-panel-icon">📦</span>
        <div>
          <h4 className="pc-panel-title">Materials Status</h4>
          <p className="pc-panel-sub">{deduped.length} material type{deduped.length !== 1 ? 's' : ''} tracked</p>
        </div>
      </div>

      {/* BOQ Grand Total Card */}
      {boqTotal > 0 && (
        <div className="pc-boq-total-card">
          <span className="pc-boq-total-label">Total Contract Value (BOQ)</span>
          <span className="pc-boq-total-value">{formatCurrency(boqTotal)}</span>
        </div>
      )}

      <div className="pc-mat-chips">
        <div className="pc-mat-chip chip-delivered">
          <span className="pc-mat-chip-val">{grandDelivered}</span>
          <span className="pc-mat-chip-label">Delivered</span>
        </div>
        <div className="pc-mat-chip chip-installed">
          <span className="pc-mat-chip-val">{grandInstalled}</span>
          <span className="pc-mat-chip-label">Installed</span>
        </div>
        <div className="pc-mat-chip chip-remaining" style={{
          borderColor: grandRemaining <= 0 ? '#16a34a' : grandRemaining < 10 ? '#ea580c' : '#C20100',
        }}>
          <span className="pc-mat-chip-val" style={{
            color: grandRemaining <= 0 ? '#16a34a' : grandRemaining < 10 ? '#ea580c' : '#C20100',
          }}>{grandRemaining}</span>
          <span className="pc-mat-chip-label">Remaining</span>
        </div>
      </div>

      <div className="pc-progress-bar-wrap" style={{ padding: '0 16px 4px' }}>
        <div className="pc-progress-bar-track">
          <div
            className="pc-progress-bar-fill"
            style={{
              width: `${installPct}%`,
              background: installPct >= 100 ? '#16a34a' : 'linear-gradient(90deg, #497B97, #6da0bc)',
            }}
          />
        </div>
        <span className="pc-progress-label">Install Rate</span>
      </div>

      <div className="pc-panel-body">
        {deduped.length === 0 ? (
          <div className="pc-panel-empty">
            <span>📦</span>
            <p>No materials recorded yet.</p>
          </div>
        ) : (
          <div className="pc-mat-table-wrap">
            <table className="pc-mat-table">
              <thead>
                <tr>
                  <th className="th-left">Material</th>
                  <th>Delivered</th>
                  <th>Installed</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {deduped.map((item, i) => {
                  const del  = totalDelivered(item);
                  const inst = totalInstalled(item);
                  const rem  = del - inst;
                  return (
                    <tr key={item.id ?? i}>
                      <td className="td-left">
                        <div className="pc-mat-name">{item.name || '(unnamed)'}</div>
                        {item.description && (
                          <div className="pc-mat-desc">{item.description}</div>
                        )}
                      </td>
                      <td className="td-center">{del}</td>
                      <td className="td-center td-blue">{inst}</td>
                      <td className={`td-center td-bold ${rem <= 0 ? 'td-green' : rem < 10 ? 'td-orange' : 'td-red'}`}>
                        {rem}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const PhaseCompleted = ({ project, onAdvance }) => {
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const contractAmount = parseFloat(project.contract_amount || 0)
    .toLocaleString(undefined, { minimumFractionDigits: 2 });

  const handleArchiveConfirm = () => {
    setShowArchiveModal(false);
    onAdvance('Archived');
  };

  return (
    <div className="pc-wrapper">

      {showArchiveModal && (
        <ArchiveModal
          projectName={project.project_name}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setShowArchiveModal(false)}
        />
      )}

      <div className="pc-hero">
        <div className="pc-hero-inner">
          <div className="pc-hero-left">
            <p className="pc-hero-eyebrow">
              <span>✦</span> Vision International Construction OPC
            </p>
            <h2 className="pc-hero-title">
              Project Finalized <span>🏆</span>
            </h2>
            <p className="pc-hero-project">{project.project_name}</p>
          </div>
          <div className="pc-hero-right">
            <div className="pc-status-pill">
              <span className="pc-status-dot" />
              Completed
            </div>
          </div>
        </div>

        <div className="pc-hero-stats">
          <div className="pc-hero-stat-divider" />
          <div className="pc-hero-stat">
            <span className="pc-hero-stat-val">{project.client_name || '—'}</span>
            <span className="pc-hero-stat-label">Client</span>
          </div>
          <div className="pc-hero-stat-divider" />
          <div className="pc-hero-stat">
            <span className="pc-hero-stat-val">{project.location || '—'}</span>
            <span className="pc-hero-stat-label">Location</span>
          </div>
          <div className="pc-hero-stat-divider" />
          <div className="pc-hero-stat">
            <span className="pc-hero-stat-val">{project.project_type || '—'}</span>
            <span className="pc-hero-stat-label">Project Type</span>
          </div>
        </div>
      </div>

      <div className="pc-section-label">
        <span className="pc-section-line" />
        <span className="pc-section-text">Project Summary</span>
        <span className="pc-section-line" />
      </div>

      <div className="pc-panels-grid">
        <InstallerPanel project={project} />
        <TimelinePanel  project={project} />
        <MaterialsPanel project={project} />
      </div>

      {project.status !== 'Archived' && (
        <div className="pc-archive-card no-print">
          <div className="pc-archive-left">
            <h4 className="pc-archive-title">Final File Closure</h4>
            <p className="pc-archive-desc">
              Archiving moves this project to permanent storage. It will be hidden from
              the active list but all records remain accessible via the Master Database.
            </p>
          </div>
          <PrimaryButton variant="navy" onClick={() => setShowArchiveModal(true)}>
            📁 Move to Storage Vault
          </PrimaryButton>
        </div>
      )}

    </div>
  );
};

export default PhaseCompleted;