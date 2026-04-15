import React from 'react';
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

const nowStr = () =>
  new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) +
  ' at ' +
  new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

/* ─────────────────── PDF export ─────────────────── */
const handleExportPDF = (project, boqData) => {
  const planRows  = boqData?.planBOQ  || [];
  const finalRows = boqData?.finalBOQ || [];

  // ── Resolve project fields ──────────────────────────────────────────────
  const projectName = project?.project_name || project?.name               || '—';
  const clientName  = project?.client_name  || project?.client             || '—';
  const location    = project?.location     || project?.project_location   || '—';
  const salesRep    = project?.sales_rep_name
                   || project?.created_by_name
                   || project?.sales_name
                   || project?.lead?.salesRep?.name
                   || '—';
  const engineers   = project?.assigned_engineers
                   || (Array.isArray(project?.engineers)
                        ? project.engineers.map(e => e.name || e).join(', ')
                        : project?.engineer_name || '—');

  // ── BOQ table rows builder ──────────────────────────────────────────────
  const buildRows = (rows) => {
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="6" style="text-align:center;font-style:italic;color:#9ca3af;padding:18px">No items entered.</td></tr>`;
    }
    const body = rows.map(r => `
      <tr>
        <td>${r.product_category || '—'}</td>
        <td>${r.product_code     || '—'}</td>
        <td style="text-align:center">${r.unit || '—'}</td>
        <td style="text-align:center">${r.qty  || 0}</td>
        <td style="text-align:right">${fmt(r.unitCost)}</td>
        <td style="text-align:right;font-weight:700">${fmt(r.total)}</td>
      </tr>
    `).join('');
    const total = grandTotal(rows);
    return body + `
      <tr class="grand-total-row">
        <td colspan="5" style="text-align:right">Grand Total Budget:</td>
        <td style="text-align:right">${fmt(total)}</td>
      </tr>
    `;
  };

  // ── Variance calculation ────────────────────────────────────────────────
  const planSqm   = parseFloat(boqData?.planSqm)   || 0;
  const actualSqm = parseFloat(boqData?.actualSqm) || 0;
  const diff      = actualSqm - planSqm;
  const pct       = planSqm > 0 ? ((diff / planSqm) * 100).toFixed(1) : '0.0';
  const varianceHtml = planSqm && actualSqm && diff !== 0
    ? `<span style="
        margin-left:10px;font-size:10pt;font-weight:600;padding:2px 10px;
        border-radius:999px;
        background:${diff > 0 ? '#FEF2F2' : '#F0FDF4'};
        color:${diff > 0 ? '#DC2626' : '#16A34A'};
        border:1px solid ${diff > 0 ? '#FECACA' : '#A7F3D0'};
      ">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toLocaleString()} sqm (${diff > 0 ? '+' : ''}${pct}%)</span>`
    : diff === 0 && planSqm
      ? `<span style="margin-left:10px;font-size:10pt;color:#6b7280">✓ Exact match</span>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BOQ Report — ${projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      color: #221f1f;
      padding: 32px 36px;
      background: #fff;
    }

    /* ── Header ── */
    .rp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      margin-bottom: 22px;
      border-bottom: 4px solid #C20100;
    }
    .rp-co-name {
      font-size: 17pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #221f1f;
    }
    .rp-co-sub  { font-size: 9pt; color: #497B97; font-weight: 600; margin-top: 3px; }
    .rp-co-tag  { font-size: 8pt; color: #94a3b8; margin-top: 2px; }
    .rp-meta    { text-align: right; }
    .rp-title   { font-size: 14pt; font-weight: 800; color: #C20100; letter-spacing: .02em; }
    .rp-date    { font-size: 9pt; color: #64748b; margin-top: 4px; }

    /* ── Project info grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 28px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .info-row   { display: flex; gap: 10px; align-items: baseline; }
    .info-label {
      font-weight: 700; color: #6b7280; min-width: 96px;
      text-transform: uppercase; font-size: 8pt; letter-spacing: .05em;
      flex-shrink: 0;
    }
    .info-value { color: #221f1f; font-size: 10.5pt; }

    /* ── Section heading ── */
    .sec {
      font-size: 9pt; font-weight: 800; color: #221f1f;
      text-transform: uppercase; letter-spacing: .09em;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .sec::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

    /* ── Measurement cards ── */
    .meas-cols  { display: flex; gap: 16px; margin-bottom: 24px; }
    .meas-col {
      flex: 1; border-radius: 8px; padding: 14px 18px;
      background: #f9fafb; border: 1px solid #e5e7eb;
    }
    .meas-col-plan   { border-top: 4px solid #3B82F6; }
    .meas-col-actual { border-top: 4px solid #10B981; }
    .meas-col-label {
      font-size: 8pt; text-transform: uppercase; letter-spacing: .06em;
      font-weight: 700; color: #6b7280; margin-bottom: 6px;
    }
    .meas-col-plan .meas-col-label   { color: #3B82F6; }
    .meas-col-actual .meas-col-label { color: #10B981; }
    .meas-sqm {
      font-size: 20pt; font-weight: 800; color: #221f1f;
      display: flex; align-items: center; flex-wrap: wrap;
      gap: 6px; margin-bottom: 4px;
    }
    .meas-notes { font-size: 9.5pt; color: #6b7280; font-style: italic; }

    /* ── BOQ Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 28px; }
    thead tr { background: #221f1f; }
    thead th {
      padding: 10px 12px; text-align: left; color: #fff;
      font-size: 8.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em; white-space: nowrap;
    }
    thead th:nth-child(3),
    thead th:nth-child(4),
    thead th:nth-child(5),
    thead th:nth-child(6) { text-align: right; }
    tbody tr                  { border-bottom: 0.5pt solid #e5e7eb; }
    tbody tr:nth-child(even)  { background: #fafafa; }
    tbody td                  { padding: 8px 12px; }
    .grand-total-row {
      background: #221f1f !important;
      border-top: 2px solid #C20100;
    }
    .grand-total-row td {
      color: #fff;
      font-weight: 800;
      font-size: 12pt;
      padding: 10px 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    /* ── Footer ── */
    .rp-footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 0.5pt solid #d1d5db;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
    .rp-footer strong { color: #C20100; }

    @page { size: A4 landscape; margin: 12mm 14mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="rp-header">
    <div>
      <div class="rp-co-name">Vision International Construction OPC</div>
      <div class="rp-co-sub">VICMIS — Management Information System</div>
      <div class="rp-co-tag">"You Envision, We Build!"</div>
    </div>
    <div class="rp-meta">
      <div class="rp-title">Bill of Quantities Report</div>
      <div class="rp-date">Generated: ${nowStr()}</div>
    </div>
  </div>

  <!-- Project info -->
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Project</span>
      <span class="info-value">${projectName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Client</span>
      <span class="info-value">${clientName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Location</span>
      <span class="info-value">${location}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Sales Rep</span>
      <span class="info-value">${salesRep}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Engineer(s)</span>
      <span class="info-value">${engineers}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Report Type</span>
      <span class="info-value">Plan &amp; Actual Measurement</span>
    </div>
  </div>

  <!-- Measurements -->
  <div class="sec">Site Measurements</div>
  <div class="meas-cols">
    <div class="meas-col meas-col-plan">
      <div class="meas-col-label">📐 Measurement Based on Plan</div>
      <div class="meas-sqm">${planSqm ? planSqm.toLocaleString() + ' sqm' : '—'}</div>
      <div class="meas-notes">${boqData?.planMeasurement || 'No plan notes provided.'}</div>
    </div>
    <div class="meas-col meas-col-actual">
      <div class="meas-col-label">📏 Actual Site Measurement</div>
      <div class="meas-sqm">
        ${actualSqm ? actualSqm.toLocaleString() + ' sqm' : '—'}
        ${varianceHtml}
      </div>
      <div class="meas-notes">${boqData?.actualMeasurement || 'No site notes provided.'}</div>
    </div>
  </div>

  <!-- Plan BOQ -->
  <div class="sec">Plan BOQ</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Product Code</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Cost (₱)</th>
        <th style="text-align:right">Total (₱)</th>
      </tr>
    </thead>
    <tbody>${buildRows(planRows)}</tbody>
  </table>

  <!-- Final / Actual BOQ -->
  <div class="sec">Final BOQ (Actual)</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Product Code</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Cost (₱)</th>
        <th style="text-align:right">Total (₱)</th>
      </tr>
    </thead>
    <tbody>${buildRows(finalRows)}</tbody>
  </table>

  <!-- Footer -->
  <div class="rp-footer">
    <span>VICMIS — <strong>Confidential</strong> · Do not distribute without authorization</span>
    <span>Bill of Quantities Report · ${new Date().toLocaleDateString('en-PH')}</span>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=780');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to export the PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
};

/* ─────────────────── Component ─────────────────── */
const PhaseBOQReview = ({ project, boqData, onAdvance, onReject, renderDocumentLink }) => (
  <div>
    <div className="pm-card-gray">
      <h3 className="pm-title-lg">Review Engineering Final BOQ</h3>
      {renderDocumentLink('Floor Plan Reference', project.floor_plan_image)}

      {/* ── Measurement comparison ── */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>

        <div className="pm-card" style={{ flex: 1, margin: 0, borderLeft: '4px solid var(--pm-blue, #3B82F6)' }}>
          <label className="pm-label" style={{ color: 'var(--pm-blue, #3B82F6)', marginBottom: '8px', display: 'block' }}>
            📐 Measurement Based on Plan
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '22px', fontWeight: '700', color: 'var(--pm-text-dark)',
              background: 'var(--pm-bg-muted, #EFF6FF)', padding: '4px 12px', borderRadius: '6px',
            }}>
              {boqData.planSqm ? `${parseFloat(boqData.planSqm).toLocaleString()} sqm` : '—'}
            </span>
          </div>
          <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--pm-text-muted)', margin: 0 }}>
            {boqData.planMeasurement || 'No plan notes provided.'}
          </p>
        </div>

        <div className="pm-card" style={{ flex: 1, margin: 0, borderLeft: '4px solid var(--pm-green, #10B981)' }}>
          <label className="pm-label" style={{ color: 'var(--pm-green, #10B981)', marginBottom: '8px', display: 'block' }}>
            📏 Actual Site Measurement
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '22px', fontWeight: '700', color: 'var(--pm-text-dark)',
              background: 'var(--pm-bg-muted, #F0FDF4)', padding: '4px 12px', borderRadius: '6px',
            }}>
              {boqData.actualSqm ? `${parseFloat(boqData.actualSqm).toLocaleString()} sqm` : '—'}
            </span>
            {boqData.planSqm && boqData.actualSqm && (() => {
              const diff = parseFloat(boqData.actualSqm) - parseFloat(boqData.planSqm);
              const pct  = ((diff / parseFloat(boqData.planSqm)) * 100).toFixed(1);
              const isOver  = diff > 0;
              const isExact = diff === 0;
              return !isExact ? (
                <span style={{
                  fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                  background: isOver ? '#FEF2F2' : '#F0FDF4',
                  color: isOver ? '#DC2626' : '#16A34A',
                }}>
                  {isOver ? '▲' : '▼'} {Math.abs(diff).toLocaleString()} sqm ({isOver ? '+' : ''}{pct}%)
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--pm-text-muted)' }}>✓ Exact match</span>
              );
            })()}
          </div>
          <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--pm-text-muted)', margin: 0 }}>
            {boqData.actualMeasurement || 'No site notes provided.'}
          </p>
        </div>

      </div>
    </div>

    {/* Final BOQ table — read-only */}
    <BoqTable
      type="finalBOQ"
      boqData={boqData}
      readOnly={true}
      onAdd={() => {}}
      onRemove={() => {}}
      onChange={() => {}}
    />

    {/* Action row */}
    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
      <button
        onClick={() => onReject('Actual Measurement')}
        className="pm-btn pm-btn-outline"
        style={{ flex: 1, color: 'var(--pm-red)', borderColor: 'var(--pm-red)' }}
      >
        ❌ Reject &amp; Return to Staff
      </button>

      {/* Export PDF button — matches InventoryReports style */}
      <button
        type="button"
        onClick={() => handleExportPDF(project, boqData)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
          background: '#f9fafb', border: '1.5px solid #d1d5db',
          color: '#374151', fontWeight: '600', fontSize: '13px',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print / Export PDF
      </button>

      <PrimaryButton
        variant="green"
        onClick={() => onAdvance('P.O & Work Order')}
        style={{ flex: 1 }}
      >
        ✓ Approve BOQ &amp; Return to Sales
      </PrimaryButton>
    </div>
  </div>
);

export default PhaseBOQReview;