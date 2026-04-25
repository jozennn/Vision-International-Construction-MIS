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

/* ─────────────────── Save indicator ─────────────────── */
const SaveIndicator = ({ status }) => {
  const cfg = {
    idle:   { color: 'transparent',                     text: '' },
    saving: { color: 'var(--pm-text-muted, #9ca3af)',   text: '● Saving…' },
    saved:  { color: '#10B981',                          text: '✓ Draft saved' },
    error:  { color: '#EF4444',                          text: '✕ Save failed' },
  }[status] || { color: 'transparent', text: '' };

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 600,
      color: cfg.color,
      transition: 'color 0.3s',
      minWidth: '90px',
      whiteSpace: 'nowrap',
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

/* ─────────────────── Floor Plan Viewer Modal ─────────────────── */
const FloorPlanViewer = ({ imageUrl, onClose, projectName }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load floor plan image. The file may be missing or corrupted.');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="floorplan-modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="floorplan-modal-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '1000px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="floorplan-modal-header" style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fffff' }}>📐 Floor Plan: {projectName}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.5rem', 
            cursor: 'pointer', color: '#64748b', padding: '5px'
          }}>✕</button>
        </div>

        <div className="floorplan-modal-body" style={{
          backgroundColor: '#f1f5f9', flex: 1, overflow: 'auto',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          minHeight: '400px', padding: '20px'
        }}>
          {isLoading && !error && (
            <div style={{ textAlign: 'center' }}>
              <div className="floorplan-spinner"></div>
              <p style={{ marginTop: '10px', color: '#64748b' }}>Opening document...</p>
            </div>
          )}
          
          {error ? (
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              <span style={{ fontSize: '3rem' }}>⚠️</span>
              <p>{error}</p>
            </div>
          ) : (
            <img 
              src={imageUrl} 
              alt="Floor Plan"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ 
                display: isLoading ? 'none' : 'block', 
                maxWidth: '100%', 
                maxHeight: '70vh',
                objectFit: 'contain',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                borderRadius: '4px'
              }}
            />
          )}
        </div>

        <div className="floorplan-modal-footer" style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'flex-end', gap: '10px'
        }}>
          <button onClick={onClose} className="pm-btn-secondary" style={{ padding: '8px 20px' }}>Close</button>
          {!error && !isLoading && (
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                padding: '8px 20px', backgroundColor: '#C20100', 
                color: 'white', textDecoration: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: '600'
              }}
            >
              Open Full Image
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

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

  const [saveStatus, setSaveStatus]   = useState('idle');
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const draftTimerRef                 = useRef(null);
  const statusTimerRef                = useRef(null);
  const isFirstRender                 = useRef(true);
  const isActual                      = phase === 'actual';

  /* ── Get floor plan image URL (SMART FIX) ── */
  const getFloorPlanUrl = () => {
  if (!project?.floor_plan_image) return null;
  return project.floor_plan_image;
};

  const floorPlanUrl = getFloorPlanUrl();

  /* ── Auto-populate finalBOQ from planBOQ when entering actual phase ── */
  useEffect(() => {
    if (phase !== 'actual') return;
    const planRows  = boqData.planBOQ  || [];
    const finalRows = boqData.finalBOQ || [];
    if (planRows.length > 0 && finalRows.length === 0) {
      setBoqData(prev => ({ ...prev, finalBOQ: planRows.map(r => ({ ...r })) }));
    }
  }, [phase]); 

  /* ── Draft save function ── */
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

  /* ── Watch boqData — debounce draft save by 1.5s after last change ── */
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
    boqData.planSqm,
    boqData.planMeasurement,
    boqData.planBOQ,
    boqData.actualSqm,
    boqData.actualMeasurement,
    boqData.finalBOQ,
  ]);

  /* Cleanup timers on unmount */
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

    const projectName = project?.project_name || project?.name || '—';
    const clientName  = project?.client_name  || project?.client || '—';
    const location    = project?.location     || project?.address || project?.project_location || '—';
    const salesRep    = project?.created_by_name || project?.sales_name || project?.salesperson || '—';
    const engineers   = project?.assigned_engineers
      || (Array.isArray(project?.engineers)
          ? project.engineers.map(e => e.name || e).join(', ')
          : (project?.engineer_name || '—'));

    const actualSection = phase === 'actual' ? `
      <div class="meas-cols">
        <div class="meas-col">
          <strong>Measurement Based on Plan</strong>
          <div class="sqm">${boqData.planSqm || '0.00'} sqm</div>
          <p>${boqData.planMeasurement || '—'}</p>
        </div>
        <div class="meas-col" style="border-left:3px solid #C20100">
          <strong>Actual Site Measurement</strong>
          <div class="sqm">${boqData.actualSqm || '0.00'} sqm</div>
          <p>${boqData.actualMeasurement || '—'}</p>
        </div>
      </div>
      <div class="section">
        <h3>Final BOQ (Actual)</h3>
        <table>
          <thead><tr>
            <th>Category</th><th>Code</th><th>Unit</th>
            <th>Qty</th><th>Unit Cost (₱)</th><th>Total (₱)</th>
          </tr></thead>
          <tbody>${tableRows(finalRows)}</tbody>
        </table>
      </div>
    ` : `
      <div class="meas-cols">
        <div class="meas-col">
          <strong>Plan Measurement</strong>
          <div class="sqm">${boqData.planSqm || '0.00'} sqm</div>
          <p>${boqData.planMeasurement || '—'}</p>
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BOQ — ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; padding: 28px 32px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #C20100; padding-bottom: 14px; margin-bottom: 20px; }
    .header h1 { font-size: 22pt; font-weight: 900; color: #221f1f; margin-bottom: 4px; }
    .header p  { font-size: 11pt; color: #6b7280; }
    .header-right { font-size: 10pt; text-align: right; color: #374151; line-height: 1.9; }
    .header-right b { font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px; }
    .info-row { display: flex; gap: 8px; font-size: 10pt; }
    .info-label { font-weight: 700; color: #6b7280; min-width: 90px; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .04em; }
    .info-value { color: #111; }
    .meas-cols { display: flex; gap: 16px; margin-bottom: 20px; }
    .meas-col { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
    .meas-col strong { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; display: block; margin-bottom: 4px; }
    .sqm { font-size: 18pt; font-weight: 900; color: #221f1f; margin-bottom: 4px; }
    .meas-col p { font-size: 9.5pt; color: #374151; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #221f1f; border-bottom: 2px solid #221f1f; padding-bottom: 6px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    thead tr { background: #221f1f; }
    thead th { color: #fff; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .05em; padding: 9px 12px; text-align: left; white-space: nowrap; }
    thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
    tbody tr { border-bottom: 0.5pt solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody td { padding: 7px 12px; }
    .footer { margin-top: 32px; border-top: 0.5pt solid #d1d5db; padding-top: 8px; font-size: 8pt; color: #9ca3af; text-align: center; }
    @page { size: A4 landscape; margin: 12mm 14mm; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Bill of Quantities</h1>
      <p>${phase === 'actual' ? 'Plan &amp; Actual Report' : 'Plan Report'}</p>
    </div>
    <div class="header-right">
      <div><b>Date:</b> ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div><b>System:</b> Vision International Construction OPC-MIS</div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Project</span><span class="info-value">${projectName}</span></div>
    <div class="info-row"><span class="info-label">Client</span><span class="info-value">${clientName}</span></div>
    <div class="info-row"><span class="info-label">Location</span><span class="info-value">${location}</span></div>
    <div class="info-row"><span class="info-label">Sales Rep</span><span class="info-value">${salesRep}</span></div>
    <div class="info-row"><span class="info-label">Engineer(s)</span><span class="info-value">${engineers}</span></div>
    <div class="info-row"><span class="info-label">Phase</span><span class="info-value">${phase === 'actual' ? 'Actual Measurement' : 'Measurement based on Plan'}</span></div>
  </div>
  <div class="section">
    <h3>Plan BOQ</h3>
    <table>
      <thead><tr><th>Category</th><th>Code</th><th>Unit</th><th>Qty</th><th>Unit Cost (₱)</th><th>Total (₱)</th></tr></thead>
      <tbody>${tableRows(planRows)}</tbody>
    </table>
  </div>
  ${actualSection}
  <div class="footer">
    Vision International Construction OPC &nbsp;·&nbsp; Bill of Quantities &nbsp;·&nbsp; Generated ${new Date().toLocaleString('en-PH')}
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  /* ── Handle floor plan click ── */
  const handleViewFloorPlan = () => {
    if (floorPlanUrl) {
      setShowFloorPlanModal(true);
    } else {
      alert('No floor plan image uploaded yet.');
    }
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

      {/* Floor plan reference */}
      <div className="pm-card-gray" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="pm-title-md">📐 Floor Plan Reference</h3>
            <p className="pm-text-muted" style={{ margin: 0 }}>
              {floorPlanUrl ? 'Click the button below to view the uploaded floor plan.' : 'No floor plan uploaded yet.'}
            </p>
          </div>
          <button 
            onClick={handleViewFloorPlan}
            disabled={!floorPlanUrl}
            className="boq-export-btn"
            style={{
              background: floorPlanUrl ? '#497B97' : '#ccc',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: floorPlanUrl ? 'pointer' : 'not-allowed'
            }}
          >
            📄 View Floor Plan Reference
          </button>
        </div>
      </div>

      {/* Floor Plan Modal */}
      {showFloorPlanModal && floorPlanUrl && (
        <FloorPlanViewer 
          imageUrl={floorPlanUrl}
          onClose={() => setShowFloorPlanModal(false)}
          projectName={project?.project_name || project?.name || 'Project'}
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