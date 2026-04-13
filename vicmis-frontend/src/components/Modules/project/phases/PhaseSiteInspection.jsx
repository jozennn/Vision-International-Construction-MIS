import React, { useState, useEffect, useRef, useCallback } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/SiteInspection.css';
import api from '@/api/axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

// ─── Single checklist row ─────────────────────────────────────────────────────
const CheckRow = ({ item, onToggle, onLabelChange, onRemove }) => (
  <tr className="si-check-row">
    <td className="si-td-label">
      <input
        className="si-inline-input"
        value={item.label}
        onChange={e => onLabelChange(item.id, e.target.value)}
        placeholder="Checklist item…"
      />
    </td>
    <td className="si-td-check">
      <input type="checkbox" checked={item.yes} onChange={() => onToggle(item.id, 'yes')} className="si-checkbox" />
    </td>
    <td className="si-td-check">
      <input type="checkbox" checked={item.no}  onChange={() => onToggle(item.id, 'no')}  className="si-checkbox" />
    </td>
    <td className="si-td-check">
      <input type="checkbox" checked={item.na}  onChange={() => onToggle(item.id, 'na')}  className="si-checkbox" />
    </td>
    <td className="si-td-reco">
      <input
        className="si-inline-input"
        value={item.recommendation || ''}
        onChange={e => onLabelChange(item.id, e.target.value, 'recommendation')}
        placeholder="—"
      />
    </td>
    <td className="si-td-action">
      <button className="si-remove-btn" onClick={() => onRemove(item.id)} title="Remove row">✕</button>
    </td>
  </tr>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeParse = (raw) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
};

const toDateInput = (val) => (val ? String(val).slice(0, 10) : '');

// ─── Main Component ───────────────────────────────────────────────────────────
const PhaseSiteInspection = ({ project, onUploadAdvance, renderDocumentLink }) => {
  const [engineers,   setEngineers]   = useState([]);
  const [loadingEng,  setLoadingEng]  = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadFile,  setUploadFile]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [savedOk,     setSavedOk]     = useState(false);

  // Auto-save state
  const [saveStatus,  setSaveStatus]  = useState(null); // 'saving' | 'saved' | 'error' | null
  const autoSaveTimer = useRef(null);
  const isFirstLoad   = useRef(true); // prevents auto-save firing on initial data load

  const formCardRef = useRef(null);

  const [formHeader, setFormHeader] = useState({
    project_name:    project?.project_name || '',
    site_location:   project?.location     || '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: new Date().toTimeString().slice(0, 5),
    inspector_id:    '',
    inspector_name:  '',
    materials_scope: '',
    notes_remarks:   '',
  });

  const [checklist, setChecklist] = useState([]);

  // ── 1. Fetch engineers ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEngineers = async () => {
      setLoadingEng(true);
      try {
        const res  = await api.get('/engineering/dashboard-stats');
        const list = (res.data?.engineers_list ?? [])
          .map(eng => ({ id: eng.id, name: eng.name ?? '' }))
          .filter(e => e.name);
        setEngineers(list);
      } catch (err) {
        console.error('[SiteInspection] failed to fetch engineers:', err);
      } finally {
        setLoadingEng(false);
      }
    };
    fetchEngineers();
  }, []);

  // ── 2. Load previously saved inspection on mount ──────────────────────────
  useEffect(() => {
    if (!project?.id) { setLoadingData(false); return; }

    const fetchSavedInspection = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/projects/${project.id}/site-inspection`);
        const d   = res.data;

        if (!d || !d.inspection_date) return;

        setFormHeader({
          project_name:    d.project_name    ?? project?.project_name ?? '',
          site_location:   d.location        ?? project?.location     ?? '',
          inspection_date: toDateInput(d.inspection_date) || new Date().toISOString().split('T')[0],
          inspection_time: d.inspection_time ?? new Date().toTimeString().slice(0, 5),
          inspector_id:    d.inspector_id    ?? '',
          inspector_name:  d.inspector_name  ?? '',
          materials_scope: d.materials_scope ?? '',
          notes_remarks:   d.notes_remarks   ?? '',
        });

        const saved = safeParse(d.checklist);
        if (saved && saved.length > 0) {
          setChecklist(
            saved
              .filter(p =>
                (p.label ?? p.problem ?? '').trim() ||
                p.yes || p.no || p.na ||
                (p.recommendation ?? p.solution ?? '').trim()
              )
              .map(p => ({
                id:             p.id             ?? `row_${Date.now()}_${Math.random()}`,
                label:          p.label          ?? p.problem  ?? '',
                yes:            p.yes            ?? false,
                no:             p.no             ?? false,
                na:             p.na             ?? false,
                recommendation: p.recommendation ?? p.solution ?? '',
              }))
          );
        }
      } catch (e) {
        if (e.response?.status !== 404) {
          console.error('[SiteInspection] failed to load saved inspection:', e);
        }
      } finally {
        setLoadingData(false);
        // Allow auto-save to start firing AFTER initial load settles
        setTimeout(() => { isFirstLoad.current = false; }, 300);
      }
    };

    fetchSavedInspection();
  }, [project?.id]);

  // ── 3. Debounced auto-save (fires 1.5s after user stops typing) ──────────
  const buildPayload = useCallback(() => ({
    ...formHeader,
    inspector_position: formHeader.position,
    location:           formHeader.site_location,
    checklist:          JSON.stringify(checklist),
  }), [formHeader, checklist]);

  useEffect(() => {
    // Skip auto-save during initial data hydration
    if (isFirstLoad.current) return;
    if (!project?.id) return;

    // Clear any pending timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.post(`/projects/${project.id}/site-inspection`, buildPayload());
        setSaveStatus('saved');
        // Fade out the "Draft saved" message after 3s
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (err) {
        console.error('[SiteInspection] auto-save failed:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 4000);
      }
    }, 1500);

    return () => clearTimeout(autoSaveTimer.current);
  }, [formHeader, checklist, project?.id, buildPayload]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setHeader = (key, val) => setFormHeader(prev => ({ ...prev, [key]: val }));

  const handleInspectorChange = (engineerId) => {
    const eng = engineers.find(e => String(e.id) === String(engineerId));
    setHeader('inspector_id',   engineerId);
    setHeader('inspector_name', eng?.name     || '');
    setHeader('position',       eng?.position || '');
  };

  const toggleCheck = (id, col) =>
    setChecklist(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (col === 'yes') return { ...item, yes: !item.yes, no: false };
      if (col === 'no')  return { ...item, no:  !item.no,  yes: false };
      return { ...item, na: !item.na };
    }));

  const changeLabel = (id, val, field = 'label') =>
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));

  const addRow = () =>
    setChecklist(prev => [
      ...prev,
      { id: `row_${Date.now()}`, label: '', yes: false, no: false, na: false, recommendation: '' },
    ]);

  const removeRow = (id) => setChecklist(prev => prev.filter(item => item.id !== id));

  // ── Save Draft (manual) ───────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!project?.id) return;
    setSavedOk(false);
    try {
      await api.post(`/projects/${project.id}/site-inspection`, buildPayload());
      setSavedOk(true);
      setSaveStatus('saved');
      setTimeout(() => { setSavedOk(false); setSaveStatus(null); }, 3000);
    } catch (err) {
      alert('Failed to save: ' + (err?.response?.data?.message || err.message));
    }
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleSavePdf = async () => {
    if (!formCardRef.current) return;
    setExporting(true);
    try {
      const noExport = formCardRef.current.querySelectorAll('.no-export');
      noExport.forEach(el => { el.dataset.prevDisplay = el.style.display; el.style.display = 'none'; });

      const canvas = await html2canvas(formCardRef.current, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
        windowWidth:     formCardRef.current.scrollWidth,
        windowHeight:    formCardRef.current.scrollHeight,
      });

      noExport.forEach(el => { el.style.display = el.dataset.prevDisplay || ''; });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW   = pdf.internal.pageSize.getWidth();
      const pageH   = pdf.internal.pageSize.getHeight();
      const imgH    = pageW * (canvas.height / canvas.width);

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
      } else {
        const pagePx = (pageH / imgH) * canvas.height;
        let offsetPx = 0;
        while (offsetPx < canvas.height) {
          const slicePx     = Math.min(pagePx, canvas.height - offsetPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = slicePx;
          sliceCanvas.getContext('2d').drawImage(canvas, 0, -offsetPx);
          if (offsetPx > 0) pdf.addPage();
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, (slicePx / canvas.height) * imgH);
          offsetPx += slicePx;
        }
      }

      pdf.save(`${formHeader.project_name || 'SiteInspection'}_${formHeader.inspection_date.replace(/-/g, '')}.pdf`);
    } catch (err) {
      console.error('[SiteInspection] PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formHeader.inspector_id) { alert('Please select an inspector.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/projects/${project.id}/site-inspection`, buildPayload());
      await onUploadAdvance('Checking of Delivery of Materials', 'site_inspection_photo', uploadFile);
    } catch (err) {
      alert('Failed to submit inspection: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const allChecked = checklist.length > 0 && checklist.every(item => item.yes || item.no || item.na);

  if (loadingData) {
    return (
      <div className="si-wrapper">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          ⏳ Loading inspection data…
        </div>
      </div>
    );
  }

  return (
    <div className="si-wrapper">

      {/* ── Reference documents ── */}
      <div className="si-ref-docs">
        <div className="pm-grid-2">
          {renderDocumentLink('Purchase Order', project.po_document)}
          {renderDocumentLink('Work Order', project.work_order_document)}
        </div>
      </div>

      {/* ══ FORM CARD — only this is captured for PDF ════════════════════ */}
      <div className="si-form-card" ref={formCardRef}>

        {/* Letterhead */}
        <div className="si-letterhead">
          <div className="si-letterhead-logo">
            <div className="si-logo-circle"><span>V</span></div>
          </div>
          <div className="si-letterhead-text">
            <h1 className="si-company-name">VISION INTERNATIONAL CONSTRUCTION OPC</h1>
            <p className="si-company-tagline"><em>Your Vision, We Build!</em></p>
            <p className="si-company-address">888 Industrial Megacity, Highway 2000 Phase 2, Taytay Rizal Philippines</p>
            <p className="si-company-contact">Email: vision.intlconstruct@gmail.com &nbsp;|&nbsp; Contact#: 0917 833 9655</p>
          </div>
        </div>

        <div className="si-form-title">SITE INSPECTION FORM</div>

        {/* Header fields */}
        <div className="si-header-fields">
          <div className="si-field-row">
            <span className="si-field-label">PROJECT NAME:</span>
            <input className="si-field-input" value={formHeader.project_name}
              onChange={e => setHeader('project_name', e.target.value)} />
          </div>
          <div className="si-field-row">
            <span className="si-field-label">SITE LOCATION:</span>
            <input className="si-field-input" value={formHeader.site_location}
              onChange={e => setHeader('site_location', e.target.value)} />
          </div>
          <div className="si-field-row">
            <span className="si-field-label">DATE AND TIME OF INSPECTION:</span>
            <div className="si-field-datetime">
              <input className="si-field-input" type="date" value={formHeader.inspection_date}
                onChange={e => setHeader('inspection_date', e.target.value)} style={{ flex: 1 }} />
              <input className="si-field-input" type="time" value={formHeader.inspection_time}
                onChange={e => setHeader('inspection_time', e.target.value)} style={{ width: '110px' }} />
            </div>
          </div>
          <div className="si-field-row">
            <span className="si-field-label">INSPECTOR'S NAME:</span>
            {loadingEng ? (
              <div className="si-field-input si-loading-text">Loading engineers…</div>
            ) : (
              <select className="si-field-input si-field-select"
                value={formHeader.inspector_id}
                onChange={e => handleInspectorChange(e.target.value)}>
                <option value="">— Select Inspector —</option>
                {engineers.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="si-field-row si-field-row-top">
            <span className="si-field-label">MATERIALS AND SCOPE OF WORKS:</span>
            <textarea className="si-field-textarea" value={formHeader.materials_scope}
              onChange={e => setHeader('materials_scope', e.target.value)} rows={3} />
          </div>
        </div>

        {/* Checklist table */}
        <div className="si-table-wrap">
          <table className="si-table">
            <thead>
              <tr>
                <th className="si-th-label">CHECKLIST</th>
                <th className="si-th-check">YES</th>
                <th className="si-th-check">NO</th>
                <th className="si-th-check">N/A</th>
                <th className="si-th-reco">RECOMMENDATIONS</th>
                <th className="si-th-action">—</th>
              </tr>
            </thead>
            <tbody>
              {checklist.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '18px', fontStyle: 'italic' }}>
                    No items yet — click "+ Add Checklist Item" below.
                  </td>
                </tr>
              )}
              {checklist.map(item => (
                <CheckRow key={item.id} item={item}
                  onToggle={toggleCheck} onLabelChange={changeLabel} onRemove={removeRow} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row — hidden during PDF export via .no-export */}
        <div className="si-add-row-wrap no-export">
          <button className="si-add-row-btn" onClick={addRow}>+ Add Checklist Item</button>
        </div>

        {/* Notes */}
        <div className="si-notes-section">
          <div className="si-notes-label">NOTES/REMARKS:</div>
          <textarea className="si-notes-textarea" value={formHeader.notes_remarks}
            onChange={e => setHeader('notes_remarks', e.target.value)}
            rows={4} placeholder="Enter any additional site notes or observations…" />
        </div>

        {/* Signatures */}
        <div className="si-signature-row">
          <div className="si-sig-block">
            <div className="si-sig-line" />
            <p className="si-sig-label">Inspector's Signature over Printed Name</p>
          </div>
          <div className="si-sig-block">
            <div className="si-sig-line" />
            <p className="si-sig-label">Client's Signature over Printed Name</p>
          </div>
        </div>

      </div>{/* end si-form-card */}

      {/* Upload photo */}
      <div className="pm-card-cream">
        <label className="pm-label">📸 Upload "Before" Site Photo</label>
        <label className={`pm-upload-zone ${uploadFile ? 'has-file' : ''}`}>
          <span className="pm-upload-zone-icon">{uploadFile ? '✅' : '📷'}</span>
          <span className="pm-upload-zone-name">
            {uploadFile ? uploadFile.name : 'Click to choose photo'}
          </span>
          <span className="pm-upload-zone-hint">JPG, PNG accepted</span>
          <input type="file" accept="image/*"
            onChange={e => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Action buttons */}
      <div className="si-actions">
        <div className="si-actions-left">
          <button className="si-save-draft-btn" onClick={handleSaveDraft} disabled={submitting}>
            💾 Save Draft
          </button>
          {/* Auto-save indicator — shown next to the button */}
          <SaveIndicator status={saveStatus} />
          {savedOk && !saveStatus && <span className="si-saved-badge">✅ Saved!</span>}
        </div>
        <div className="si-actions-right">
          <button className="si-print-btn" onClick={handleSavePdf} disabled={exporting}>
            {exporting ? '⏳ Generating PDF…' : '📄 Save as PDF'}
          </button>
          <PrimaryButton
            variant="red"
            disabled={!allChecked || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? '⏳ Submitting…'
              : allChecked
                ? '✓ Complete Inspection & Request Materials'
                : 'Complete All Checklist Items to Advance'}
          </PrimaryButton>
        </div>
      </div>

    </div>
  );
};

export default PhaseSiteInspection;