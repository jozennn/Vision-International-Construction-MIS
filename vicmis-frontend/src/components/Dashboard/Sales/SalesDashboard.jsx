import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/api/axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { RefreshCw, TrendingUp, Briefcase, Clock, Award, ChevronRight, ShieldCheck, Download } from 'lucide-react';
import './SalesDashboard.css';

// ─── Status → CSS class ───────────────────────────────────────────────────────
const statusClass = (status = '') => {
  const s = (status || '').toLowerCase();
  // 👇 UPDATED: Added 'trash' to trigger the red rejected styling
  if (s.includes('trash') || s.includes('reject') || s.includes('lost')) return 'rejected';
  if (s.includes('project') && s.includes('created')) return 'project-created';
  if (s.includes('converted'))                        return 'project-created';
  if (s.includes('to be contacted') || s.includes('new')) return 'to-be-contacted';
  if (s.includes('pending') || s.includes('review')) return 'pending';
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
  const isManagement = ['super_admin', 'admin', 'manager', 'dept_head'].includes(user?.role);

  const [stats,        setStats]        = useState(null);
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastSync,     setLastSync]     = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isExporting,  setIsExporting]  = useState(false);

  const { toasts, toast, removeToast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/sales/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('[Sales] stats:', err?.response?.status, err?.message);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const [activeRes, trashedRes] = await Promise.all([
        api.get('/leads'),
        api.get('/leads/trashed').catch(() => ({ data: [] }))
      ]);

      const activeRows = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data ?? []);
      const trashedRows = Array.isArray(trashedRes.data) ? trashedRes.data : (trashedRes.data?.data ?? []);

      const taggedTrashed = trashedRows.map(lead => ({
        ...lead,
        is_trashed: true,
        status: lead.status + ' (Trashed)'
      }));

      const combinedRows = [...activeRows, ...taggedTrashed];
      combinedRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setLeads(combinedRows);
    } catch (err) {
      console.error('[Sales] leads:', err?.message);
      toast.error('Failed to load leads.');
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


  // ── MONTHLY GRAPH DATA CALCULATOR (With Trashed Logic) ───────────────────
  const monthlyData = useMemo(() => {
    const monthsObj = {};
    for (let i = -2; i <= 2; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`; 
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      monthsObj[monthKey] = { key: monthKey, name: monthName, total: 0, converted: 0, rejected: 0 };
    }

    leads.forEach(lead => {
      if (!lead.created_at) return;
      const d = new Date(lead.created_at);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      
      if (monthsObj[monthKey]) {
        monthsObj[monthKey].total += 1;
        const status = (lead.status || '').toLowerCase();
        
        if (lead.is_trashed || status.includes('reject') || status.includes('lost')) {
          monthsObj[monthKey].rejected += 1;
        } else if ((status.includes('project') && status.includes('created')) || status.includes('won')) {
          monthsObj[monthKey].converted += 1;
        }
      }
    });
    
    return Object.values(monthsObj);
  }, [leads]);

  const maxMonthlyVal = Math.max(1, ...monthlyData.flatMap(m => [m.total, m.converted, m.rejected]));
  const yAxisLabels = [
    maxMonthlyVal,
    Math.round(maxMonthlyVal * 0.75),
    Math.round(maxMonthlyVal * 0.5),
    Math.round(maxMonthlyVal * 0.25),
    0
  ];

  // ── EXPORT FUNCTION ───────────────────────────────────────────────────
  const exportTrendToExcel = async () => {
    if (monthlyData.length === 0) {
      return toast.info("No trend data available to export.");
    }
    
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('6-Month Sales Trend');

      sheet.columns = [
        { header: 'MONTH', key: 'month', width: 20 },
        { header: 'TOTAL LEADS', key: 'total', width: 18 },
        { header: 'PROJECTS CREATED', key: 'converted', width: 22 },
        { header: 'LOST / TRASHED', key: 'rejected', width: 20 },
      ];

      monthlyData.forEach(data => {
        sheet.addRow({
          month: data.name,
          total: data.total,
          converted: data.converted,
          rejected: data.rejected
        });
      });

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (row.number > 1) cell.alignment = { vertical: 'middle', horizontal: 'center' }; 
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Sales_Trend_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Trend report downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel report.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── DYNAMIC STATS CALCULATOR ──────────────────────────────────────────
  const totalLeads = leads.length;
  const activeLeadsCount = leads.filter(lead => !lead.is_trashed).length;
  const trashedLeadsCount = leads.filter(lead => lead.is_trashed).length;

  const converted = leads.filter(lead => {
    if (lead.is_trashed) return false;
    const status = (lead.status || '').toLowerCase();
    return (status.includes('project') && status.includes('created')) || status.includes('won');
  }).length;

  const pendingAppr = leads.filter(lead => {
    if (lead.is_trashed) return false;
    const status = (lead.status || '').toLowerCase();
    return status.includes('pending') || status.includes('review');
  }).length;

  const winRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) + '%' : '0%';

  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = leads.filter(l => {
      if (stage.key === 'rejected' && l.is_trashed) return true;
      if (l.is_trashed) return false;
      
      const cls = statusClass(l.status);
      return cls === stage.key.replace(/_/g, '-') ||
             (stage.key === 'to_be_contacted' && cls === 'to-be-contacted') ||
             (stage.key === 'project_created' && cls === 'project-created');
    }).length;
    return acc;
  }, {});
  const maxPipeline = Math.max(1, ...Object.values(pipelineCounts));

  return (
    <div className="sd-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
                <span className="sd-stat-sub" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span><span style={{ color: '#10b981', fontWeight: 'bold' }}>{activeLeadsCount}</span> Active</span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>{trashedLeadsCount}</span> Trashed</span>
                </span>
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

          <div className="sd-main-grid">

            {/* ── Recent Leads ──── */}
            <div className="sd-card sd-card-span-2">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">📋 Recent Leads</p>
                  <p className="sd-card-sub">Latest {isManagement ? 'team' : 'personal'} pipeline activity</p>
                </div>
              </div>
              <div className="sd-table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="sd-table">
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
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

            {/* ── Monthly Trend Graph (Pure CSS) ─────────────────────── */}
            <div className="sd-card">
              <div className="sd-card-head sd-flex-between">
                <div>
                  <p className="sd-card-title">📉 {isManagement ? 'Team 6-Month Trend' : 'My 6-Month Trend'}</p>
                  <p className="sd-card-sub">{isManagement ? 'Team monthly performance overview' : 'Your monthly performance overview'}</p>
                </div>
                <button 
                  className="sd-export-btn" 
                  onClick={exportTrendToExcel}
                  disabled={isExporting}
                >
                  <Download size={14} /> 
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
              
              <div className="sd-vertical-graph-container">
                <div className="sd-graph-legend">
                  <span className="sd-legend-item"><div className="sd-legend-color" style={{background: '#3b82f6'}}></div> Leads</span>
                  <span className="sd-legend-item"><div className="sd-legend-color" style={{background: '#10b981'}}></div> Projects</span>
                  <span className="sd-legend-item"><div className="sd-legend-color" style={{background: '#ef4444'}}></div> Lost</span>
                </div>

                <div className="sd-graph-y-axis">
                  {yAxisLabels.map((val, i) => (
                    <span key={i}>{val}</span>
                  ))}
                </div>

                <div className="sd-graph-axes">
                  {[4, 3, 2, 1, 0].map(num => (
                    <div key={num} className="sd-axis-line"></div>
                  ))}
                </div>
                
                <div className="sd-graph-bars">
                  {monthlyData.map(data => (
                    <div key={data.key} className="sd-month-group">
                      <div className="sd-month-bars">
                        <div 
                          className="sd-month-bar" 
                          style={{ height: `${Math.max(5, (data.total / maxMonthlyVal) * 100)}%`, background: '#3b82f6' }}
                          title={`${data.name} - Total Leads: ${data.total}`}
                        >
                          <span className="sd-graph-value">{data.total}</span>
                        </div>
                        <div 
                          className="sd-month-bar" 
                          style={{ height: `${Math.max(5, (data.converted / maxMonthlyVal) * 100)}%`, background: '#10b981' }}
                          title={`${data.name} - Projects Created: ${data.converted}`}
                        >
                          <span className="sd-graph-value">{data.converted}</span>
                        </div>
                        <div 
                          className="sd-month-bar" 
                          style={{ height: `${Math.max(5, (data.rejected / maxMonthlyVal) * 100)}%`, background: '#ef4444' }}
                          title={`${data.name} - Lost: ${data.rejected}`}
                        >
                          <span className="sd-graph-value">{data.rejected}</span>
                        </div>
                      </div>
                      <span className="sd-graph-label">{data.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Pipeline Overview ────────────────── */}
            <div className="sd-card">
              <div className="sd-card-head">
                <div>
                  <p className="sd-card-title">📈 Pipeline List</p>
                  <p className="sd-card-sub">Current distribution totals</p>
                </div>
              </div>

              {/* 👇 The redundant text list section was safely removed from here! */}

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
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} user={user} />
      )}
    </div>
  );
};

export default SalesDashboard;