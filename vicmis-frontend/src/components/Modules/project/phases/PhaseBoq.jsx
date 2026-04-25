import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '@/api/axios';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';

/* ─────────────────── helpers ─────────────────── */
const fmt = (n) =>
  `₱${(parseFloat(n) || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const grandTotal = (rows = []) =>
  rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

/* ─────────────────────────────────────────────────────────────
   resolveFloorPlanPath

   The backend formatProject() returns floor_plan_image as a
   FULL URL: url('/api/project-image/' . $raw_path)
   e.g.  "https://app.test/api/project-image/project_documents/abc.jpg"

   Our DocumentViewer needs just the raw storage path so it can
   build: /api/project-image/{rawPath}

   Strategy:
   1. If it contains "/api/project-image/", extract everything after it.
   2. If it starts with "http" but has no marker, strip the origin.
   3. Otherwise treat it as the raw path already.
───────────────────────────────────────────────────────────── */
const resolveFloorPlanPath = (floorPlanImage) => {
  if (!floorPlanImage) return null;

  const marker = '/api/project-image/';
  const idx = floorPlanImage.indexOf(marker);
  if (idx !== -1) {
    // e.g. "https://app/api/project-image/project_documents/abc.jpg"
    //   → "project_documents/abc.jpg"
    return floorPlanImage.slice(idx + marker.length);
  }

  // Fallback: if it's a full URL without the marker, strip the origin
  try {
    const url = new URL(floorPlanImage);
    // pathname would be "/project_documents/abc.jpg" — strip leading slash
    return url.pathname.replace(/^\//, '');
  } catch {
    // Not a URL at all — treat as raw path already
    return floorPlanImage;
  }
};

/* ─────────────────────────────────────────────────────────────
   DocumentViewer (Floor Plan)

   Route: GET /api/project-image/{path}  ->where('path','.*')
   Returns raw file bytes — use directly as <img> or <iframe> src.
   The Sanctum cookie is sent automatically for same-origin requests.
───────────────────────────────────────────────────────────── */
const FloorPlanViewer = ({ rawPath, projectName, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const src   = `/api/project-image/${rawPath}`;
  const isPDF = rawPath?.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px',
          width: '100%', maxWidth: '1000px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
            📐 Floor Plan — {projectName}
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '12px', fontWeight: 600, color: '#374151',
                textDecoration: 'none', padding: '5px 12px', borderRadius: '6px',
                border: '1px solid #d1d5db', background: '#f9fafb',
              }}
            >
              ⬇ Open Full Image
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', fontSize: '1.5rem',
                cursor: 'pointer', color: '#64748b', padding: '4px 8px',
              }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflow: 'auto', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f1f5f9', padding: '20px', minHeight: '400px',
        }}>
          {/* Spinner */}
          {!loaded && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <p style={{ margin: 0 }}>Opening document…</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
              <p style={{ margin: 0 }}>
                Failed to load floor plan.{' '}
                <a href={src} target="_blank" rel="noreferrer" style={{ color: '#2563EB' }}>
                  Try opening directly.
                </a>
              </p>
            </div>
          )}

          {isPDF ? (
            <iframe
              src={src}
              title="Floor Plan"
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                width: '100%', height: '70vh', border: 'none', borderRadius: '4px',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          ) : (
            <img
              src={src}
              alt="Floor Plan"
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain',
                borderRadius: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: '6px',
              border: '1px solid #d1d5db', background: '#f9fafb',
              cursor: 'pointer', fontSize: '14px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── Save indicator ─────────────────── */
const SaveIndicator = ({ status }) => {
  const cfg = {
    idle:   { color: 'transparent',                    text: '' },
    saving: { color: 'var(--pm-text-muted, #9ca3af)',  text: '● Saving…' },
    saved:  { color: '#10B981',                         text: '✓ Draft saved' },
    error:  { color: '#EF4444',                         text: '✕ Save failed' },
  }[status] || { color: 'transparent', text: '' };

  return (
    <span style={{
      fontSize: '12px', fontWeight: 600, color: cfg.color,
      transition: 'color 0.3s', minWidth: '90px', whiteSpace: 'nowrap',
    }}>
      {cfg.text}
    </span>
  );
};

/* ─────────────────── Phase divider ─────────────────── */
const PhaseDivider = ({ label }) => (
  <div className="boq-phase-divider">
    <span className="boq-phase-divider-label">{label}</span>
  </div>
);

/* ─────────────────── Measurement card ─────────────────── */
const MeasurementCard = ({
  title, sqmValue, onSqmChange,
  notesValue, onNotesChange,
  readOnly, variant = 'gray',
}) => (
  <div className={`pm-card-${variant} boq-meas-card`}>
    <label className="pm-label boq-meas-label">
      {title}
      <span className="boq-meas-unit">sqm</span>
    </label>
    <div className="boq-meas-row">
      <input
        type="number"
        min="0"
        step="0.01"
        value={sqmValue || ''}
        onChange={onSqmChange}
        readOnly={readOnly}
        className="pm-input boq-sqm-input"
        style={readOnly ? { background: 'var(--pm-bg-muted,#f3f4f6)', cursor: 'not-allowed' } : {}}
        placeholder="0.00"
      />
      <textarea
        value={notesValue || ''}
        onChange={onNotesChange}
        readOnly={readOnly}
        placeholder={readOnly ? 'No notes entered.' : 'Input measurement notes…'}
        className="pm-textarea boq-meas-notes"
        rows={2}
        style={readOnly ? { background: 'var(--pm-bg-muted,#f3f4f6)', cursor: 'not-allowed' } : {}}
      />
    </div>
  </div>
);

/* ─────────────────── Main component ─────────────────── */
const PhaseBoq = ({
  project,
  boqData,
  setBoqData,
  addBoqRow,
  removeBoqRow,
  handleBoqChange,
  onSubmitPlan,
  onSubmitActual,
  renderDocumentLink,
  phase = 'plan',
}) => {

  const [saveStatus,         setSaveStatus]         = useState('idle');
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const draftTimerRef  = useRef(null);
  const statusTimerRef = useRef(null);
  const isFirstRender  = useRef(true);
  const isActual       = phase === 'actual';

  // ── Resolve the raw storage path from whatever the backend sends ──
  // backend sends: url('/api/project-image/' . $raw_path)
  // we need just the raw_path to feed back into /api/project-image/{path}
  const rawFloorPlanPath = resolveFloorPlanPath(project?.floor_plan_image);
  const hasFloorPlan     = !!rawFloorPlanPath;

  /* ── Auto-populate finalBOQ from planBOQ when entering actual phase ── */
  useEffect(() => {
    if (phase !== 'actual') return;
    const planRows  = boqData.planBOQ  || [];
    const finalRows = boqData.finalBOQ || [];
    if (planRows.length > 0 && finalRows.length === 0) {
      setBoqData(prev => ({ ...prev, finalBOQ: planRows.map(r => ({ ...r })) }));
    }
  }, [phase]);

  /* ── Draft save ── */
  const saveDraft = useCallback(async () => {
    if (!project?.id) return;
    setSaveStatus('saving');
    try {
      const payload = isActual
        ? {
            actual_measurement: boqData.actualMeasurement,
            actual_sqm:         boqData.actualSqm,
            final_boq:          JSON.stringify(boqData.finalBOQ),
          }
        : {
            plan_measurement: boqData.planMeasurement,
            plan_sqm:         boqData.planSqm,
            plan_boq:         JSON.stringify(boqData.planBOQ),
          };

      await api.patch(`/projects/${project.id}/boq-draft`, payload);
      setSaveStatus('saved');
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [boqData, project?.id, isActual]);

  /* ── Debounce draft save ── */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearTimeout(draftTimerRef.current);
    setSaveStatus('saving');
    draftTimerRef.current = setTimeout(saveDraft, 1500);
    return () => clearTimeout(draftTimerRef.current);
  }, [
    boqData.planSqm, boqData.planMeasurement, boqData.planBOQ,
    boqData.actualSqm, boqData.actualMeasurement, boqData.finalBOQ,
  ]);

  useEffect(() => {
    return () => {
      clearTimeout(draftTimerRef.current);
      clearTimeout(statusTimerRef.current);
    };
  }, []);

  /* ── PDF export ── */
  const handleExportPDF = () => {
    const planRows  = boqData.planBOQ  || [];
    const finalRows = boqData.finalBOQ || [];

    const tableRows = (rows) => {
      if (rows.length === 0) {
        return `<tr><td colspan="6" style="text-align:center;font-style:italic;color:#9ca3af;padding:14px">No items.</td></tr>`;
      }
      const body = rows.map(r => `
        <tr>
          <td>${r.product_category || '—'}</td>
          <td>${r.product_code || '—'}</td>
          <td style="text-align:center">${r.unit || '—'}</td>
          <td style="text-align:center">${r.qty || 0}</td>
          <td style="text-align:right">${fmt(r.unitCost)}</td>
          <td style="text-align:right;font-weight:700">${fmt(r.total)}</td>
        </tr>
      `).join('');
      const total = grandTotal(rows);
      return body + `
        <tr style="background:#221f1f;border-top:2px solid #C20100">
          <td colspan="5" style="text-align:right;font-weight:700;color:#fff;padding:10px 12px;font-size:12pt;text-transform:uppercase;letter-spacing:.04em">Grand Total:</td>
          <td style="text-align:right;font-weight:900;color:#fff;padding:10px 12px;font-size:13pt">${fmt(total)}</td>
        </tr>
      `;
    };

    const projectName = project?.project_name || '—';
    const clientName  = project?.client_name  || '—';
    const location    = project?.location     || '—';
    const salesRep    = project?.created_by_name || '—';
    const engineers   = project?.assigned_engineers || '—';

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>BOQ — ${projectName}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; padding: 28px 32px; }
.header { display:flex; justify-content:space-between; border-bottom:3px solid #C20100; padding-bottom:14px; margin-bottom:20px; }
.header h1 { font-size:22pt; font-weight:900; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:14px 18px; margin-bottom:22px; }
.info-row { display:flex; gap:8px; font-size:10pt; }
.info-label { font-weight:700; color:#6b7280; min-width:90px; text-transform:uppercase; font-size:8.5pt; }
.meas-cols { display:flex; gap:16px; margin-bottom:20px; }
.meas-col { flex:1; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px 16px; }
.meas-col strong { font-size:8.5pt; text-transform:uppercase; color:#6b7280; display:block; margin-bottom:4px; }
.sqm { font-size:18pt; font-weight:900; color:#221f1f; margin-bottom:4px; }
.section { margin-bottom:24px; }
.section h3 { font-size:10.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.06em; border-bottom:2px solid #221f1f; padding-bottom:6px; margin-bottom:10px; }
table { width:100%; border-collapse:collapse; font-size:10pt; }
thead tr { background:#221f1f; }
thead th { color:#fff; font-weight:700; text-transform:uppercase; font-size:8.5pt; padding:9px 12px; text-align:left; white-space:nowrap; }
thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6) { text-align:right; }
tbody tr { border-bottom:0.5pt solid #e5e7eb; }
tbody tr:nth-child(even) { background:#fafafa; }
tbody td { padding:7px 12px; }
.footer { margin-top:32px; border-top:0.5pt solid #d1d5db; padding-top:8px; font-size:8pt; color:#9ca3af; text-align:center; }
@page { size:A4 landscape; margin:12mm 14mm; }
</style></head><body>
<div class="header">
  <div><h1>Bill of Quantities</h1><p>${phase === 'actual' ? 'Plan & Actual Report' : 'Plan Report'}</p></div>
  <div style="text-align:right;font-size:10pt;line-height:1.9"><b>Date:</b> ${new Date().toLocaleDateString('en-PH', { year:'numeric',month:'long',day:'numeric' })}</div>
</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">Project</span><span>${projectName}</span></div>
  <div class="info-row"><span class="info-label">Client</span><span>${clientName}</span></div>
  <div class="info-row"><span class="info-label">Location</span><span>${location}</span></div>
  <div class="info-row"><span class="info-label">Sales Rep</span><span>${salesRep}</span></div>
  <div class="info-row"><span class="info-label">Engineer(s)</span><span>${engineers}</span></div>
  <div class="info-row"><span class="info-label">Phase</span><span>${phase === 'actual' ? 'Actual Measurement' : 'Measurement based on Plan'}</span></div>
</div>
<div class="section"><h3>Plan BOQ</h3>
  <table><thead><tr><th>Category</th><th>Code</th><th>Unit</th><th>Qty</th><th>Unit Cost (₱)</th><th>Total (₱)</th></tr></thead>
  <tbody>${tableRows(planRows)}</tbody></table>
</div>
${phase === 'actual' ? `
<div class="meas-cols">
  <div class="meas-col"><strong>Measurement Based on Plan</strong><div class="sqm">${boqData.planSqm || '0.00'} sqm</div><p>${boqData.planMeasurement || '—'}</p></div>
  <div class="meas-col" style="border-left:3px solid #C20100"><strong>Actual Site Measurement</strong><div class="sqm">${boqData.actualSqm || '0.00'} sqm</div><p>${boqData.actualMeasurement || '—'}</p></div>
</div>
<div class="section"><h3>Final BOQ (Actual)</h3>
  <table><thead><tr><th>Category</th><th>Code</th><th>Unit</th><th>Qty</th><th>Unit Cost (₱)</th><th>Total (₱)</th></tr></thead>
  <tbody>${tableRows(finalRows)}</tbody></table>
</div>` : `
<div class="meas-cols">
  <div class="meas-col"><strong>Plan Measurement</strong><div class="sqm">${boqData.planSqm || '0.00'} sqm</div><p>${boqData.planMeasurement || '—'}</p></div>
</div>`}
<div class="footer">Vision International Construction OPC · BOQ · ${new Date().toLocaleString('en-PH')}</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups to export PDF.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="boq-phase-root">

      {/* Rejection banner */}
      {project?.rejection_notes && (
        <div className="pm-card-red">
          <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
          <p className="pm-text-muted" style={{ margin: 0 }}>"{project.rejection_notes}"</p>
        </div>
      )}

      {/* ── Floor Plan Reference ── */}
      <div className="pm-card-gray" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h3 className="pm-title-md">📐 Floor Plan Reference</h3>
            <p className="pm-text-muted" style={{ margin: 0 }}>
              {hasFloorPlan
                ? 'Click the button to view the uploaded floor plan.'
                : 'No floor plan uploaded yet for this project.'}
            </p>
          </div>
          <button
            onClick={() => hasFloorPlan && setShowFloorPlanModal(true)}
            disabled={!hasFloorPlan}
            className="boq-export-btn"
            style={{
              background:    hasFloorPlan ? '#497B97' : '#e5e7eb',
              color:         hasFloorPlan ? '#fff'    : '#9ca3af',
              border:        'none',
              padding:       '10px 20px',
              borderRadius:  '6px',
              cursor:        hasFloorPlan ? 'pointer' : 'not-allowed',
              fontWeight:    600,
              fontSize:      '13px',
              display:       'flex',
              alignItems:    'center',
              gap:           '6px',
            }}
          >
            📄 View Floor Plan Reference
          </button>
        </div>
      </div>

      {/* Floor Plan Modal */}
      {showFloorPlanModal && hasFloorPlan && (
        <FloorPlanViewer
          rawPath={rawFloorPlanPath}
          projectName={project?.project_name || 'Project'}
          onClose={() => setShowFloorPlanModal(false)}
        />
      )}

      {/* ══ PLAN SECTION ══ */}
      <PhaseDivider label="Plan Phase" />

      <div style={{ opacity: isActual ? 0.75 : 1, pointerEvents: isActual ? 'none' : 'auto' }}>
        <MeasurementCard
          title="Plan Measurement Notes"
          sqmValue={boqData.planSqm}
          onSqmChange={e => setBoqData({ ...boqData, planSqm: e.target.value })}
          notesValue={boqData.planMeasurement}
          onNotesChange={e => setBoqData({ ...boqData, planMeasurement: e.target.value })}
          readOnly={isActual}
          variant="gray"
        />

        <BoqTable
          type="planBOQ"
          boqData={boqData}
          readOnly={isActual}
          onAdd={addBoqRow}
          onRemove={removeBoqRow}
          onChange={handleBoqChange}
        />
      </div>

      {/* Plan action row */}
      {!isActual && (
        <div className="boq-action-row">
          <PrimaryButton variant="red" onClick={onSubmitPlan}>
            Save Plan Data &amp; Proceed to Site Visit
          </PrimaryButton>
          <button type="button" className="boq-export-btn" onClick={handleExportPDF}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="12" x2="12" y2="18"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Export PDF
          </button>
          <SaveIndicator status={saveStatus} />
        </div>
      )}

      {/* ══ ACTUAL SECTION ══ */}
      {isActual && (
        <>
          <PhaseDivider label="Actual Phase" />

          <div className="boq-measurements-row">
            <MeasurementCard
              title="Measurement Based on Plan"
              sqmValue={boqData.planSqm}
              notesValue={boqData.planMeasurement}
              readOnly={true}
              variant="gray"
            />
            <MeasurementCard
              title="Actual Site Measurement"
              sqmValue={boqData.actualSqm}
              onSqmChange={e => setBoqData({ ...boqData, actualSqm: e.target.value })}
              notesValue={boqData.actualMeasurement}
              onNotesChange={e => setBoqData({ ...boqData, actualMeasurement: e.target.value })}
              readOnly={false}
              variant="cream"
            />
          </div>

          <BoqTable
            type="finalBOQ"
            boqData={boqData}
            readOnly={false}
            onAdd={addBoqRow}
            onRemove={removeBoqRow}
            onChange={handleBoqChange}
          />

          <div className="boq-action-row">
            <PrimaryButton variant="red" onClick={onSubmitActual}>
              Submit Final BOQ for Approval
            </PrimaryButton>
            <button type="button" className="boq-export-btn" onClick={handleExportPDF}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="12" x2="12" y2="18"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Export PDF
            </button>
            <SaveIndicator status={saveStatus} />
          </div>
        </>
      )}
    </div>
  );
};

export default PhaseBoq;