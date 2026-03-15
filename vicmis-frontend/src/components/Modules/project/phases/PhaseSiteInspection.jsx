import React, { useState, useEffect, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/SiteInspection.css';
import api from '@/api/axios';

// ─── Default checklist items (mirrors the physical form) ─────────────────────
const DEFAULT_CHECKLIST = [
  { id: 'approved_plan',      label: 'Approved Plan or Layout' },
  { id: 'smooth_flooring',    label: 'Smooth Finish Flooring (Close to Wall)' },
  { id: 'no_crack',           label: 'No Crack or Hairlines' },
  { id: 'mech_elec',          label: 'Done Mechanical, Electrical, Fire Protection, Plumbing and Sanitary' },
  { id: 'waterproofing',      label: 'Done Waterproofing (if Required)' },
  { id: 'painting',           label: 'Done Painting Works' },
  { id: 'ceiling',            label: 'Done Ceiling Works' },
  { id: 'doors_windows',      label: 'Done Installation of Doors and Windows (Closed Area)' },
  { id: 'renovation',         label: 'Done Renovation / Dismantle Existing Flooring (if Applicable)' },
  { id: 'topping_50mm',       label: 'Original Slab or Sub-Floor at Least 50mm Topping' },
  { id: 'topping_100mm',      label: '100mm Topping for Outbound or 100mm Drop Flooring' },
  { id: 'leveled',            label: 'Even or Leveled Flooring' },
  { id: 'no_leak',            label: 'No Leak on Roofing' },
  { id: 'playing_court',      label: 'Size of Playing Court and With or Without Outbound' },
];

// ─── Single checklist row ─────────────────────────────────────────────────────
const CheckRow = ({ item, onToggle, onLabelChange, onRemove, readOnly }) => (
  <tr className="si-check-row">
    <td className="si-td-label">
      {readOnly ? (
        <span>{item.label}</span>
      ) : (
        <input
          className="si-inline-input"
          value={item.label}
          onChange={e => onLabelChange(item.id, e.target.value)}
          placeholder="Checklist item…"
        />
      )}
    </td>
    <td className="si-td-check"><input type="checkbox" checked={item.yes}  onChange={() => onToggle(item.id, 'yes')}  className="si-checkbox" /></td>
    <td className="si-td-check"><input type="checkbox" checked={item.no}   onChange={() => onToggle(item.id, 'no')}   className="si-checkbox" /></td>
    <td className="si-td-check"><input type="checkbox" checked={item.na}   onChange={() => onToggle(item.id, 'na')}   className="si-checkbox" /></td>
    <td className="si-td-reco">
      <input
        className="si-inline-input"
        value={item.recommendation || ''}
        onChange={e => onLabelChange(item.id, e.target.value, 'recommendation')}
        placeholder="—"
        disabled={readOnly}
      />
    </td>
    {!readOnly && (
      <td className="si-td-action">
        <button className="si-remove-btn" onClick={() => onRemove(item.id)} title="Remove row">✕</button>
      </td>
    )}
  </tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PhaseSiteInspection = ({ project, onUploadAdvance, renderDocumentLink }) => {
  const [engineers,    setEngineers]    = useState([]);
  const [loadingEng,   setLoadingEng]   = useState(true);
  const [uploadFile,   setUploadFile]   = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [printMode,    setPrintMode]    = useState(false);

  // ── Form header fields ────────────────────────────────────────────────────
  const [formHeader, setFormHeader] = useState({
    project_name:    project?.project_name  || '',
    site_location:   project?.site_location || '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: new Date().toTimeString().slice(0, 5),
    inspector_id:    '',
    inspector_name:  '',
    position:        '',
    materials_scope: '',
    notes_remarks:   '',
  });

  // ── Checklist rows ────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState(
    DEFAULT_CHECKLIST.map(item => ({ ...item, yes: false, no: false, na: false, recommendation: '' }))
  );

  // ── Fetch engineers list (same as EngineeringDashboard assign modal) ──────
  useEffect(() => {
    const fetchEngineers = async () => {
      setLoadingEng(true);
      try {
        const res = await api.get('/engineering/dashboard-stats');
        setEngineers(res.data?.engineers_list || []);
      } catch (err) {
        console.error('[SiteInspection] failed to fetch engineers', err);
      } finally {
        setLoadingEng(false);
      }
    };
    fetchEngineers();
  }, []);

  // ── Header field helper ───────────────────────────────────────────────────
  const setHeader = (key, val) => setFormHeader(prev => ({ ...prev, [key]: val }));

  const handleInspectorChange = (engineerId) => {
    const eng = engineers.find(e => String(e.id) === String(engineerId));
    setHeader('inspector_id',   engineerId);
    setHeader('inspector_name', eng?.name     || '');
    setHeader('position',       eng?.position || eng?.role || '');
  };

  // ── Checklist helpers ─────────────────────────────────────────────────────
  const toggleCheck = (id, col) => {
    setChecklist(prev => prev.map(item => {
      if (item.id !== id) return item;
      // YES / NO / NA are mutually exclusive for YES and NO, but NA can coexist
      if (col === 'yes') return { ...item, yes: !item.yes, no: false };
      if (col === 'no')  return { ...item, no:  !item.no,  yes: false };
      return { ...item, na: !item.na };
    }));
  };

  const changeLabel = (id, val, field = 'label') => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const addRow = () => {
    setChecklist(prev => [
      ...prev,
      { id: `custom_${Date.now()}`, label: '', yes: false, no: false, na: false, recommendation: '' }
    ]);
  };

  const removeRow = (id) => setChecklist(prev => prev.filter(item => item.id !== id));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formHeader.inspector_id) { alert('Please select an inspector.'); return; }
    setSubmitting(true);
    try {
      // Save inspection data first
      await api.post(`/projects/${project.id}/site-inspection`, {
        ...formHeader,
        checklist: JSON.stringify(checklist),
      });
      // Then advance with photo upload
      await onUploadAdvance('Checking of Delivery of Materials', 'site_inspection_photo', uploadFile);
    } catch (err) {
      alert('Failed to submit inspection: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => { window.print(); setPrintMode(false); }, 200);
  };

  const allChecked = checklist.every(item => item.yes || item.no || item.na);

  return (
    <div className={`si-wrapper ${printMode ? 'si-print-mode' : ''}`}>

      {/* ── Reference documents (hidden in print) ── */}
      <div className="si-ref-docs no-print">
        <div className="pm-grid-2">
          {renderDocumentLink('Purchase Order',  project.po_document)}
          {renderDocumentLink('Work Order', project.work_order_document)}
        </div>
      </div>

      {/* ══ INSPECTION FORM CARD ══════════════════════════════════════════ */}
      <div className="si-form-card">

        {/* ── Letterhead ── */}
        <div className="si-letterhead">
          <div className="si-letterhead-logo">
            <div className="si-logo-circle">
              <span>V</span>
            </div>
          </div>
          <div className="si-letterhead-text">
            <h1 className="si-company-name">VISION INTERNATIONAL CONSTRUCTION OPC</h1>
            <p className="si-company-tagline"><em>Your Vision, We Build!</em></p>
            <p className="si-company-address">888 Industrial Megacity, Highway 2000 Phase 2, Taytay Rizal Philippines</p>
            <p className="si-company-contact">Email: vision.intlconstruct@gmail.com &nbsp;|&nbsp; Contact#: 0917 833 9655</p>
          </div>
        </div>

        <div className="si-form-title">SITE INSPECTION FORM</div>

        {/* ── Header fields ── */}
        <div className="si-header-fields">
          <div className="si-field-row">
            <span className="si-field-label">PROJECT NAME:</span>
            <input className="si-field-input" value={formHeader.project_name} onChange={e => setHeader('project_name', e.target.value)} />
          </div>
          <div className="si-field-row">
            <span className="si-field-label">SITE LOCATION:</span>
            <input className="si-field-input" value={formHeader.site_location} onChange={e => setHeader('site_location', e.target.value)} />
          </div>
          <div className="si-field-row">
            <span className="si-field-label">DATE AND TIME OF INSPECTION:</span>
            <div className="si-field-datetime">
              <input className="si-field-input" type="date" value={formHeader.inspection_date} onChange={e => setHeader('inspection_date', e.target.value)} style={{ flex: 1 }} />
              <input className="si-field-input" type="time" value={formHeader.inspection_time} onChange={e => setHeader('inspection_time', e.target.value)} style={{ width: '110px' }} />
            </div>
          </div>
          <div className="si-field-row">
            <span className="si-field-label">INSPECTOR'S NAME:</span>
            {loadingEng ? (
              <div className="si-field-input" style={{ color: 'var(--pm-text-muted)', fontStyle: 'italic' }}>Loading engineers…</div>
            ) : (
              <select
                className="si-field-input si-field-select"
                value={formHeader.inspector_id}
                onChange={e => handleInspectorChange(e.target.value)}
              >
                <option value="">— Select Inspector —</option>
                {engineers.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="si-field-row">
            <span className="si-field-label">POSITION:</span>
            <input className="si-field-input" value={formHeader.position} onChange={e => setHeader('position', e.target.value)} placeholder="Auto-filled from engineer selection" />
          </div>
          <div className="si-field-row si-field-row-top">
            <span className="si-field-label">MATERIALS AND SCOPE OF WORKS:</span>
            <textarea className="si-field-textarea" value={formHeader.materials_scope} onChange={e => setHeader('materials_scope', e.target.value)} rows={3} />
          </div>
        </div>

        {/* ── Checklist table ── */}
        <div className="si-table-wrap">
          <table className="si-table">
            <thead>
              <tr>
                <th className="si-th-label">CHECKLIST</th>
                <th className="si-th-check">YES</th>
                <th className="si-th-check">NO</th>
                <th className="si-th-check">N/A</th>
                <th className="si-th-reco">RECOMMENDATIONS</th>
                <th className="si-th-action no-print">—</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map(item => (
                <CheckRow
                  key={item.id}
                  item={item}
                  onToggle={toggleCheck}
                  onLabelChange={changeLabel}
                  onRemove={removeRow}
                  readOnly={false}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Add row button ── */}
        <div className="si-add-row-wrap no-print">
          <button className="si-add-row-btn" onClick={addRow}>+ Add Checklist Item</button>
        </div>

        {/* ── Notes / Remarks ── */}
        <div className="si-notes-section">
          <div className="si-notes-label">NOTES/REMARKS:</div>
          <textarea
            className="si-notes-textarea"
            value={formHeader.notes_remarks}
            onChange={e => setHeader('notes_remarks', e.target.value)}
            rows={4}
            placeholder="Enter any additional site notes or observations…"
          />
        </div>

        {/* ── Signature area (print only) ── */}
        <div className="si-signature-row print-only">
          <div className="si-sig-block">
            <div className="si-sig-line" />
            <p className="si-sig-label">Inspector's Signature over Printed Name</p>
          </div>
          <div className="si-sig-block">
            <div className="si-sig-line" />
            <p className="si-sig-label">Client's Signature over Printed Name</p>
          </div>
        </div>
      </div>

      {/* ── Upload "Before" photo ── */}
      <div className="pm-card-cream no-print">
        <label className="pm-label">📸 Upload "Before" Site Photo</label>
        <label className={`pm-upload-zone ${uploadFile ? 'has-file' : ''}`}>
          <span className="pm-upload-zone-icon">{uploadFile ? '✅' : '📷'}</span>
          <span className="pm-upload-zone-name">
            {uploadFile ? uploadFile.name : 'Click to choose photo'}
          </span>
          <span className="pm-upload-zone-hint">JPG, PNG accepted</span>
          <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
        </label>
      </div>

      {/* ── Action buttons ── */}
      <div className="si-actions no-print">
        <button className="si-print-btn" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
        <PrimaryButton
          variant="red"
          disabled={!allChecked || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '⏳ Submitting…' : allChecked ? '✓ Complete Inspection & Request Materials' : 'Complete All Checklist Items to Advance'}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default PhaseSiteInspection;