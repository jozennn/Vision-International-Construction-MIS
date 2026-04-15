import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '@/api/axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RefreshCw, TrendingUp, Briefcase, Clock, Award,
  ChevronRight, Download, ArrowUpRight, ArrowDownRight,
  X, Filter, Target, AlertCircle,
} from 'lucide-react';
import './SalesDashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusClass = (status = '') => {
  const s = (status || '').toLowerCase();
  if (s.includes('trash') || s.includes('reject') || s.includes('lost')) return 'rejected';
  if (s.includes('project') && s.includes('created')) return 'project-created';
  if (s.includes('converted'))                        return 'project-created';
  if (s.includes('to be contacted') || s.includes('new')) return 'to-be-contacted';
  if (s.includes('pending') || s.includes('review')) return 'pending';
  if (s.includes('won') || s.includes('closed'))     return 'won';
  return 'default';
};

const CARD_FILTERS = {
  all: {
    label: 'All Leads',
    color: '#497B97',
    fn: () => true,
  },
  converted: {
    label: 'Converted Projects',
    color: '#059669',
    fn: l => {
      if (l.is_trashed) return false;
      const s = (l.status || '').toLowerCase();
      return (s.includes('project') && s.includes('created')) || s.includes('won');
    },
  },
  pending: {
    label: 'Pending Approvals',
    color: '#C20100',
    fn: l => {
      if (l.is_trashed) return false;
      const s = (l.status || '').toLowerCase();
      return s.includes('pending') || s.includes('review');
    },
  },
  winrate: {
    label: 'Active Leads',
    color: '#B45309',
    fn: l => !l.is_trashed,
  },
};

// Pipeline stages for funnel
const PIPELINE_STAGES = [
  { key: 'to be contacted', label: 'To Be Contact', color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'contacted',       label: 'Contacted',  color: '#3b82f6', bg: '#eff6ff' },
  { key: 'for presentation',label: 'Presenting', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'ready for creating project', label: 'Ready', color: '#10b981', bg: '#ecfdf5' },
];

// Monthly goal — adjust as needed
const MONTHLY_GOAL = 5;

// ── Toast ─────────────────────────────────────────────────────────────────────
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

// ── Lead Detail Modal ─────────────────────────────────────────────────────────
const LeadDetailModal = ({ lead, onClose, user }) => {
  if (!lead) return null;
  const fields = [
    ['Client',       lead.client_name  || lead.client  || '—'],
    ['Project',      lead.project_name || lead.project || '—'],
    ['Status',       lead.status || '—'],
    ['Contact No.',  lead.contact_no || '—'],
    ['Location',     lead.location || '—'],
    ['Sales Rep',    lead.sales_rep?.name || user?.name || '—'],
    ['Date Created', lead.created_at
        ? new Date(lead.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'],
    ['Notes', lead.notes || '—'],
  ];
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal">
        <div className="sd-modal-header">
          <div>
            <h2 className="sd-modal-title">Lead Details</h2>
            <p className="sd-modal-sub">{lead.client_name || lead.client} · {lead.project_name || lead.project}</p>
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

// ── #1 Pipeline Funnel Card ───────────────────────────────────────────────────
const PipelineFunnel = ({ leads }) => {
  const activeLeads = leads.filter(l => !l.is_trashed);
  const counts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: activeLeads.filter(l =>
      (l.status || '').toLowerCase().includes(stage.key)
    ).length,
  }));
  const maxCount = Math.max(1, ...counts.map(s => s.count));

  return (
    <div className="sd-funnel-wrap">
      {counts.map((stage, i) => {
        const pct = Math.max(8, (stage.count / maxCount) * 100);
        return (
          <div key={stage.key} className="sd-funnel-stage">
            <div className="sd-funnel-bar-wrap">
              <div
                className="sd-funnel-bar"
                style={{
                  width: `${pct}%`,
                  background: stage.color,
                  opacity: 0.85 - i * 0.1,
                }}
              />
              <span className="sd-funnel-count" style={{ color: stage.color }}>
                {stage.count}
              </span>
            </div>
            <span className="sd-funnel-label">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── #5 Monthly Target Progress ────────────────────────────────────────────────
const MonthlyTarget = ({ leads, goal = MONTHLY_GOAL }) => {
  const now       = new Date();
  const thisMonth = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const converted = thisMonth.filter(l => {
    const s = (l.status || '').toLowerCase();
    return (s.includes('project') && s.includes('created')) || s.includes('won');
  }).length;
  const pct     = Math.min(100, Math.round((converted / goal) * 100));
  const onTrack = pct >= 50;

  return (
    <div className="sd-target-wrap">
      <div className="sd-target-header">
        <div className="sd-target-label">
          <Target size={13} color={onTrack ? '#10b981' : '#f59e0b'} />
          Monthly Goal
        </div>
        <span className="sd-target-fraction">
          <strong>{converted}</strong> / {goal} conversions
        </span>
      </div>
      <div className="sd-target-track">
        <div
          className="sd-target-fill"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg,#10b981,#059669)'
              : onTrack
                ? 'linear-gradient(90deg,#3b82f6,#10b981)'
                : 'linear-gradient(90deg,#f59e0b,#ef4444)',
          }}
        />
        <div className="sd-target-milestones">
          {[25, 50, 75].map(m => (
            <div key={m} className="sd-target-mile" style={{ left: `${m}%` }} />
          ))}
        </div>
      </div>
      <div className="sd-target-footer">
        <span style={{ color: onTrack ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
          {pct >= 100 ? '🎉 Goal reached!' : onTrack ? `${pct}% — On track` : `${pct}% — Needs attention`}
        </span>
        <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
          {goal - converted > 0 ? `${goal - converted} more needed` : 'Target met!'}
        </span>
      </div>
    </div>
  );
};

// ── #2 Follow-ups Due Widget ──────────────────────────────────────────────────
const FollowUpsWidget = ({ leads, onView }) => {
  const DAYS = 3;
  const now  = Date.now();
  const due  = leads.filter(l => {
    if (l.is_trashed) return false;
    const s = (l.status || '').toLowerCase();
    if (s.includes('project') && s.includes('created')) return false;
    if (!l.updated_at && !l.created_at) return false;
    const last  = new Date(l.updated_at || l.created_at).getTime();
    const days  = (now - last) / (1000 * 60 * 60 * 24);
    return days >= DAYS;
  }).sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at));

  if (due.length === 0) return (
    <div className="sd-followup-empty">
      <span>✅</span> All leads followed up within {DAYS} days
    </div>
  );

  return (
    <div className="sd-followup-list">
      {due.slice(0, 4).map(lead => {
        const last = new Date(lead.updated_at || lead.created_at);
        const days = Math.floor((now - last.getTime()) / (1000 * 60 * 60 * 24));
        const urgent = days >= 7;
        return (
          <div key={lead.id} className={`sd-followup-item ${urgent ? 'urgent' : ''}`}>
            <div className="sd-followup-info">
              <span className="sd-followup-client">{lead.client_name || lead.client}</span>
              <span className="sd-followup-project">{lead.project_name || lead.project}</span>
            </div>
            <div className="sd-followup-right">
              <span className={`sd-followup-days ${urgent ? 'urgent' : ''}`}>
                {days}d ago
              </span>
              <button className="sd-details-btn" onClick={() => onView(lead)}>
                View <ChevronRight size={10} />
              </button>
            </div>
          </div>
        );
      })}
      {due.length > 4 && (
        <div className="sd-followup-more">+{due.length - 4} more need follow-up</div>
      )}
    </div>
  );
};

// ── Bar chart with tooltip ────────────────────────────────────────────────────
const ChartBar = ({ bar, data, maxVal }) => {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  return (
    <div className="sd-bar-wrap" ref={ref}>
      <div
        className="sd-bar"
        style={{ height: `${Math.max(3, (bar.val / maxVal) * 100)}%`, background: bar.color }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {bar.val > 0 && <span className="sd-bar-val-top">{bar.val}</span>}
      </div>
      {hovered && (
        <div className="sd-bar-tooltip">
          <div className="sd-tooltip-month">{data.name}</div>
          <div className="sd-tooltip-row">
            <span className="sd-tooltip-dot" style={{ background: bar.color }} />
            {bar.label}
          </div>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
const SalesDashboard = ({ user }) => {
  const isManagement = ['super_admin', 'admin', 'manager', 'dept_head'].includes(user?.role);

  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastSync,     setLastSync]     = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isExporting,  setIsExporting]  = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

  const { toasts, toast, removeToast } = useToast();

  // ── Data fetching ─────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    try {
      const [activeRes, trashedRes] = await Promise.all([
        api.get('/leads'),
        api.get('/leads/trashed').catch(() => ({ data: [] })),
      ]);
      const activeRows  = Array.isArray(activeRes.data)  ? activeRes.data  : (activeRes.data?.data  ?? []);
      const trashedRows = Array.isArray(trashedRes.data) ? trashedRes.data : (trashedRes.data?.data ?? []);
      const tagged = trashedRows.map(l => ({ ...l, is_trashed: true, status: l.status + ' (Trashed)' }));
      const all = [...activeRows, ...tagged].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setLeads(all);
    } catch (err) {
      console.error('[Sales] leads:', err?.message);
      toast.error('Failed to load leads.');
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    await fetchLeads();
    setLastSync(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [fetchLeads]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Computed values ───────────────────────────────────────────────────
  const totalLeads  = leads.length;
  const activeCount = leads.filter(l => !l.is_trashed).length;
  const trashedCount= leads.filter(l =>  l.is_trashed).length;
  const converted   = leads.filter(CARD_FILTERS.converted.fn).length;
  const pendingAppr = leads.filter(CARD_FILTERS.pending.fn).length;
  const winRate     = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  // ── #4 Win Rate vs last month comparison ─────────────────────────────
  const lastMonthWinRate = useMemo(() => {
    const now  = new Date();
    const lm   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmEnd= new Date(now.getFullYear(), now.getMonth(), 0);
    const lmLeads = leads.filter(l => {
      if (!l.created_at) return false;
      const d = new Date(l.created_at);
      return d >= lm && d <= lmEnd;
    });
    if (lmLeads.length === 0) return null;
    const lmConverted = lmLeads.filter(CARD_FILTERS.converted.fn).length;
    return Math.round((lmConverted / lmLeads.length) * 100);
  }, [leads]);

  const winRateDiff = lastMonthWinRate !== null ? winRate - lastMonthWinRate : null;

  // ── Filtered leads for table ──────────────────────────────────────────
  const displayedLeads = useMemo(() => {
    if (!activeFilter) return leads;
    return leads.filter(CARD_FILTERS[activeFilter].fn);
  }, [leads, activeFilter]);

  // ── Monthly chart data ────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const obj = {};
    for (let i = -2; i <= 2; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const key  = `${d.getFullYear()}-${d.getMonth()}`;
      const name = d.toLocaleDateString('en-US', { month: 'short' });
      obj[key] = { key, name, total: 0, converted: 0, rejected: 0 };
    }
    leads.forEach(l => {
      if (!l.created_at) return;
      const d   = new Date(l.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!obj[key]) return;
      obj[key].total += 1;
      const s = (l.status || '').toLowerCase();
      if (l.is_trashed || s.includes('reject') || s.includes('lost')) obj[key].rejected += 1;
      else if ((s.includes('project') && s.includes('created')) || s.includes('won')) obj[key].converted += 1;
    });
    return Object.values(obj);
  }, [leads]);

  const maxVal  = Math.max(1, ...monthlyData.flatMap(m => [m.total, m.converted, m.rejected]));
  const yLabels = [maxVal, Math.round(maxVal * .75), Math.round(maxVal * .5), Math.round(maxVal * .25), 0];

  // ── Card click handler ────────────────────────────────────────────────
  const handleCardClick = (filterKey) => {
    setActiveFilter(prev => prev === filterKey ? null : filterKey);
    setTimeout(() => {
      document.querySelector('.sd-card--leads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // ── Excel export ──────────────────────────────────────────────────────
  const exportTrendToExcel = async () => {
    if (monthlyData.length === 0) { toast.info('No trend data to export.'); return; }
    try {
      setIsExporting(true);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('6-Month Sales Trend');
      ws.columns = [
        { header: 'MONTH',            key: 'month',     width: 20 },
        { header: 'TOTAL LEADS',      key: 'total',     width: 18 },
        { header: 'PROJECTS CREATED', key: 'converted', width: 22 },
        { header: 'LOST / TRASHED',   key: 'rejected',  width: 20 },
      ];
      monthlyData.forEach(d => ws.addRow({ month: d.name, total: d.total, converted: d.converted, rejected: d.rejected }));
      const hr = ws.getRow(1);
      hr.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      hr.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF221F1F' } };
      hr.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.eachRow(row => row.eachCell(cell => {
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        if (row.number > 1) cell.alignment = { vertical:'middle', horizontal:'center' };
      }));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Sales_Trend_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Trend report exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="sd-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="sd-header">
        <div className="sd-header-left">
          <h1 className="sd-header-title">Sales Dashboard</h1>
        </div>
        <div className="sd-header-right">
          <div className="sd-live-pill"><span className="sd-live-dot" />Live</div>
          {lastSync && (
            <span className="sd-sync-label">
              <RefreshCw size={11} />
              {lastSync.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
          )}
          <button className={`sd-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchAll(true)} disabled={refreshing}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="sd-loading-screen"><div className="sd-spinner" /><p>Loading sales data…</p></div>
      ) : (
        <div className="sd-page-body">

          {/* ── Stat cards ─────────────────────────────────────────── */}
          <div className="sd-stats-grid">

            {/* Total Leads */}
            <button
              className={`sd-stat-card sd-stat-card--btn ${activeFilter === 'all' ? 'sd-stat-card--active' : ''}`}
              style={{ '--card-accent': '#497B97', animationDelay: '0ms' }}
              onClick={() => handleCardClick('all')}
            >
              <div className="sd-stat-icon-wrap" style={{ background: 'rgba(73,123,151,.12)' }}>
                <TrendingUp size={22} color="#497B97" />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{totalLeads}</span>
                <span className="sd-stat-label">Total Leads</span>
                <div className="sd-stat-tags">
                  <span className="sd-tag sd-tag--green">{activeCount} Active</span>
                  <span className="sd-tag sd-tag--red">{trashedCount} Trashed</span>
                </div>
              </div>
              <span className="sd-card-hint">Click to filter</span>
            </button>

            {/* Converted */}
            <button
              className={`sd-stat-card sd-stat-card--btn ${activeFilter === 'converted' ? 'sd-stat-card--active' : ''}`}
              style={{ '--card-accent': '#059669', animationDelay: '80ms' }}
              onClick={() => handleCardClick('converted')}
            >
              <div className="sd-stat-icon-wrap" style={{ background: 'rgba(5,150,105,.1)' }}>
                <Briefcase size={22} color="#059669" />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{converted}</span>
                <span className="sd-stat-label">Converted Projects</span>
                <span className="sd-stat-sub">Successfully created</span>
              </div>
              {converted > 0 && (
                <div className="sd-stat-trend sd-stat-trend--up">
                  <ArrowUpRight size={13} />{winRate}%
                </div>
              )}
              <span className="sd-card-hint">Click to filter</span>
            </button>

            {/* ── #1 Pipeline Funnel — replaces Pending Approvals ── */}
            <div
              className="sd-stat-card sd-stat-card--funnel"
              style={{ animationDelay: '160ms', flexDirection: 'column', gap: '10px' }}
            >
              <div className="sd-funnel-header">
                <div className="sd-stat-icon-wrap" style={{ background: 'rgba(99,102,241,.1)', width: 32, height: 32 }}>
                  <Filter size={16} color="#6366f1" />
                </div>
                <div>
                  <span className="sd-stat-label" style={{ color: '#6366f1' }}>Pipeline Funnel</span>
                  <span className="sd-stat-sub">{activeCount} active leads</span>
                </div>
              </div>
              <PipelineFunnel leads={leads} />
            </div>

            {/* ── #4 Win Rate with comparison ── */}
            <button
              className={`sd-stat-card sd-stat-card--btn ${activeFilter === 'winrate' ? 'sd-stat-card--active' : ''}`}
              style={{ '--card-accent': '#B45309', animationDelay: '240ms' }}
              onClick={() => handleCardClick('winrate')}
            >
              <div className="sd-stat-icon-wrap" style={{ background: 'rgba(180,83,9,.1)' }}>
                <Award size={22} color="#B45309" />
              </div>
              <div className="sd-stat-body">
                <span className="sd-stat-value">{winRate}%</span>
                <span className="sd-stat-label">Win Rate</span>
                <span className="sd-stat-sub">Active leads only</span>
                {/* Last month comparison */}
                {winRateDiff !== null && (
                  <div className={`sd-winrate-compare ${winRateDiff >= 0 ? 'up' : 'down'}`}>
                    {winRateDiff >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {winRateDiff >= 0 ? '+' : ''}{winRateDiff}% vs last month
                  </div>
                )}
              </div>
              <div className={`sd-stat-trend ${winRate >= 50 ? 'sd-stat-trend--up' : 'sd-stat-trend--down'}`}>
                {winRate >= 50 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {winRate >= 50 ? 'Good' : 'Low'}
              </div>
              <span className="sd-card-hint">Click to filter</span>
            </button>
          </div>

          {/* ── #5 Monthly Target Progress ─────────────────────────── */}
          <MonthlyTarget leads={leads} goal={MONTHLY_GOAL} />

          {/* ── Main row ───────────────────────────────────────────── */}
          <div className="sd-main-row">

            {/* Leads table */}
            <div className="sd-card sd-card--leads">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">
                    {activeFilter ? CARD_FILTERS[activeFilter].label : 'Recent Leads'}
                  </p>
                  <p className="sd-card-sub">
                    {activeFilter
                      ? `Filtered — ${displayedLeads.length} result${displayedLeads.length !== 1 ? 's' : ''}`
                      : `Latest ${isManagement ? 'team' : 'personal'} pipeline activity`}
                  </p>
                </div>
                <div className="sd-card-head-right">
                  {activeFilter && (
                    <button className="sd-clear-filter-btn" onClick={() => setActiveFilter(null)}>
                      <X size={11} /> Clear filter
                    </button>
                  )}
                  <span className="sd-count-pill">{displayedLeads.length}</span>
                </div>
              </div>

              {activeFilter && (
                <div className="sd-filter-banner" style={{ '--banner-color': CARD_FILTERS[activeFilter].color }}>
                  <Filter size={12} />
                  Showing: <strong>{CARD_FILTERS[activeFilter].label}</strong>
                  <button className="sd-filter-banner-clear" onClick={() => setActiveFilter(null)}>
                    <X size={11} /> Clear
                  </button>
                </div>
              )}

              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Client</th><th>Project</th><th>Status</th><th>Date</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLeads.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="sd-empty-cell">
                          {activeFilter ? 'No leads match this filter.' : 'No leads found.'}
                        </td>
                      </tr>
                    ) : displayedLeads.map((lead, idx) => (
                      <tr key={lead.id ?? idx}>
                        <td className="sd-client">{lead.client_name ?? lead.client ?? '—'}</td>
                        <td className="sd-project">{lead.project_name ?? lead.project ?? '—'}</td>
                        <td><span className={`sd-status ${statusClass(lead.status)}`}>{lead.status ?? '—'}</span></td>
                        <td className="sd-date">
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <button className="sd-details-btn" onClick={() => setSelectedLead(lead)}>
                            View <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── #2 Follow-ups Due ── */}
              <div className="sd-followup-section">
                <div className="sd-followup-title">
                  <AlertCircle size={13} color="#f59e0b" />
                  Follow-ups Due
                  <span className="sd-followup-badge">
                    {leads.filter(l => {
                      if (l.is_trashed) return false;
                      const s = (l.status || '').toLowerCase();
                      if (s.includes('project') && s.includes('created')) return false;
                      if (!l.updated_at && !l.created_at) return false;
                      return (Date.now() - new Date(l.updated_at || l.created_at).getTime()) / 86400000 >= 3;
                    }).length}
                  </span>
                </div>
                <FollowUpsWidget leads={leads} onView={setSelectedLead} />
              </div>
            </div>

            {/* Trend chart */}
            <div className="sd-card sd-card--chart">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">{isManagement ? 'Team 6-Month Trend' : 'My 6-Month Trend'}</p>
                  <p className="sd-card-sub">Monthly performance overview</p>
                </div>
                <button className="sd-export-btn" onClick={exportTrendToExcel} disabled={isExporting}>
                  <Download size={13} />
                  {isExporting ? 'Exporting…' : 'Export'}
                </button>
              </div>

              <div className="sd-chart-body">
                <div className="sd-chart-legend">
                  <span className="sd-leg-item"><span className="sd-leg-dot" style={{ background:'#378ADD' }} />Leads</span>
                  <span className="sd-leg-item"><span className="sd-leg-dot" style={{ background:'#10B981' }} />Projects</span>
                  <span className="sd-leg-item"><span className="sd-leg-dot" style={{ background:'#EF4444' }} />Lost</span>
                </div>

                <div className="sd-chart-inner">
                  <div className="sd-y-axis">
                    {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                  </div>
                  <div className="sd-chart-plot">
                    <div className="sd-grid-lines">
                      {[0,1,2,3,4].map(i => <div key={i} className="sd-grid-line" />)}
                    </div>
                    <div className="sd-bars-row">
                      {monthlyData.map(data => (
                        <div key={data.key} className="sd-month-col">
                          <div className="sd-bar-group">
                            {[
                              { val: data.total,     color:'#378ADD', label:`Leads: ${data.total}` },
                              { val: data.converted, color:'#10B981', label:`Projects: ${data.converted}` },
                              { val: data.rejected,  color:'#EF4444', label:`Lost: ${data.rejected}` },
                            ].map((bar, bi) => (
                              /* ── #3 Tooltip on hover ── */
                              <ChartBar key={bi} bar={bar} data={data} maxVal={maxVal} />
                            ))}
                          </div>
                          <span className="sd-month-label">{data.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} user={user} />
      )}
    </div>
  );
};

export default SalesDashboard;