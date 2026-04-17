import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Users, Activity, ArrowRight, BarChart2, Database, Shield, Cpu, Package, AlertCircle } from 'lucide-react';
import './SuperAdminDashboard.css';

// ─── CRON PRESETS (required by DatabaseManager) ───────────────────────────────
const CRON_PRESETS = [
  { label: 'Every hour',        value: '0 * * * *'   },
  { label: 'Every 6 hours',     value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *'   },
  { label: 'Daily at 2 AM',     value: '0 2 * * *'   },
  { label: 'Weekly (Sunday)',   value: '0 0 * * 0'   },
  { label: 'Monthly (1st)',     value: '0 0 1 * *'   },
  { label: 'Custom',            value: 'custom'       },
];

// ─── STATUS BADGE (required by DatabaseManager) ───────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    success: { label: 'Success', color: '#10b981' },
    running: { label: 'Running', color: '#f59e0b' },
    failed:  { label: 'Failed',  color: '#ef4444' },
    pending: { label: 'Pending', color: '#64748b' },
  };
  const { label, color } = map[status] || map.pending;
  return (
    <span style={{
      background: `${color}18`, color, border: '1px solid',
      borderColor: `${color}30`, borderRadius: '999px',
      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
      letterSpacing: '.03em',
    }}>
      {label}
    </span>
  );
};

// ─── INLINE DATABASE MANAGER ──────────────────────────────────────────────────
const InlineDatabaseManager = () => {
  const [backups, setBackups]               = useState([]);
  const [schedules, setSchedules]           = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [activeTab, setActiveTab]           = useState('backup');
  const [isExporting, setIsExporting]       = useState(false);
  const [isImporting, setIsImporting]       = useState(false);
  const [importFile, setImportFile]         = useState(null);
  const [importProgress, setImportProgress] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm]     = useState({
    name: '', cron: '0 2 * * *', customCron: '', retention: 7, enabled: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [backupRes, scheduleRes] = await Promise.all([
        api.get('/admin/database/backups'),
        api.get('/admin/database/schedules'),
      ]);
      setBackups(backupRes.data.backups || []);
      setSchedules(scheduleRes.data.schedules || []);
    } catch (err) {
      console.error('Fetch DB data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await api.post('/admin/database/export', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `vision_backup_${new Date().toISOString().slice(0,10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await fetchData();
    } catch { alert('Export failed. Check server logs.'); }
    finally { setIsExporting(false); }
  };

  const handleManualBackup = async () => {
    if (!window.confirm('Create a manual backup now?')) return;
    try {
      setIsExporting(true);
      await api.post('/admin/database/backup');
      await fetchData();
    } catch { alert('Backup failed. Check server logs.'); }
    finally { setIsExporting(false); }
  };

  const handleImport = async () => {
    if (!importFile) { alert('Please select a .sql file.'); return; }
    if (!window.confirm('⚠️ Importing will OVERWRITE the current database. Are you absolutely sure?')) return;
    try {
      setIsImporting(true);
      setImportProgress('Uploading file...');
      const formData = new FormData();
      formData.append('sql_file', importFile);
      setImportProgress('Restoring database...');
      await api.post('/admin/database/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportProgress('Done!');
      alert('Database imported successfully!');
      setImportFile(null);
    } catch { alert('Import failed. Ensure the file is a valid .sql dump.'); }
    finally { setIsImporting(false); setImportProgress(''); }
  };

  const handleDeleteBackup = async (id, filename) => {
    if (!window.confirm(`Delete backup "${filename}"?`)) return;
    try {
      await api.delete(`/admin/database/backups/${id}`);
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch { alert('Failed to delete backup.'); }
  };

  const handleDownloadBackup = async (id, filename) => {
    try {
      const res = await api.get(`/admin/database/backups/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Download failed.'); }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    const cronValue = scheduleForm.cron === 'custom' ? scheduleForm.customCron : scheduleForm.cron;
    try {
      await api.post('/admin/database/schedules', { ...scheduleForm, cron: cronValue });
      await fetchData();
      setShowScheduleForm(false);
      setScheduleForm({ name: '', cron: '0 2 * * *', customCron: '', retention: 7, enabled: true });
    } catch { alert('Failed to save schedule.'); }
  };

  const handleToggleSchedule = async (id, enabled) => {
    try {
      await api.patch(`/admin/database/schedules/${id}`, { enabled: !enabled });
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
    } catch { alert('Failed to toggle schedule.'); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Remove this schedule?')) return;
    try {
      await api.delete(`/admin/database/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch { alert('Failed to delete schedule.'); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : '—';

  const DB_TABS = [
    { key: 'backup',   icon: '🗄️', label: 'Backup & Export'  },
    { key: 'import',   icon: '📥', label: 'Import / Restore' },
    { key: 'schedule', icon: '🕐', label: 'Schedules'        },
  ];

  return (
    <div className="sa-db-inner">
      <div className="sa-db-action-bar">
        <button className="sa-db-btn-outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? '↻ Exporting…' : '⬇ Export .sql'}
        </button>
        <button className="sa-db-btn-solid" onClick={handleManualBackup} disabled={isExporting}>
          {isExporting ? '↻ Backing up…' : '+ Manual Backup'}
        </button>
      </div>

      <div className="sa-db-tab-nav">
        {DB_TABS.map(t => (
          <button
            key={t.key}
            className={`sa-db-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="sa-db-loader"><div className="sa-spinner" /></div>
      ) : (
        <>
          {/* ── BACKUP TAB ── */}
          {activeTab === 'backup' && (
            <div>
              {backups.length === 0 ? (
                <div className="sa-db-empty">
                  <span>🗄️</span>
                  <p>No backups yet. Hit <strong>+ Manual Backup</strong> to create one.</p>
                </div>
              ) : (
                <div className="sa-db-list">
                  <div className="sa-db-list-header">
                    <span><span className="sa-red-dot">●</span> Backups</span>
                    <span className="sa-db-count">{backups.length}</span>
                  </div>
                  {backups.map(b => (
                    <div className="sa-db-row" key={b.id}>
                      <div className="sa-db-row-info">
                        <span className="sa-db-row-title">{b.filename}</span>
                        <span className="sa-db-row-sub">{formatSize(b.size)} · {formatDate(b.created_at)}</span>
                      </div>
                      <div className="sa-db-row-badges">
                        <span className={`sa-db-type-badge ${b.type}`}>{b.type}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="sa-db-row-actions">
                        <button className="sa-db-act blue" onClick={() => handleDownloadBackup(b.id, b.filename)}>Download</button>
                        <button className="sa-db-act red"  onClick={() => handleDeleteBackup(b.id, b.filename)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <div>
              <div className="sa-db-warning">
                <span>⚠️</span>
                <div>
                  <strong>Danger Zone</strong>
                  <p>Importing a .sql file will <strong>completely replace</strong> your current database. This action cannot be undone.</p>
                </div>
              </div>
              <div className="sa-db-import-card">
                <h3>Restore from SQL Dump</h3>
                <p>Upload a .sql file generated by mysqldump to restore your database.</p>
                <div className="sa-db-file-drop" onClick={() => document.getElementById('sa-sql-file-input').click()}>
                  {importFile ? (
                    <div className="sa-db-file-selected">
                      <span>📄</span>
                      <div>
                        <p className="sa-db-file-name">{importFile.name}</p>
                        <p className="sa-db-file-size">{formatSize(importFile.size)}</p>
                      </div>
                      <button className="sa-db-file-clear" onClick={e => { e.stopPropagation(); setImportFile(null); }}>×</button>
                    </div>
                  ) : (
                    <div className="sa-db-file-placeholder">
                      <span style={{ fontSize: '1.8rem' }}>📁</span>
                      <p>Click to select a <strong>.sql</strong> file</p>
                      <p className="sa-db-file-hint">or drag and drop here</p>
                    </div>
                  )}
                  <input id="sa-sql-file-input" type="file" accept=".sql" style={{ display: 'none' }} onChange={e => setImportFile(e.target.files[0])} />
                </div>
                {importProgress && (
                  <div className="sa-db-import-progress">
                    <div className="sa-db-prog-bar"><div className="sa-db-prog-fill" /></div>
                    <span>{importProgress}</span>
                  </div>
                )}
                <button className="sa-db-btn-restore" onClick={handleImport} disabled={!importFile || isImporting}>
                  {isImporting ? '↻ Restoring Database…' : '⚡ Restore Database'}
                </button>
              </div>
            </div>
          )}

          {/* ── SCHEDULE TAB ── */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                <button className="sa-db-btn-solid" onClick={() => setShowScheduleForm(!showScheduleForm)}>
                  {showScheduleForm ? '× Cancel' : '+ Add Schedule'}
                </button>
              </div>
              {showScheduleForm && (
                <form className="sa-db-sched-form" onSubmit={handleSaveSchedule}>
                  <h4>New Backup Schedule</h4>
                  <div className="sa-db-form-row">
                    <div className="sa-db-field full">
                      <label>Schedule Name</label>
                      <input type="text" value={scheduleForm.name}
                        onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Nightly Production Backup" required />
                    </div>
                    <div className="sa-db-field half">
                      <label>Frequency</label>
                      <select value={scheduleForm.cron}
                        onChange={e => setScheduleForm(p => ({ ...p, cron: e.target.value }))}>
                        {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    {scheduleForm.cron === 'custom' && (
                      <div className="sa-db-field half">
                        <label>Custom Cron Expression</label>
                        <input type="text" value={scheduleForm.customCron}
                          onChange={e => setScheduleForm(p => ({ ...p, customCron: e.target.value }))}
                          placeholder="0 3 * * *" required />
                      </div>
                    )}
                    <div className="sa-db-field half">
                      <label>Retention (days)</label>
                      <input type="number" min="1" max="365" value={scheduleForm.retention}
                        onChange={e => setScheduleForm(p => ({ ...p, retention: parseInt(e.target.value) }))} />
                    </div>
                    <div className="sa-db-field half sa-db-toggle-field">
                      <label>Enable on Save</label>
                      <div className="sa-db-toggle-wrap">
                        <button type="button" className={`sa-db-toggle ${scheduleForm.enabled ? 'on' : ''}`}
                          onClick={() => setScheduleForm(p => ({ ...p, enabled: !p.enabled }))}>
                          <span className="sa-db-toggle-knob" />
                        </button>
                        <span>{scheduleForm.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="sa-db-form-foot">
                    <button type="button" className="sa-db-btn-ghost" onClick={() => setShowScheduleForm(false)}>Cancel</button>
                    <button type="submit" className="sa-db-btn-solid">Save Schedule</button>
                  </div>
                </form>
              )}
              {schedules.length === 0 && !showScheduleForm ? (
                <div className="sa-db-empty">
                  <span>🕐</span>
                  <p>No schedules configured. Add one to automate your backups.</p>
                </div>
              ) : (
                <div className="sa-db-sched-list">
                  {schedules.map(s => (
                    <div key={s.id} className={`sa-db-sched-card ${s.enabled ? 'enabled' : 'disabled'}`}>
                      <div>
                        <div className="sa-db-sched-name">{s.name}</div>
                        <div className="sa-db-sched-meta">
                          <code>{s.cron}</code><span>·</span>
                          <span>Retain {s.retention}d</span>
                          {s.next_run && <><span>·</span><span>Next: {formatDate(s.next_run)}</span></>}
                          {s.last_run && <><span>·</span><span>Last: {formatDate(s.last_run)}</span></>}
                        </div>
                      </div>
                      <div className="sa-db-sched-right">
                        <button type="button" className={`sa-db-toggle ${s.enabled ? 'on' : ''}`}
                          onClick={() => handleToggleSchedule(s.id, s.enabled)}>
                          <span className="sa-db-toggle-knob" />
                        </button>
                        <button className="sa-db-act red" onClick={() => handleDeleteSchedule(s.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const SuperAdminDashboard = ({ user }) => {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock]   = useState(new Date());
  
  // New States for requested KPI Cards
  const [totalBackups, setTotalBackups] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [fetchedTotalUsers, setFetchedTotalUsers] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Dashboard Stats
        try {
          const statsRes = await api.get('/admin/dashboard-stats');
          setStats(statsRes.data);
        } catch (err) { console.error('Stats fetch error:', err); }

        // 2. Fetch Backups for KPI Card
        try {
          const backupsRes = await api.get('/admin/database/backups');
          setTotalBackups(backupsRes.data.backups?.length || 0);
        } catch (err) { console.error('Backups fetch error:', err); }

        // 3. Fetch System Logs for Errors KPI Card
        try {
          const logsRes = await api.get('/admin/system-logs');
          const logs = logsRes.data.logs || [];
          const errorCount = logs.filter(log => 
            log.includes('local.ERROR') || log.includes('Stack trace:') || log.includes('Exception')
          ).length;
          setTotalErrors(errorCount);
        } catch (err) { console.error('Logs fetch error:', err); }

        // 4. Fetch Users count directly
        try {
          const usersRes = await api.get('/admin/users');
          setFetchedTotalUsers(usersRes.data.length);
        } catch (err) { console.error('Users fetch error:', err); }

      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner"></div>
        <p>Booting Command Center…</p>
      </div>
    );
  }

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const deptCounts = stats?.department_counts ?? {};
  const salesCount       = deptCounts.sales       ?? 0;
  const engineeringCount = deptCounts.engineering  ?? 0;
  const logisticsCount   = deptCounts.logistics    ?? 0;
  
  // Uses fetched users if available, otherwise falls back to stats
  const totalUsersToDisplay = fetchedTotalUsers !== null ? fetchedTotalUsers : (stats?.total_users ?? 0);

  const DEPARTMENTS = [
    { name: 'Sales',                 count: salesCount,       color: '#497B97', icon: <Shield size={14} /> },
    { name: 'Engineering & Ops',     count: engineeringCount, color: '#d97706', icon: <Cpu size={14} /> },
    { name: 'Logistics & Inventory', count: logisticsCount,   color: '#10b981', icon: <Package size={14} /> },
  ];

  const maxDeptCount = Math.max(1, ...DEPARTMENTS.map(d => d.count));

  return (
    <div className="sa-wrapper">

      {/* ─── HEADER ─── */}
      <div className="sa-header">
        <div className="sa-header-left">
          <div className="sa-header-icon">
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 className="sa-title">Command Center</h1>
            <p className="sa-subtitle">Welcome back, {user?.name}. Here is your system overview.</p>
          </div>
        </div>
        <div className="sa-header-right">
          <div className="sa-live-badge">
            <span className="sa-live-dot"></span> Live
          </div>
          <span className="sa-clock">⟳ {fmtTime(clock)}</span>
        </div>
      </div>

      {/* ─── TOP ROW: MULTIPLE KPIs ─── */}
      <div className="sa-kpi-grid">
        
        {/* Total Users Card */}
        <div className="sa-kpi-card" style={{ '--kpi-accent': '#497B97' }}>
          <div className="sa-kpi-icon" style={{ background: '#EAF1F6', color: '#497B97' }}>
            <Users size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalUsersToDisplay}</h3>
            <p>Total Employees</p>
            <p className="sa-kpi-note">Registered user accounts</p>
          </div>
        </div>

        {/* Total Database Backups Card */}
        <div className="sa-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="sa-kpi-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Database size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalBackups}</h3>
            <p>Database Backups</p>
            <p className="sa-kpi-note">Available restore points</p>
          </div>
        </div>

        {/* System Diagnostics Errors Card */}
        <div className="sa-kpi-card" style={{ '--kpi-accent': '#ef4444' }}>
          <div className="sa-kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalErrors}</h3>
            <p>System Errors</p>
            <p className="sa-kpi-note">Captured in diagnostics log</p>
          </div>
        </div>

      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="sa-main-grid">

        {/* 1. DEPARTMENT HEADCOUNT */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>👥 Department Headcount</h2>
              <p>Users registered per department</p>
            </div>
          </div>
          <div className="sa-dept-section">
            {DEPARTMENTS.map((dept) => (
              <div key={dept.name} className="sa-dept-row">
                <div className="sa-dept-info">
                  <div className="sa-dept-label">
                    <span className="sa-dept-dot" style={{ background: dept.color }} />
                    <span className="sa-dept-name">{dept.name}</span>
                  </div>
                  <span className="sa-dept-count">{dept.count} <span className="sa-dept-unit">users</span></span>
                </div>
                <div className="sa-progress-bar">
                  <div
                    className="sa-progress-fill"
                    style={{
                      width: `${Math.max(3, (dept.count / maxDeptCount) * 100)}%`,
                      backgroundColor: dept.color,
                    }}
                  />
                </div>
                <div className="sa-dept-pct">
                  {totalUsersToDisplay > 0 ? Math.round((dept.count / totalUsersToDisplay) * 100) : 0}% of workforce
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. LIVE SYSTEM FEED */}
        <div className="sa-panel sa-feed-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>⚡ Live System Feed</h2>
              <p>Most recent actions across the company</p>
            </div>
          </div>
          <div className="sa-activity-feed">
            {!stats?.recent_activities?.length ? (
              <p className="sa-no-data">No recent activity.</p>
            ) : (
              stats.recent_activities.map((act, index) => (
                <div key={index} className="sa-feed-item">
                  <div className="sa-feed-icon"><Activity size={13} /></div>
                  <div className="sa-feed-content">
                    <p className="sa-feed-desc">
                      <strong>{act.user_name}</strong> {act.description.toLowerCase()}
                    </p>
                    <span className="sa-feed-time">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {act.module}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="sa-panel-footer">
            <button className="sa-btn-link">
              View Full Audit Log <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 3. DATABASE MANAGER — full width */}
        <div className="sa-panel sa-panel--full">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2><Database size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Database Manager</h2>
              <p>Backups, imports, and scheduled automation</p>
            </div>
          </div>
          <InlineDatabaseManager />
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;