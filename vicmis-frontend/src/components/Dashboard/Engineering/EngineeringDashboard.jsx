import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './EngineeringDashboard.css';

// ─── Toast System ─────────────────────────────────────────────────────────────
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return {
    toasts,
    toast: {
      success: (m) => addToast(m, 'success'),
      error:   (m) => addToast(m, 'error'),
      info:    (m) => addToast(m, 'info'),
    },
    removeToast,
  };
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
        <span className="toast-icon">
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
        </span>
        {t.message}
      </div>
    ))}
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    return (
      <div style={{
        background: '#221F1F', color: '#EBDBD6',
        borderRadius: '8px', padding: '10px 16px',
        fontSize: '13px', fontFamily: 'inherit',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        <p style={{ margin: 0, fontWeight: 700, opacity: 0.7, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: '20px' }}>
          {count} <span style={{ fontSize: '11px', opacity: 0.6 }}>completed</span>
        </p>
        {count > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#C20100', fontWeight: 700, letterSpacing: '0.05em' }}>
            ▶ CLICK BAR TO OPEN VAULT
          </p>
        )}
      </div>
    );
  }
  return null;
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ message }) => (
  <div style={{
    textAlign: 'center', padding: '60px 24px',
    border: '2px dashed #C8BDB8', borderRadius: '16px',
    background: '#FAF8F6', marginTop: '8px'
  }}>
    <span style={{ fontSize: '36px', opacity: 0.4 }}>📋</span>
    <p style={{ color: '#7A706C', fontWeight: 600, marginTop: '10px', fontSize: '13px' }}>
      {message}
    </p>
  </div>
);

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = ({ proj, onOpen, completed }) => (
  <div className={`project-task-card ${completed ? 'completed' : ''}`}>
    <div>
      <div className="card-header-flex">
        <span className="tag-id">PRJ-{proj.id}</span>
        <span className={`tag-progress ${completed ? 'finished' : ''}`}>
          {completed ? 'FINISHED' : `${proj.progress || 0}% DONE`}
        </span>
      </div>
      <h3 className="project-name-title" title={proj.name}>{proj.name}</h3>
      <p className="project-client-sub">👤 Client: {proj.client}</p>
      <div className="phase-box">
        <p className="phase-box-label">{completed ? 'Final Status' : 'Current Phase'}</p>
        <p className={`phase-box-value ${completed ? 'finished' : ''}`}>
          {completed ? (proj.status || 'COMPLETED').toUpperCase() : (proj.status || 'In Progress')}
        </p>
      </div>
    </div>
    <button
      className={`open-workspace-btn ${completed ? 'finished' : ''}`}
      onClick={() => onOpen(proj.id)}
    >
      {completed ? '📁 Open Archive' : '🚀 Open Workspace'}
    </button>
  </div>
);

// Default months for fallback data
const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

const DEFAULT_STATS = {
  total_projects: 0, 
  pending_tasks: 0, 
  project_progress: '0%',
  total_engineers: 0, 
  engineers_list: [], 
  active_projects: [],
  completed_projects: [], 
  pickup_queue: [], 
  chart_data_monthly: DEFAULT_MONTHS.map(month => ({ name: month, Completed: 0 })),
  chart_data_yearly: DEFAULT_YEARS.map(year => ({ name: String(year), Completed: 0 }))
};

// Helper function to normalize chart data
const normalizeChartData = (data, type = 'monthly') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return type === 'monthly' 
      ? DEFAULT_STATS.chart_data_monthly 
      : DEFAULT_STATS.chart_data_yearly;
  }
  
  return data.map(item => ({
    name: item.name || item.month || item.period || item.year || 'Unknown',
    Completed: Number(item.Completed || item.completed || item.count || item.value || 0)
  }));
};

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const EngineeringDashboard = ({ user }) => {
  const [showModal,        setShowModal]        = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [archivePeriod,    setArchivePeriod]    = useState(null);
  const [chartView,        setChartView]        = useState('monthly');
  const [loading,          setLoading]          = useState(true);
  const [isAssigning,      setIsAssigning]      = useState(false);
  const [isExporting,      setIsExporting]      = useState(false);
  const [stats,            setStats]            = useState(DEFAULT_STATS);
  const [taskForm,         setTaskForm]         = useState({
    project_id: '', engineer_ids: [''], dispatch_count: 1, instructions: ''
  });

  const { toasts, toast, removeToast } = useToast();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchEngineeringData();
  }, []);

  const fetchEngineeringData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/engineering/dashboard-stats');
      
      if (response.data?.LARAVEL_CRASHED) throw new Error(response.data.message);
      
      // Normalize the chart data to ensure it has the correct structure
      const normalizedData = {
        ...response.data,
        chart_data_monthly: normalizeChartData(response.data?.chart_data_monthly, 'monthly'),
        chart_data_yearly: normalizeChartData(response.data?.chart_data_yearly, 'yearly'),
        project_progress: response.data?.project_progress || '0%',
        total_projects: response.data?.total_projects || 0,
        pending_tasks: response.data?.pending_tasks || 0,
        total_engineers: response.data?.total_engineers || 0,
        engineers_list: response.data?.engineers_list || [],
        active_projects: response.data?.active_projects || [],
        completed_projects: response.data?.completed_projects || [],
        pickup_queue: response.data?.pickup_queue || []
      };
      
      setStats(normalizedData);
    } catch (error) {
      console.error('Engineering API Error:', error);
      toast.error('Failed to load dashboard data. Using default values.');
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const jumpToProject = useCallback((projectId) => {
    sessionStorage.setItem('autoOpenProjectId', String(projectId));
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Project' }));
    window.dispatchEvent(new CustomEvent('open-project', { detail: projectId }));
    setTimeout(() => {
      const activeComponent = document.querySelector('.project-module-container');
      if (!activeComponent) {
        const allElements = document.querySelectorAll('a, button, li, div, span, p');
        for (let el of allElements) {
          const text = el.textContent.trim().toLowerCase();
          if (text === 'project management' || text === 'projects' || text === 'project') {
            if (typeof el.click === 'function') el.click();
            if (el.parentElement && typeof el.parentElement.click === 'function') el.parentElement.click();
            break;
          }
        }
      }
    }, 100);
  }, []);

  const handleBarClick = useCallback((data) => {
    if (!data || !data.activePayload?.[0]) return;
    const clicked = data.activePayload[0].payload;
    if (clicked.Completed > 0) {
      setArchivePeriod(clicked.name);
      setShowSummaryModal(true);
    }
  }, []);

  const handleDispatchChange = useCallback((e) => {
    const count = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
    setTaskForm(prev => {
      const ids = prev.engineer_ids.slice(0, count);
      while (ids.length < count) ids.push('');
      return { ...prev, dispatch_count: count, engineer_ids: ids };
    });
  }, []);

  const handleEngineerChange = useCallback((index, value) => {
    setTaskForm(prev => {
      const newIds = [...prev.engineer_ids];
      newIds[index] = value;
      return { ...prev, engineer_ids: newIds };
    });
  }, []);

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskForm.project_id)                         { toast.error('Please select a project.');          return; }
    if (taskForm.engineer_ids.some(id => !id))        { toast.error('Please select all staff members.'); return; }
    if (!taskForm.instructions.trim())                { toast.error('Please enter task instructions.');   return; }
    const unique = new Set(taskForm.engineer_ids);
    if (unique.size !== taskForm.engineer_ids.length) { toast.error('Each staff member can only be assigned once.'); return; }

    try {
      setIsAssigning(true);
      await api.post('/engineering/assign-task', taskForm);
      toast.success('Team successfully assigned!');
      setTaskForm({ project_id: '', engineer_ids: [''], dispatch_count: 1, instructions: '' });
      setShowModal(false);
      fetchEngineeringData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign task.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handlePickProject = async (projectId) => {
    try {
      await api.post('/engineering/pick-project', { project_id: projectId });
      toast.success('Project claimed! It is now in your active workspace.');
      fetchEngineeringData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim project.');
    }
  };

  // ── Excel export ──────────────────────────────────────────────────────────
  const exportSummaryToExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Analytics Summary');
      sheet.columns = [{ width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }];

      sheet.mergeCells('A1:D2');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'VICMIS ANALYTICS & COMPLETION REPORT';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF221F1F' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells('A3:D3');
      const dateCell = sheet.getCell('A3');
      dateCell.value = `Date Generated: ${new Date().toLocaleDateString()}`;
      dateCell.font = { italic: true, color: { argb: 'FF64748B' } };
      dateCell.alignment = { horizontal: 'right' };
      sheet.addRow([]);

      sheet.mergeCells('A5:B5');
      sheet.getCell('A5').value = 'MONTHLY BREAKDOWN (Current Year)';
      sheet.getCell('A5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF221F1F' } };
      sheet.getCell('A5').alignment = { horizontal: 'center' };

      sheet.mergeCells('C5:D5');
      sheet.getCell('C5').value = 'YEARLY BREAKDOWN (All Time)';
      sheet.getCell('C5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF497B97' } };
      sheet.getCell('C5').alignment = { horizontal: 'center' };

      ['A6', 'B6', 'C6', 'D6'].forEach((cell, i) => {
        sheet.getCell(cell).value = ['Month', 'Projects Completed', 'Year', 'Projects Completed'][i];
        sheet.getCell(cell).font  = { bold: true, color: { argb: 'FF221F1F' } };
        sheet.getCell(cell).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBDBD6' } };
        sheet.getCell(cell).border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } } };
        sheet.getCell(cell).alignment = { horizontal: 'center' };
      });

      const maxRows = Math.max(stats.chart_data_monthly.length, stats.chart_data_yearly.length);
      for (let i = 0; i < maxRows; i++) {
        const m = stats.chart_data_monthly[i] || { name: '', Completed: '' };
        const y = stats.chart_data_yearly[i]  || { name: '', Completed: '' };
        const row = sheet.addRow([
          m.name, m.Completed !== '' ? Number(m.Completed) : '',
          y.name, y.Completed !== '' ? Number(y.Completed) : ''
        ]);
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'center' };
          cell.border = { bottom: { style: 'dotted', color: { argb: 'FFE2E8F0' } } };
        });
      }

      sheet.addRow([]);
      const totalMonthly = stats.chart_data_monthly.reduce((s, d) => s + Number(d.Completed || 0), 0);
      const totalYearly  = stats.chart_data_yearly.reduce((s, d) => s + Number(d.Completed || 0), 0);
      const totalRow = sheet.addRow(['YTD TOTAL:', totalMonthly, 'ALL-TIME TOTAL:', totalYearly]);
      totalRow.eachCell((cell, col) => {
        cell.font = { bold: true, size: 12, color: { argb: col % 2 === 0 ? 'FF16A34A' : 'FF221F1F' } };
        cell.alignment = { horizontal: col % 2 === 0 ? 'center' : 'right' };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `VICMIS_Completion_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel report exported!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Failed to generate Excel report.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentChartData = chartView === 'monthly' ? stats.chart_data_monthly : stats.chart_data_yearly;
  const chartColor       = chartView === 'monthly' ? '#C20100' : '#497B97';
  const hasChartData = currentChartData.some(item => item.Completed > 0);

  const filteredArchive = stats.completed_projects?.filter(p =>
    chartView === 'monthly'
      ? p.completion_month === archivePeriod
      : p.completion_year === archivePeriod
  ) || [];

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="dashboard-wrapper">

        {/* ── Header ── */}
        <div className="dashboard-header no-print">
          <div className="header-text">
            <h2>Engineering Command Center</h2>
            <p>Project milestones and technical resource allocation</p>
          </div>
          <button className="refresh-btn" onClick={fetchEngineeringData} disabled={loading} title="Refresh">
            {loading ? '…' : '↻'}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="stats-grid no-print">
          <div className="stat-card">
            <p className="stat-label">Total Projects</p>
            <h3 className="stat-value">{stats.total_projects}</h3>
          </div>
          <div className="stat-card task-highlight">
            <p className="stat-label">Pending Tasks</p>
            <div className="task-flex">
              <h3 className="stat-value">{stats.pending_tasks}</h3>
              {user?.role === 'dept_head' && (
                <button className="mini-assign-btn" onClick={() => setShowModal(true)}>
                  + Assign
                </button>
              )}
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-label">Active Engineers</p>
            <h3 className="stat-value">{stats.total_engineers}</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Global Progress</p>
            <h3 className="stat-value">{stats.project_progress}</h3>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="proj-card no-print" style={{ padding: '20px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '15px', marginBottom: '24px',
            borderBottom: '2px solid #E0D9D4', paddingBottom: '20px'
          }}>
            <div>
              <h3 className="proj-title-lg" style={{ margin: 0 }}>Project Completions</h3>
              {hasChartData && (
                <p style={{ fontSize: '11px', color: '#C20100', fontWeight: 700, marginTop: '5px', letterSpacing: '0.04em' }}>
                  ▶ Click any bar to open that period's project vault
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <select
                style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid #E0D9D4', fontWeight: '900', outline: 'none', background: '#FAF8F6', color: '#221F1F', cursor: 'pointer' }}
                value={chartView}
                onChange={e => setChartView(e.target.value)}
              >
                <option value="monthly">Monthly View</option>
                <option value="yearly">Yearly View</option>
              </select>
              <button className="btn-open-archives" onClick={() => { setShowSummaryModal(true); setArchivePeriod(null); }}>
                📊 All Archives
              </button>
            </div>
          </div>

          {/* ── MAIN CHART ── */}
          <div style={{ width: '100%', height: 300 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7A706C', fontWeight: 'bold' }}>
                Loading chart data…
              </div>
            ) : currentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={currentChartData}
                  margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                  onClick={handleBarClick}
                  style={{ cursor: 'default' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D9D4" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#7A706C', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#7A706C' }} 
                    allowDecimals={false} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,31,31,0.05)' }} />
                  <Bar dataKey="Completed" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {currentChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={chartColor}
                        fillOpacity={entry.Completed > 0 ? (idx === currentChartData.length - 1 ? 1 : 0.7) : 0.2}
                        style={{ cursor: entry.Completed > 0 ? 'pointer' : 'default' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7A706C', fontWeight: 'bold' }}>
                No completion data available.
              </div>
            )}
          </div>
        </div>

        {/* ── Available for Pickup ── */}
        {!loading && stats.pickup_queue?.length > 0 && (
          <div className="approval-section no-print" style={{ backgroundColor: '#FAF8F6', border: '2px dashed #497B97', marginBottom: '32px' }}>
            <div className="section-header" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '20px' }}>
              <h2 style={{ color: '#497B97' }}>📦 Available for Pickup</h2>
              <p style={{ color: '#7A706C', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
                These projects have no engineer assigned. Pick one to claim it.
              </p>
            </div>
            <div className="active-projects-grid">
              {stats.pickup_queue.map(proj => (
                <div key={proj.id} className="project-task-card" style={{ backgroundColor: '#ffffff', borderColor: '#E0D9D4' }}>
                  <div>
                    <div className="card-header-flex">
                      <span className="tag-id" style={{ backgroundColor: '#EBDBD6', color: '#221F1F' }}>PRJ-{proj.id}</span>
                      <span className="tag-progress" style={{ backgroundColor: '#fef2f2', color: '#C20100', border: '1px solid rgba(194,1,0,.2)' }}>UNCLAIMED</span>
                    </div>
                    <h3 className="project-name-title" title={proj.name}>{proj.name}</h3>
                    <p className="project-client-sub">👤 Client: {proj.client}</p>
                    <div className="phase-box" style={{ backgroundColor: '#FAF8F6' }}>
                      <p className="phase-box-label" style={{ color: '#7A706C' }}>Current Phase</p>
                      <p className="phase-box-value" style={{ color: '#221F1F' }}>{proj.status || 'Awaiting Assignment'}</p>
                    </div>
                  </div>
                  <button
                    className="open-workspace-btn"
                    style={{ backgroundColor: '#497B97', color: '#ffffff', border: 'none' }}
                    onClick={() => handlePickProject(proj.id)}
                  >
                    ✋ Claim This Project
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active Projects ── */}
        <div className="approval-section no-print">
          <div className="section-header">
            <h2>Active Project Tasks</h2>
          </div>
          {loading ? (
            <EmptyState message="Syncing live engineering tasks…" />
          ) : stats.active_projects?.length > 0 ? (
            <div className="active-projects-grid">
              {stats.active_projects.map(proj => (
                <ProjectCard key={proj.id} proj={proj} onOpen={jumpToProject} completed={false} />
              ))}
            </div>
          ) : (
            <EmptyState message="Your workspace is currently clear." />
          )}
        </div>

        {/* ══ ARCHIVE MODAL ═════════════════════════════════════════════════ */}
        {showSummaryModal && (
          <div
            className="modal-overlay no-print"
            onClick={e => e.target === e.currentTarget && setShowSummaryModal(false)}
          >
            <div className="modal-content large">
              <div className="modal-header">
                <div>
                  <h3>
                    {archivePeriod
                      ? `📁 Project Vault — ${archivePeriod}`
                      : `📊 ${chartView === 'monthly' ? 'Monthly' : 'Yearly'} Completion Archive`}
                  </h3>
                  <p>
                    {archivePeriod
                      ? `${filteredArchive.length} finalized project${filteredArchive.length !== 1 ? 's' : ''} for ${archivePeriod}`
                      : 'Select a period below or click a chart bar to open its vault.'}
                  </p>
                </div>
                <button className="close-modal" onClick={() => setShowSummaryModal(false)}>&times;</button>
              </div>

              {!archivePeriod && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <select
                      style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid #E0D9D4', fontWeight: '900', outline: 'none', background: '#FAF8F6', color: '#221F1F', cursor: 'pointer' }}
                      value={chartView}
                      onChange={e => setChartView(e.target.value)}
                    >
                      <option value="monthly">Monthly View</option>
                      <option value="yearly">Yearly View</option>
                    </select>
                  </div>

                  {/* ── Modal mini chart ── */}
                  <div style={{ width: '100%', height: 200, marginBottom: '24px' }}>
                    {currentChartData.length > 0 && (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={currentChartData}
                          margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                          onClick={(data) => {
                            if (!data?.activePayload?.[0]) return;
                            const clicked = data.activePayload[0].payload;
                            if (clicked.Completed > 0) setArchivePeriod(clicked.name);
                          }}
                          style={{ cursor: 'default' }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D9D4" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7A706C', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7A706C' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="Completed" radius={[5, 5, 0, 0]} maxBarSize={40}>
                            {currentChartData.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={chartColor}
                                fillOpacity={entry.Completed > 0 ? 0.85 : 0.2}
                                style={{ cursor: entry.Completed > 0 ? 'pointer' : 'default' }}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="archive-periods-grid">
                    {currentChartData.map((data, idx) => (
                      <div
                        key={idx}
                        onClick={() => data.Completed > 0 && setArchivePeriod(data.name)}
                        className={`period-card ${data.Completed > 0 ? 'active' : 'disabled'}`}
                      >
                        <p className="period-name">{data.name}</p>
                        <p className="period-count">{data.Completed}</p>
                        {data.Completed > 0 && (
                          <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#C20100', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Open Vault
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {archivePeriod && (
                <div style={{ paddingBottom: '4px' }}>
                  <button className="back-btn" onClick={() => setArchivePeriod(null)}>
                    ← Back to All Periods
                  </button>
                  <div>
                    {filteredArchive.length > 0 ? (
                      <div className="active-projects-grid">
                        {filteredArchive.map(proj => (
                          <ProjectCard
                            key={proj.id}
                            proj={proj}
                            completed={true}
                            onOpen={(id) => {
                              setShowSummaryModal(false);
                              jumpToProject(id);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState message={`No archived projects found for ${archivePeriod}.`} />
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowSummaryModal(false)}>Close</button>
                {!archivePeriod && (
                  <button
                    className="confirm-btn"
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={exportSummaryToExcel}
                    disabled={isExporting}
                  >
                    {isExporting ? '⏳ Generating…' : '⬇️ Export Excel Report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ ASSIGN MODAL ══════════════════════════════════════════════════ */}
        {showModal && (
          <div
            className="modal-overlay no-print"
            onClick={e => e.target === e.currentTarget && !isAssigning && setShowModal(false)}
          >
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h3>Assign Staff to Project</h3>
                  <p>Select a project and dispatch your engineering team.</p>
                </div>
                <button className="close-modal" onClick={() => setShowModal(false)} disabled={isAssigning}>&times;</button>
              </div>

              <form onSubmit={handleAssignTask}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '900', color: '#221F1F', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                    Select Active Project
                  </label>
                  <select
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E0D9D4', outline: 'none', fontWeight: '700', fontSize: '14px', background: '#FAF8F6' }}
                    value={taskForm.project_id}
                    onChange={e => setTaskForm(prev => ({ ...prev, project_id: e.target.value }))}
                    required
                  >
                    <option value="">— Choose Project —</option>
                    {[...(stats.pickup_queue || []), ...(stats.active_projects || [])].map(proj => (
                      <option key={proj.id} value={proj.id}>PRJ-{proj.id} : {proj.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '900', color: '#221F1F', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                    Staff Count <span style={{ color: '#7A706C', textTransform: 'none', fontWeight: 400 }}>(max 10)</span>
                  </label>
                  <input
                    type="number" min="1" max="10"
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E0D9D4', outline: 'none', fontWeight: '700', fontSize: '14px', background: '#FAF8F6' }}
                    value={taskForm.dispatch_count}
                    onChange={handleDispatchChange}
                  />
                </div>

                <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '10px', marginBottom: '20px' }}>
                  {taskForm.engineer_ids.map((engId, index) => {
                    const otherSelected = taskForm.engineer_ids.filter((_, i) => i !== index);
                    return (
                      <div key={index} style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontWeight: '900', color: index === 0 ? '#C20100' : '#7A706C', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                          {index === 0 ? '👑 Lead Engineer' : `🛠 Support Staff ${index}`}
                        </label>
                        <select
                          style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E0D9D4', outline: 'none', fontWeight: '700', fontSize: '14px', background: '#FAF8F6' }}
                          value={engId}
                          onChange={e => handleEngineerChange(index, e.target.value)}
                          required
                        >
                          <option value="">— Select Staff Member —</option>
                          {stats.engineers_list?.map(eng => (
                            <option key={eng.id} value={eng.id} disabled={otherSelected.includes(String(eng.id))}>
                              {eng.name}{otherSelected.includes(String(eng.id)) ? ' (already assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '900', color: '#221F1F', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                    Task Instructions
                  </label>
                  <textarea
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #E0D9D4', outline: 'none', fontWeight: '700', fontSize: '14px', background: '#FAF8F6', minHeight: '100px', resize: 'vertical' }}
                    placeholder="Specify technical requirements, scope, and objectives…"
                    value={taskForm.instructions}
                    onChange={e => setTaskForm(prev => ({ ...prev, instructions: e.target.value }))}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isAssigning}>Cancel</button>
                  <button type="submit" className="confirm-btn" disabled={isAssigning} style={{ background: '#221F1F' }}>
                    {isAssigning ? '⏳ Assigning…' : '✓ Assign Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default EngineeringDashboard;