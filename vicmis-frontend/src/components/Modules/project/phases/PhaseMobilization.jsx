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

const PhaseMobilization = ({ project, isEng, isOpsAss, onAdvance, onUploadAdvance, renderDocumentLink }) => {
  const { status } = project;

  const contractWasCompleted = [
    'Deployment and Orientation of Installers',
    'Site Inspection & Project Monitoring',
  ].includes(status) || project?.mobilization?.contract_signed_at;

  const [contract, setContract] = useState({
    boqReviewed:    !!contractWasCompleted,
    timelineAgreed: !!contractWasCompleted,
    signed:         !!contractWasCompleted,
  });

  const savedRoster = resolveRoster(project);
  const initialRows = savedRoster.length > 0
    ? rosterToInstallers(savedRoster)
    : [emptyInstaller()];

  const [installers,  setInstallers]  = useState(initialRows);
  const [uploadFile,  setUploadFile]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [saveStatus,  setSaveStatus]  = useState(null); // 'saving' | 'saved' | 'error' | null
  const fileInputRef   = useRef();
  const autoSaveTimer  = useRef(null);
  const isFirstLoad    = useRef(true);

  // Re-seed roster if project prop updates
  useEffect(() => {
    const roster = resolveRoster(project);
    if (roster.length > 0) {
      setInstallers(rosterToInstallers(roster));
    }
    // Allow auto-save after initial hydration
    setTimeout(() => { isFirstLoad.current = false; }, 300);
  }, [project?.id]);

  // ── Debounced auto-save for installer roster ──────────────────────────────
  // Note: only the roster is auto-saved (file uploads require manual submit)
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
      if (validRoster.length === 0) return; // don't save empty roster

      setSaveStatus('saving');
      try {
        const formData = new FormData();
        formData.append('installer_roster', buildDraftPayload());
        // Use a no-op status so we don't advance the phase
        formData.append('_draft', '1');

        // Save via the deploy endpoint but without advancing status
        // by hitting the mobilization draft save
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

  const isContractReady    = contract.boqReviewed && contract.timelineAgreed && contract.signed;
  const hasValidInstallers = installers.length > 0 && installers.every(i => i.name.trim() !== '');
  const hasExistingPhoto   = !!(project?.mobilization_photo || project?.mobilization?.mobilization_photo);
  const isMobilizationReady = hasValidInstallers && (uploadFile || hasExistingPhoto);

  const addRow    = () => setInstallers(prev => [...prev, emptyInstaller()]);
  const removeRow = (id) => setInstallers(prev => prev.filter(i => i.id !== id));
  const updateRow = (id, field, value) =>
    setInstallers(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  // ── Phase 1: Confirm handover checklist ──────────────────────────────────
  const handleContractConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/projects/${project.id}/mobilization/contract`, {
        new_status: 'Deployment and Orientation of Installers',
      });
      onAdvance('Deployment and Orientation of Installers');
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to confirm contract.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phase 2: Submit roster + photo ───────────────────────────────────────
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
      if (uploadFile) {
        formData.append('mobilization_photo', uploadFile);
      }

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
  // Phase 1: Contract Signing for Installer
  // ─────────────────────────────────────────────────────────────────────────
  if (status === 'Contract Signing for Installer' && (isEng || isOpsAss)) {
    return (
      <div className="pm-mob-wrapper">
        {error && (
          <div className="pm-card-red">
            <p className="pm-text-muted pm-no-margin">⚠️ {error}</p>
          </div>
        )}

        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-mob-title">🤝 Subcontractor Handover Briefing</h3>
          </div>

          <div className="pm-card-body">
            <div className="pm-card-gray">
              <h4 className="pm-mob-section-label pm-mob-label-blue">Subcontractor Agreement</h4>
              {renderDocumentLink('Subcontractor Agreement', project.subcontractor_agreement_document)}
            </div>

            <div className="pm-card-gray">
              <h4 className="pm-title-md pm-mob-confirm-heading">Confirm the following before proceeding</h4>
              <div className="pm-mob-checklist">

                <label className={`pm-mob-check-item ${contract.boqReviewed ? 'pm-mob-check-done' : ''}`}>
                  <input type="checkbox" checked={contract.boqReviewed}
                    onChange={e => setContract({ ...contract, boqReviewed: e.target.checked })} />
                  <div className="pm-mob-check-text">
                    <span className="pm-mob-check-title">📋 Final BOQ Reviewed</span>
                    <span className="pm-mob-check-sub">Subcontractor has reviewed and agreed to the Final BOQ parameters.</span>
                  </div>
                </label>

                <label className={`pm-mob-check-item ${contract.timelineAgreed ? 'pm-mob-check-done' : ''}`}>
                  <input type="checkbox" checked={contract.timelineAgreed}
                    onChange={e => setContract({ ...contract, timelineAgreed: e.target.checked })} />
                  <div className="pm-mob-check-text">
                    <span className="pm-mob-check-title">⏳ Timeline Acknowledged</span>
                    <span className="pm-mob-check-sub">Project timeline and milestones have been acknowledged.</span>
                  </div>
                </label>

                <label className={`pm-mob-check-item ${contract.signed ? 'pm-mob-check-done' : ''}`}>
                  <input type="checkbox" checked={contract.signed}
                    onChange={e => setContract({ ...contract, signed: e.target.checked })} />
                  <div className="pm-mob-check-text">
                    <span className="pm-mob-check-title">✍️ Contract Signed</span>
                    <span className="pm-mob-check-sub">Physical contract has been formally signed by both parties.</span>
                  </div>
                </label>

              </div>
            </div>

            <PrimaryButton
              disabled={!isContractReady || loading}
              variant="red"
              onClick={handleContractConfirm}
            >
              {loading
                ? 'Saving...'
                : isContractReady
                  ? '✓ Confirm Handover & Proceed to Mobilization'
                  : 'Complete Checklist to Advance'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Deployment and Orientation of Installers
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
                {/* Auto-save indicator */}
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

            <div className="pm-card-cream pm-mob-upload-section">
              <h4 className="pm-title-md pm-mob-upload-title">📸 Mobilization Photo</h4>
              <p className="pm-text-muted pm-mob-upload-desc">Upload a toolbox meeting or mobilization photo as proof of deployment.</p>
              <label className="pm-upload-label">
                <span className="pm-upload-icon">{uploadFile ? '✅' : (hasExistingPhoto ? '✅' : '📎')}</span>
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