import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './css/DatabaseManager.css';

const CRON_PRESETS = [
  { label: 'Every hour',        value: '0 * * * *'   },
  { label: 'Every 6 hours',     value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *'   },
  { label: 'Daily at 2 AM',     value: '0 2 * * *'   },
  { label: 'Weekly (Sunday)',   value: '0 0 * * 0'   },
  { label: 'Monthly (1st)',     value: '0 0 1 * *'   },
  { label: 'Custom',            value: 'custom'       },
];

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
      padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
    }}>
      {label}
    </span>
  );
};

const DatabaseManager = () => {
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
      a.click();
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

  const TABS = [
    { key: 'backup',   icon: '🗄️', label: 'Backup & Export'  },
    { key: 'import',   icon: '📥', label: 'Import / Restore' },
    { key: 'schedule', icon: '🕐', label: 'Schedules'        },
  ];

  return (
    <div className="vcc-module">
      <div className="vcc-module-header">
        <div>
          <h2 className="vcc-module-title">Database Manager</h2>
          <p className="vcc-module-subtitle">Backup, restore, and automate database operations</p>
        </div>
        <div className="db-quick-actions">
          <button className="vcc-btn-ghost" onClick={handleExport} disabled={isExporting}>
            {isExporting ? '↻ Exporting...' : '⬇ Export .sql'}
          </button>
          <button className="vcc-btn-primary" onClick={handleManualBackup} disabled={isExporting}>
            {isExporting ? '↻ Backing up...' : '+ Manual Backup'}
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="db-tab-nav">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`db-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="vcc-loader"><div className="vcc-spinner" /></div>
      ) : (
        <>
          {/* ── BACKUP TAB ── */}
          {activeTab === 'backup' && (
            <div>
              <div className="db-info-bar">
                <div className="db-stat">
                  <span className="db-stat-val">{backups.length}</span>
                  <span className="db-stat-lbl">Total Backups</span>
                </div>
                <div className="db-stat">
                  <span className="db-stat-val">{formatSize(backups.reduce((s, b) => s + (b.size || 0), 0))}</span>
                  <span className="db-stat-lbl">Total Size</span>
                </div>
                <div className="db-stat">
                  <span className="db-stat-val">{backups.filter(b => b.type === 'scheduled').length}</span>
                  <span className="db-stat-lbl">Auto Backups</span>
                </div>
                <div className="db-stat">
                  <span className="db-stat-val">{backups.filter(b => b.type === 'manual').length}</span>
                  <span className="db-stat-lbl">Manual Backups</span>
                </div>
              </div>

              {backups.length === 0 ? (
                <div className="vcc-empty">
                  <div className="vcc-empty-icon">🗄️</div>
                  <p>No backups yet. Create your first backup using the button above.</p>
                </div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr><th>Filename</th><th>Type</th><th>Size</th><th>Created</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {backups.map(b => (
                      <tr key={b.id}>
                        <td className="db-td-mono">{b.filename}</td>
                        <td><span className={`db-type-badge ${b.type}`}>{b.type}</span></td>
                        <td>{formatSize(b.size)}</td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatDate(b.created_at)}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td className="db-td-actions">
                          <button className="db-btn-download" onClick={() => handleDownloadBackup(b.id, b.filename)}>
                            ⬇ Download
                          </button>
                          <button className="db-btn-delete" onClick={() => handleDeleteBackup(b.id, b.filename)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <div>
              <div className="db-import-warning">
                <span className="db-warn-icon">⚠️</span>
                <div>
                  <strong>Danger Zone</strong>
                  <p>Importing a .sql file will <strong>completely replace</strong> your current database. This action cannot be undone. Always verify the file before importing.</p>
                </div>
              </div>

              <div className="db-import-card">
                <h3 className="db-import-title">Restore from SQL Dump</h3>
                <p className="db-import-sub">Upload a .sql file generated by mysqldump to restore your database.</p>

                <div className="db-file-drop" onClick={() => document.getElementById('sql-file-input').click()}>
                  {importFile ? (
                    <div className="db-file-selected">
                      <span className="db-file-icon">📄</span>
                      <div>
                        <p className="db-file-name">{importFile.name}</p>
                        <p className="db-file-size">{formatSize(importFile.size)}</p>
                      </div>
                      <button className="db-file-clear" onClick={e => { e.stopPropagation(); setImportFile(null); }}>×</button>
                    </div>
                  ) : (
                    <div className="db-file-placeholder">
                      <span style={{ fontSize: '2rem' }}>📁</span>
                      <p>Click to select a <strong>.sql</strong> file</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>or drag and drop here</p>
                    </div>
                  )}
                  <input
                    id="sql-file-input" type="file" accept=".sql"
                    style={{ display: 'none' }}
                    onChange={e => setImportFile(e.target.files[0])}
                  />
                </div>

                {importProgress && (
                  <div className="db-import-progress">
                    <div className="db-progress-bar"><div className="db-progress-fill" /></div>
                    <span>{importProgress}</span>
                  </div>
                )}

                <button
                  className="db-btn-restore"
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                >
                  {isImporting ? '↻ Restoring Database...' : '⚡ Restore Database'}
                </button>
              </div>
            </div>
          )}

          {/* ── SCHEDULE TAB ── */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="vcc-btn-primary" onClick={() => setShowScheduleForm(!showScheduleForm)}>
                  {showScheduleForm ? '× Cancel' : '+ Add Schedule'}
                </button>
              </div>

              {showScheduleForm && (
                <form className="db-schedule-form" onSubmit={handleSaveSchedule}>
                  <h4 className="db-schedule-form-title">New Backup Schedule</h4>
                  <div className="db-form-row">
                    <div className="db-field full">
                      <label>Schedule Name</label>
                      <input
                        type="text" value={scheduleForm.name}
                        onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Nightly Production Backup" required
                      />
                    </div>
                    <div className="db-field half">
                      <label>Frequency</label>
                      <select
                        value={scheduleForm.cron}
                        onChange={e => setScheduleForm(p => ({ ...p, cron: e.target.value }))}
                      >
                        {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    {scheduleForm.cron === 'custom' && (
                      <div className="db-field half">
                        <label>Custom Cron Expression</label>
                        <input
                          type="text" value={scheduleForm.customCron}
                          onChange={e => setScheduleForm(p => ({ ...p, customCron: e.target.value }))}
                          placeholder="0 3 * * *" required
                        />
                      </div>
                    )}
                    <div className="db-field half">
                      <label>Retention (days)</label>
                      <input
                        type="number" min="1" max="365" value={scheduleForm.retention}
                        onChange={e => setScheduleForm(p => ({ ...p, retention: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="db-field half db-toggle-field">
                      <label>Enable on Save</label>
                      <div className="db-toggle-wrap">
                        <button
                          type="button"
                          className={`db-toggle ${scheduleForm.enabled ? 'on' : ''}`}
                          onClick={() => setScheduleForm(p => ({ ...p, enabled: !p.enabled }))}
                        >
                          <span className="db-toggle-knob" />
                        </button>
                        <span>{scheduleForm.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="db-form-foot">
                    <button type="button" className="vcc-btn-ghost" onClick={() => setShowScheduleForm(false)}>Cancel</button>
                    <button type="submit" className="vcc-btn-primary">Save Schedule</button>
                  </div>
                </form>
              )}

              {schedules.length === 0 && !showScheduleForm ? (
                <div className="vcc-empty">
                  <div className="vcc-empty-icon">🕐</div>
                  <p>No schedules configured. Add one to automate your backups.</p>
                </div>
              ) : (
                <div className="db-schedule-list">
                  {schedules.map(s => (
                    <div key={s.id} className={`db-schedule-card ${s.enabled ? 'enabled' : 'disabled'}`}>
                      <div>
                        <div className="db-schedule-name">{s.name}</div>
                        <div className="db-schedule-meta">
                          <code className="db-cron">{s.cron}</code>
                          <span>·</span>
                          <span>Retain {s.retention} days</span>
                          {s.next_run && <><span>·</span><span>Next: {formatDate(s.next_run)}</span></>}
                          {s.last_run && <><span>·</span><span>Last: {formatDate(s.last_run)}</span></>}
                        </div>
                      </div>
                      <div className="db-schedule-card-right">
                        <button
                          type="button"
                          className={`db-toggle ${s.enabled ? 'on' : ''}`}
                          onClick={() => handleToggleSchedule(s.id, s.enabled)}
                        >
                          <span className="db-toggle-knob" />
                        </button>
                        <button className="db-btn-delete" onClick={() => handleDeleteSchedule(s.id)}>Remove</button>
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

export default DatabaseManager;