import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import { RefreshCw, TrendingUp, Briefcase, Clock, Award, ChevronRight, ShieldCheck } from 'lucide-react';
import './SalesDashboard.css';

// ─── Status → CSS class ───────────────────────────────────────────────────────
const statusClass = (status = '') => {
  const s = (status || '').toLowerCase();
  if (s.includes('project') && s.includes('created')) return 'project-created';
  if (s.includes('converted'))                        return 'project-created';
  if (s.includes('to be contacted') || s.includes('new')) return 'to-be-contacted';
  if (s.includes('pending') || s.includes('review')) return 'pending';
  if (s.includes('reject') || s.includes('lost'))    return 'rejected';
  if (s.includes('won') || s.includes('closed'))     return 'won';
  return 'default';
};

// ─── Pipeline stage config ────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'to_be_contacted', label: 'To be Contacted', color: '#10B981' },
  { key: 'pending',         label: 'Pending Review',  color: '#F59E0B' },
  { key: 'project_created', label: 'Project Created', color: '#3B82F6' },
  { key: 'rejected',        label: 'Rejected / Lost', color: '#EF4444' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return {
    toasts,
    toast: { success: m => add(m, 'success'), error: m => add(m, 'error'), info: m => add(m, 'info') },
    removeToast: id => setToasts(p => p.filter(t => t.id !== id)),
  };
};

const ToastContainer = ({ toasts, onRemove }) => (
  <div className="sd-toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`sd-toast sd-toast-${t.type}`} onClick={() => onRemove(t.id)}>
        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
        {t.message}
      </div>
    ))}
  </div>
);

// ─── Lead Detail Modal ────────────────────────────────────────────────────────
const LeadDetailModal = ({ lead, onClose }) => {
  if (!lead) return null;
  const fields = [
    ['Client',       lead.client_name  || lead.client  || '—'],
    ['Project',      lead.project_name || lead.project || '—'],
    ['Status',       lead.status || '—'],
    ['Contact',      lead.contact || lead.email || '—'],
    ['Phone',        lead.phone   || '—'],
    ['Location',     lead.location || '—'],
    ['Lead Source',  lead.source   || '—'],
    ['Date Created', lead.created_at
        ? new Date(lead.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'],
    ['Notes',        lead.notes || '—'],
  ];

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal">
        <div className="sd-modal-header">
          <div>
            <h2 className="sd-modal-title">Lead Details</h2>
            <p className="sd-modal-sub">
              {lead.client_name || lead.client} · {lead.project_name || lead.project}
            </p>
          </div>
          <button className="sd-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sd-modal-body">
          {fields.map(([label, value]) => (
            <div key={label} className="sd-detail-row">
              <span className="sd-detail-label">{label}</span>
              <span className="sd-detail-value">
                {label === 'Status'
                  ? <span className={`sd-status ${statusClass(value)}`}>{value}</span>
                  : value}
              </span>
            </div>
          ))}
        </div>
        <div className="sd-modal-footer">
          <button className="sd-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
const SalesDashboard = ({ user }) => {
  const [stats,        setStats]        = useState(null);
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastSync,     setLastSync]     = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const { toasts, toast, removeToast } = useToast();

  // ── Fetch dashboard stats ─────────────────────────────────────────────────
  // Route: GET /api/sales/dashboard-stats
  // Expected response: { total_leads, converted_projects, pending_approvals, win_rate, pipeline? }
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/sales/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('[Sales] stats:', err?.response?.status, err?.message);
      toast.error('Failed to load dashboard stats.');
    }
  }, []);

  // ── Fetch recent leads ────────────────────────────────────────────────────
  // Route: GET /api/sales/leads/recent
  // Expected response: [] or { data: [] }
  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get('/sales/leads/recent');
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setLeads(rows);
    } catch (err) {
      console.error('[Sales] leads:', err?.response?.status, err?.message);
      toast.error('Failed to load recent leads.');
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else         setRefreshing(true);
    await Promise.all([fetchStats(), fetchLeads()]);
    setLastSync(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [fetchStats, fetchLeads]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Derived values — handles multiple possible API key names ─────────────
  const totalLeads  = stats?.total_leads        ?? stats?.totalLeads        ?? 0;
  const converted   = stats?.converted_projects ?? stats?.convertedProjects ?? 0;
  const pendingAppr = stats?.pending_approvals  ?? stats?.pendingApprovals  ?? 0;
  const winRate     = stats?.win_rate           ?? stats?.winRate           ?? '0%';

  // Pipeline counts — from backend if provided, else derived from leads list
  const pipelineCounts = stats?.pipeline ?? PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = leads.filter(l => {
      const cls = statusClass(l.status);
      return cls === stage.key.replace(/_/g, '-') ||
             (stage.key === 'to_be_contacted' && cls === 'to-be-contacted') ||
             (stage.key === 'project_created' && cls === 'project-created');
    }).length;
    return acc;
  }, {});

  const maxPipeline = Math.max(1, ...Object.values(pipelineCounts));

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="sd-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="sd-header">
        <div className="sd-header-left">
          <div className="sd-header-icon">📊</div>
          <div>
            <h1 className="sd-header-title">Sales Dashboard</h1>
          </div>
        </div>
        <div className="sd-header-right">
          <div className="sd-live-pill">
            <span className="sd-live-dot" />
            Live
          </div>
          {lastSync && (
            <span className="sd-sync-label">
              <RefreshCw size={11} />
              {lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className={`sd-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="sd-loading-screen">
          <div className="sd-spinner" />
          <p>Loading sales data…</p>
        </div>
      ) : (
        <>
          {/* ══ STAT CARDS ═════════════════════════════════════════════════ */}
          <div className="sd-stats-grid">
            <div className="sd-stat-card" style={{ animationDelay: '0ms' }}>
              <div className="sd-stat-icon" style={{ background: 'rgba(73,123,151,.12)', color: '#497B97' }}>
                <TrendingUp size={20} />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{totalLeads}</span>
                <span className="sd-stat-label">Total Leads</span>
                <span className="sd-stat-sub">All time</span>
              </div>
            </div>

            <div className="sd-stat-card" style={{ animationDelay: '60ms' }}>
              <div className="sd-stat-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}>
                <Briefcase size={20} />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{converted}</span>
                <span className="sd-stat-label">Converted Projects</span>
                <span className="sd-stat-sub">Projects created</span>
              </div>
            </div>

            <div className="sd-stat-card highlight" style={{ animationDelay: '120ms' }}>
              <div className="sd-stat-icon" style={{ background: 'rgba(194,1,0,.15)', color: '#EBDBD6' }}>
                <Clock size={20} />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{pendingAppr}</span>
                <span className="sd-stat-label">Pending Approvals</span>
                <span className="sd-stat-sub" style={{ color: 'rgba(235,219,214,.45)' }}>Needs attention</span>
              </div>
            </div>

            <div className="sd-stat-card" style={{ animationDelay: '180ms' }}>
              <div className="sd-stat-icon" style={{ background: 'rgba(180,83,9,.1)', color: '#B45309' }}>
                <Award size={20} />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{winRate}</span>
                <span className="sd-stat-label">Win Rate</span>
                <span className="sd-stat-sub">Conversion ratio</span>
              </div>
            </div>
          </div>

          {/* ══ BODY ═══════════════════════════════════════════════════════ */}
          <div className="sd-body">

            {/* ── Recent Leads ──────────────────────────────────────────── */}
            <div className="sd-card">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">📋 Recent Leads</p>
                  <p className="sd-card-sub">Latest client pipeline activity</p>
                </div>
              </div>
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="sd-empty-cell">No leads found.</td>
                      </tr>
                    ) : leads.map((lead, idx) => (
                      <tr key={lead.id ?? idx}>
                        <td className="sd-client">
                          {lead.client_name ?? lead.client ?? '—'}
                        </td>
                        <td className="sd-project">
                          {lead.project_name ?? lead.project ?? '—'}
                        </td>
                        <td>
                          <span className={`sd-status ${statusClass(lead.status)}`}>
                            {lead.status ?? '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <button className="sd-details-btn" onClick={() => setSelectedLead(lead)}>
                            Details <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Pipeline Overview ──────────────────────────────────────── */}
            <div className="sd-card">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">📈 Pipeline Overview</p>
                  <p className="sd-card-sub">Lead stage distribution</p>
                </div>
              </div>

              {/* Stage count rows */}
              <div className="sd-pipeline">
                {PIPELINE_STAGES.map(stage => {
                  const count = pipelineCounts[stage.key] ?? 0;
                  return (
                    <div key={stage.key} className="sd-pipeline-row">
                      <span className="sd-pipeline-label">
                        <span className="sd-pipeline-dot" style={{ background: stage.color }} />
                        {stage.label}
                      </span>
                      <span className="sd-pipeline-count">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Horizontal bar chart */}
              <div className="sd-pipeline-bar-wrap">
                {PIPELINE_STAGES.map(stage => {
                  const count = pipelineCounts[stage.key] ?? 0;
                  const pct   = Math.round((count / maxPipeline) * 100);
                  return (
                    <div key={stage.key}>
                      <div className="sd-pipeline-bar-label">
                        <span>{stage.label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="sd-bar-track">
                        <div className="sd-bar-fill" style={{ width: `${pct}%`, background: stage.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ══ FOOTER ═════════════════════════════════════════════════════ */}
          <footer className="sd-footer">
            <ShieldCheck size={13} />
            <span>
              VICMIS · Vision Brand Management ·{' '}
              {lastSync
                ? `Last synced: ${lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Syncing…'}
            </span>
          </footer>
        </>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
};

export default SalesDashboard;