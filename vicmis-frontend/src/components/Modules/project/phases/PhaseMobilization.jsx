import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/api/axios';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseMobilization.css';

const POSITIONS = ['Lead Installer', 'Installer', 'Helper', 'Supervisor'];
const emptyInstaller = () => ({ id: Date.now() + Math.random(), name: '', position: 'Installer' });

// ─── Save Indicator ───────────────────────────────────────────────────────────
const SaveIndicator = ({ status }) => {
  if (!status) return null;
  const styles = {
    saving: { color: '#6b7280', fontSize: '0.8rem' },
    saved:  { color: '#16a34a', fontSize: '0.8rem' },
    error:  { color: '#dc2626', fontSize: '0.8rem' },
  };
  const labels = { saving: '● Saving…', saved: '✓ Draft saved', error: '✗ Auto-save failed' };
  return <span style={styles[status]}>{labels[status]}</span>;
};

// ─── DocumentViewer ───────────────────────────────────────────────────────────
const DocumentViewer = ({ path, label, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const src   = `/api/project-image/${path}`;
  const isPDF = path?.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px',
          width: '100%', maxWidth: '900px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', flexShrink: 0,
          borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
        }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
            📸 {label}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href={src} target="_blank" rel="noreferrer"
              style={{
                fontSize: '12px', fontWeight: 600, color: '#374151',
                textDecoration: 'none', padding: '5px 12px', borderRadius: '6px',
                border: '1px solid #d1d5db', background: '#fff',
              }}
            >⬇ Open / Download</a>
            <button onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: '4px 8px',
              }}
            >✕</button>
          </div>
        </div>

        <div style={{
          flex: 1, overflow: 'auto', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', background: '#f3f4f6', minHeight: '320px',
        }}>
          {!loaded && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#6b7280',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: '#DC2626' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Could not display inline.{' '}
                <a href={src} target="_blank" rel="noreferrer" style={{ color: '#2563EB' }}>
                  Open / Download
                </a> directly.
              </p>
            </div>
          )}
          {isPDF ? (
            <iframe src={src} title={label}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                width: '100%', height: '68vh', border: 'none', borderRadius: '6px',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          ) : (
            <img src={src} alt={label}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                maxWidth: '100%', maxHeight: '68vh',
                objectFit: 'contain', borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── ViewDocumentButton ─────────────────────────────────────────────────── */
const ViewDocumentButton = ({ label, path, icon = '📸' }) => {
  const [open, setOpen] = useState(false);
  if (!path) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', borderRadius: '7px', cursor: 'pointer',
          background: '#EFF6FF', border: '1.5px solid #BFDBFE',
          color: '#1D4ED8', fontWeight: 600, fontSize: '13px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
        onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
      >
        {icon} View {label}
      </button>
      {open && <DocumentViewer path={path} label={label} onClose={() => setOpen(false)} />}
    </>
  );
};

// Parse roster from project prop
const resolveRoster = (project) => {
  const top = project?.installer_roster;
  if (Array.isArray(top) && top.length > 0) return top;
  const nested = project?.mobilization?.installer_roster;
  if (Array.isArray(nested) && nested.length > 0) return nested;
  if (typeof top === 'string') {
    try { const p = JSON.parse(top); if (Array.isArray(p) && p.length > 0) return p; } catch {}
  }
  return [];
};

const rosterToInstallers = (roster) =>
  roster.map((r, i) => ({
    id:       i + Date.now(),
    name:     r.name     ?? '',
    position: r.position ?? 'Installer',
  }));

// ─────────────────────────────────────────────────────────────────────────────
// PhaseMobilization
// Handles ONLY: Deployment and Orientation of Installers
// NOTE: Contract Signing for Installer is now fully handled by
//       PhaseBiddingAwardingContract — see Project.jsx GATE 3.
// ─────────────────────────────────────────────────────────────────────────────
const PhaseMobilization = ({ project, isEng, isOpsAss, onAdvance, onUploadAdvance, renderDocumentLink }) => {
  const { status } = project;

  const savedRoster  = resolveRoster(project);
  const initialRows  = savedRoster.length > 0 ? rosterToInstallers(savedRoster) : [emptyInstaller()];

  const [installers,  setInstallers]  = useState(initialRows);
  const [uploadFile,  setUploadFile]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [saveStatus,  setSaveStatus]  = useState(null);
  const fileInputRef   = useRef();
  const autoSaveTimer  = useRef(null);
  const isFirstLoad    = useRef(true);

  const existingPhotoPath = project?.mobilization_photo || project?.mobilization?.mobilization_photo || null;

  useEffect(() => {
    const roster = resolveRoster(project);
    if (roster.length > 0) setInstallers(rosterToInstallers(roster));
    setTimeout(() => { isFirstLoad.current = false; }, 300);
  }, [project?.id]);

  const buildDraftPayload = useCallback(() => {
    const validRoster = installers
      .filter(i => i.name.trim())
      .map(({ name, position }) => ({ name: name.trim(), position }));
    return JSON.stringify(validRoster);
  }, [installers]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    if (!project?.id) return;
    if (status !== 'Deployment and Orientation of Installers') return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      const validRoster = installers.filter(i => i.name.trim());
      if (validRoster.length === 0) return;

      setSaveStatus('saving');
      try {
        await api.post(`/projects/${project.id}/mobilization/draft-roster`, {
          installer_roster: buildDraftPayload(),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (err) {
        console.error('[Mobilization] auto-save failed:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 4000);
      }
    }, 1500);

    return () => clearTimeout(autoSaveTimer.current);
  }, [installers, project?.id, status, buildDraftPayload]);

  const hasValidInstallers = installers.length > 0 && installers.every(i => i.name.trim() !== '');
  const hasExistingPhoto   = !!existingPhotoPath;
  const isMobilizationReady = hasValidInstallers && (uploadFile || hasExistingPhoto);

  const addRow    = () => setInstallers(prev => [...prev, emptyInstaller()]);
  const removeRow = (id) => setInstallers(prev => prev.filter(i => i.id !== id));
  const updateRow = (id, field, value) =>
    setInstallers(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleDeploySubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const validRoster = installers
        .filter(i => i.name.trim())
        .map(({ name, position }) => ({ name: name.trim(), position }));

      const formData = new FormData();
      formData.append('new_status',       'Site Inspection & Project Monitoring');
      formData.append('installer_roster', JSON.stringify(validRoster));
      if (uploadFile) formData.append('mobilization_photo', uploadFile);

      await api.post(
        `/projects/${project.id}/mobilization/deploy`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      onAdvance('Site Inspection & Project Monitoring');
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save deployment.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Deployment and Orientation of Installers
  // ─────────────────────────────────────────────────────────────────────────
  if (status === 'Deployment and Orientation of Installers' && (isEng || isOpsAss)) {
    return (
      <div className="pm-mob-wrapper">
        {error && (
          <div className="pm-card-red">
            <p className="pm-text-muted pm-no-margin">⚠️ {error}</p>
          </div>
        )}

        <div className="pm-card">
          <div className="pm-card-navy">
            <div className="pm-mob-nav-inner">
              <div>
                <h3 className="pm-mob-title">🚀 Site Mobilization</h3>
                <p className="pm-mob-nav-sub">Register the installer team and upload mobilization proof</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SaveIndicator status={saveStatus} />
                <div className="pm-mob-count-badge">
                  {installers.filter(i => i.name.trim()).length} Installer{installers.filter(i => i.name.trim()).length !== 1 ? 's' : ''} Registered
                </div>
              </div>
            </div>
          </div>

          <div className="pm-card-body">
            <div className="pm-card-gray">
              <div className="pm-mob-table-header">
                <div>
                  <h4 className="pm-title-md pm-no-margin">Installer Team Roster</h4>
                  <p className="pm-text-muted pm-mob-table-sub">Add all installers being deployed to this project.</p>
                </div>
                <button className="pm-mob-add-btn" onClick={addRow}>+ Add Row</button>
              </div>

              <div className="pm-mob-table-wrap">
                <table className="pm-mob-table">
                  <thead>
                    <tr>
                      <th className="pm-mob-col-num">#</th>
                      <th>Full Name</th>
                      <th className="pm-mob-col-pos">Position</th>
                      <th className="pm-mob-col-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {installers.map((inst, idx) => (
                      <tr key={inst.id} className={inst.name.trim() ? 'pm-mob-row-filled' : ''}>
                        <td className="pm-mob-row-num">{idx + 1}</td>
                        <td>
                          <input type="text" className="pm-mob-input"
                            value={inst.name}
                            onChange={e => updateRow(inst.id, 'name', e.target.value)}
                            placeholder="e.g. Juan dela Cruz" />
                        </td>
                        <td>
                          <select className="pm-mob-input pm-mob-select"
                            value={inst.position}
                            onChange={e => updateRow(inst.id, 'position', e.target.value)}>
                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td>
                          <button className="pm-mob-remove-btn"
                            onClick={() => removeRow(inst.id)}
                            disabled={installers.length === 1}
                            title="Remove row">✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {installers.some(i => i.name.trim()) && (
                <div className="pm-mob-summary">
                  {POSITIONS.map(pos => {
                    const count = installers.filter(i => i.position === pos && i.name.trim()).length;
                    return count > 0
                      ? <span key={pos} className="pm-mob-pill">{count} {pos}</span>
                      : null;
                  })}
                </div>
              )}
            </div>

            {/* ── Mobilization Photo Upload ── */}
            <div className="pm-card-cream pm-mob-upload-section">
              <h4 className="pm-title-md pm-mob-upload-title">📸 Mobilization Photo</h4>
              <p className="pm-text-muted pm-mob-upload-desc">
                Upload a toolbox meeting or mobilization photo as proof of deployment.
              </p>

              {hasExistingPhoto && (
                <div style={{ marginBottom: '12px' }}>
                  <ViewDocumentButton label="Mobilization Photo" path={existingPhotoPath} icon="📸" />
                </div>
              )}

              <label className="pm-upload-label">
                <span className="pm-upload-icon">
                  {uploadFile ? '✅' : hasExistingPhoto ? '✅' : '📎'}
                </span>
                <span className="pm-upload-text">
                  {uploadFile
                    ? uploadFile.name
                    : hasExistingPhoto
                      ? 'Photo already uploaded — choose new to replace'
                      : 'Click to choose — Image file'}
                </span>
                <input type="file" accept="image/*"
                  ref={fileInputRef}
                  onChange={e => setUploadFile(e.target.files[0])}
                  className="pm-hidden-file" />
              </label>
            </div>

            <PrimaryButton
              disabled={!isMobilizationReady || loading}
              variant="green"
              onClick={handleDeploySubmit}
            >
              {loading
                ? 'Saving...'
                : isMobilizationReady
                  ? '🚀 Mobilize Team & Begin Construction'
                  : 'Complete Roster & Upload Photo'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhaseMobilization;