import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './DatabaseManager.css';

const CRON_PRESETS = [
  { label: 'Every hour',        value: '0 * * * *'   },
  { label: 'Every 6 hours',     value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *'   },
  { label: 'Daily at 2 AM',     value: '0 2 * * *'   },
  { label: 'Weekly (Sunday)',   value: '0 0 * * 0'   },
  { label: 'Monthly (1st)',     value: '0 0 1 * *'   },
  { label: 'Custom',            value: 'custom'       },
];

const DatabaseManager = () => {
  // ALL ORIGINAL STATE PRESERVED
  const [backups, setBackups]             = useState([]);
  const [schedules, setSchedules]         = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [activeTab, setActiveTab]         = useState('backup');
  const [isExporting, setIsExporting]     = useState(false);
  const [isImporting, setIsImporting]     = useState(false);
  const [importFile, setImportFile]       = useState(null);
  const [importProgress, setImportProgress] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm]     = useState({
    name: '', cron: '0 2 * * *', customCron: '', retention: 7, enabled: true,
  });

  // ALL ORIGINAL LOGIC PRESERVED
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [backupRes, scheduleRes] = await Promise.all([
        api.get('/admin/database/backups'),
        api.get('/admin/database/schedules'),
      ]);
      setBackups(backupRes.data.backups || []);
      setSchedules(scheduleRes.data.schedules || []);
    } catch (err) { console.error('Fetch DB data error:', err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await api.post('/admin/database/export', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `vision_backup_${new Date().toISOString().slice(0,10)}.sql`;
      a.click(); URL.revokeObjectURL(url);
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
    if (!window.confirm('⚠️ Importing will OVERWRITE the current database. Are you sure?')) return;
    try {
      setIsImporting(true); setImportProgress('Uploading file...');
      const formData = new FormData(); formData.append('sql_file', importFile);
      setImportProgress('Restoring database...');
      await api.post('/admin/database/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportProgress('Done!'); alert('Database imported successfully!');
      setImportFile(null);
    } catch { alert('Import failed.'); }
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
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
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

  // NEW UI RENDER
  return (
    <div className="vdb-container">
      {/* ── TOP NAV (Image Replica) ── */}
      <nav className="vdb-nav">
        <button className="vdb-menu-btn">
          <span></span><span></span><span></span>
        </button>
        <div className="vdb-header-info">
          <h1 className="vdb-greeting">Hello, Coni</h1>
          <p className="vdb-datetime">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
            <span className="vdb-time">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="vdb-actions">
          <span className="vdb-bell">🔔</span>
          <div className="vdb-avatar">C</div>
        </div>
      </nav>

      {/* ── HERO BANNER (Image Replica) ── */}
      <div className="vdb-hero">
        <span className="vdb-badge">VISION SYSTEM</span>
        <h2 className="vdb-hero-title">
          <span>⚠️</span> System Database
        </h2>
        <p className="vdb-hero-sub">Database dumps, restores & auto-schedules</p>
      </div>

      {/* ── TABS ── */}
      <div className="vdb-tabs">
        <button className={`vdb-tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>Backups</button>
        <button className={`vdb-tab ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>Restore</button>
        <button className={`vdb-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Schedules</button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="vdb-content">
        
        {/* BACKUP TAB */}
        {activeTab === 'backup' && (
          <>
            <div className="vdb-header-flex">
              <div>
                <h3 className="vdb-section-title">Database Logs</h3>
                <p className="vdb-section-sub">{backups.length} snapshots captured</p>
              </div>
            </div>

            <button className="vdb-btn-primary" onClick={handleManualBackup} disabled={isExporting}>
              <span>↺</span> {isExporting ? 'Generating...' : 'Create Manual Backup'}
            </button>

            <div className="vdb-stats-grid">
              <div className="vdb-stat-card all">
                <span className="val">{backups.length}</span>
                <span className="lbl">All Backups</span>
              </div>
              <div className="vdb-stat-card errors">
                <span className="val">{formatSize(backups.reduce((s, b) => s + (b.size || 0), 0))}</span>
                <span className="lbl">Total Size</span>
              </div>
              <div className="vdb-stat-card warnings">
                <span className="val">{backups.filter(b => b.type === 'scheduled').length}</span>
                <span className="lbl">Auto Backups</span>
              </div>
              <div className="vdb-stat-card info">
                <span className="val">{backups.filter(b => b.type === 'manual').length}</span>
                <span className="lbl">Manual</span>
              </div>
            </div>

            <div className="vdb-search">
              <span className="vdb-search-icon">⚲</span>
              <input type="text" placeholder="Search logs..." />
            </div>

            {/* TERMINAL UI FOR BACKUPS */}
            <div className="vdb-terminal">
              <div className="vdb-term-header">
                <div className="vdb-term-dots">
                  <div className="vdb-term-dot r"></div>
                  <div className="vdb-term-dot y"></div>
                  <div className="vdb-term-dot g"></div>
                </div>
                <div className="vdb-term-title">vision-system — bash</div>
              </div>
              <div className="vdb-term-body">
                {isLoading ? (
                  <div>Loading system logs...</div>
                ) : backups.length === 0 ? (
                  <div style={{ color: '#9ca3af' }}>No backups found.</div>
                ) : (
                  backups.map((b, idx) => (
                    <div className="vdb-term-line" key={b.id}>
                      <span className="line-num">{(idx + 1).toString().padStart(4, '0')}</span>
                      <div className="vdb-term-content">
                        <span> {b.filename}</span>
                        <div className="vdb-term-meta">
                          <span className="vdb-status-badge">{b.status}</span> | Type: {b.type} | Size: {formatSize(b.size)} | Date: {formatDate(b.created_at)}
                        </div>
                        <div className="vdb-term-actions">
                          <button className="vdb-term-btn dl" onClick={() => handleDownloadBackup(b.id, b.filename)}>
                            wget --download
                          </button>
                          <button className="vdb-term-btn rm" onClick={() => handleDeleteBackup(b.id, b.filename)}>
                            rm -rf
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
          <>
            <h3 className="vdb-section-title">Restore Database</h3>
            <p className="vdb-section-sub">Upload a .sql file to overwrite current tables.</p>
            <br/>
            
            <div className="vdb-file-drop" onClick={() => document.getElementById('sql-input').click()}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</div>
              {importFile ? (
                <>
                  <h4 style={{ margin: '0 0 5px' }}>{importFile.name}</h4>
                  <p style={{ margin: 0, color: '#64748b' }}>{formatSize(importFile.size)}</p>
                </>
              ) : (
                <p style={{ margin: 0, fontWeight: 700, color: '#64748b' }}>Click or drag a .sql file here</p>
              )}
              <input 
                id="sql-input" type="file" accept=".sql" style={{ display: 'none' }}
                onChange={e => setImportFile(e.target.files[0])}
              />
            </div>

            {importProgress && <p style={{ textAlign: 'center', marginTop: '10px', color: '#DC2626', fontWeight: 700 }}>{importProgress}</p>}

            <button className="vdb-btn-primary" style={{ marginTop: '20px' }} onClick={handleImport} disabled={!importFile || isImporting}>
              <span>⚡</span> {isImporting ? 'Restoring...' : 'Execute Restore'}
            </button>
          </>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <>
            <div className="vdb-header-flex">
              <div>
                <h3 className="vdb-section-title">Automated Backups</h3>
                <p className="vdb-section-sub">Manage cron jobs</p>
              </div>
              <button className="vdb-btn-ghost" onClick={() => setShowScheduleForm(!showScheduleForm)}>
                {showScheduleForm ? 'Cancel' : '+ Add Rule'}
              </button>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleSaveSchedule} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div className="vdb-form-group">
                  <label>Rule Name</label>
                  <input className="vdb-input" value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))} placeholder="Nightly Backup" required />
                </div>
                <div className="vdb-form-group">
                  <label>Frequency (Cron)</label>
                  <select className="vdb-input" value={scheduleForm.cron} onChange={e => setScheduleForm(p => ({ ...p, cron: e.target.value }))}>
                    {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {scheduleForm.cron === 'custom' && (
                  <div className="vdb-form-group">
                    <label>Custom Cron</label>
                    <input className="vdb-input" value={scheduleForm.customCron} onChange={e => setScheduleForm(p => ({ ...p, customCron: e.target.value }))} required />
                  </div>
                )}
                <button type="submit" className="vdb-btn-primary" style={{ marginBottom: 0 }}>Save Rule</button>
              </form>
            )}

            <div>
              {schedules.map(s => (
                <div key={s.id} className="vdb-schedule-card" style={{ opacity: s.enabled ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="vdb-schedule-name">{s.name}</div>
                    <button onClick={() => handleDeleteSchedule(s.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}>Delete</button>
                  </div>
                  <div className="vdb-schedule-meta">
                    Cron: {s.cron} | Retain: {s.retention} days
                  </div>
                  <div style={{ marginTop: '10px' }}>
                     <button className="vdb-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleToggleSchedule(s.id, s.enabled)}>
                        {s.enabled ? 'Pause' : 'Enable'}
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default DatabaseManager;