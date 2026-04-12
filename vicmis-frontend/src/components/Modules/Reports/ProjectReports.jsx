import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './Reports.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat('en-PH').format(n ?? 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ── Print helper ──────────────────────────────────────────────────────────────
const printReport = (title, tableHTML, summaryHTML = '') => {
  const win = window.open('', '_blank', 'width=1050,height=780');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>VICMIS — ${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;color:#221F1F;padding:36px;font-size:12px;background:#fff}
      .rp-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:4px solid #C20100}
      .rp-co{display:flex;flex-direction:column;gap:3px}
      .rp-co-name{font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#221F1F}
      .rp-co-sub{font-size:10px;color:#497B97;font-weight:600;letter-spacing:.03em}
      .rp-co-tag{font-size:9px;color:#94a3b8;margin-top:1px}
      .rp-meta{text-align:right}
      .rp-title{font-size:15px;font-weight:800;color:#C20100;letter-spacing:.02em}
      .rp-date{font-size:10px;color:#64748b;margin-top:4px}
      .summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
      .chip{flex:1;min-width:110px;background:#FAF8F6;border:1px solid #EBDBD6;border-top:3px solid #497B97;border-radius:8px;padding:10px 14px}
      .chip.red{border-top-color:#C20100}.chip.green{border-top-color:#16a34a}.chip.blue{border-top-color:#497B97}
      .chip-val{font-size:19px;font-weight:800;color:#221F1F;line-height:1}
      .chip-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-top:3px}
      .sec{font-size:10px;font-weight:800;color:#221F1F;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
      .sec::after{content:'';flex:1;height:1px;background:#EBDBD6}
      table{width:100%;border-collapse:collapse;font-size:11px}
      thead{background:#221F1F}
      th{padding:9px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
      td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#221F1F}
      tr:nth-child(even) td{background:#FAF8F6}
      tr:last-child td{border-bottom:none}
      .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap}
      .badge-blue{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
      .badge-yellow{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}
      .rp-footer{margin-top:24px;padding-top:12px;border-top:1px solid #EBDBD6;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
      .rp-footer strong{color:#C20100}
    </style></head><body>
    <div class="rp-header">
      <div class="rp-co">
        <div class="rp-co-name">Vision International Construction OPC</div>
        <div class="rp-co-sub">VICMIS — Management Information System</div>
        <div class="rp-co-tag">"You Envision, We Build!"</div>
      </div>
      <div class="rp-meta">
        <div class="rp-title">${title}</div>
        <div class="rp-date">Generated: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})} at ${new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>
    ${summaryHTML}${tableHTML}
    <div class="rp-footer">
      <span>VICMIS — <strong>Confidential</strong> · Do not distribute without authorization</span>
      <span>${title} · ${new Date().toLocaleDateString('en-PH')}</span>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
  win.document.close();
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, onPrint, loading, children }) => (
  <div className="rpt-sec-header">
    <div className="rpt-sec-header-left">
      <h2 className="rpt-sec-title">{title}</h2>
      <p className="rpt-sec-sub">{subtitle}</p>
    </div>
    <div className="rpt-sec-actions">
      {children}
      {onPrint && (
        <button className="rpt-btn rpt-btn-print" onClick={onPrint} disabled={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print / PDF
        </button>
      )}
    </div>
  </div>
);

const SummaryRow = ({ chips }) => (
  <div className="rpt-summary-row">
    {chips.map((c, i) => (
      <div key={i} className="rpt-chip" style={{ '--chip-accent': c.color || '#497B97' }}>
        <div className="rpt-chip-val">{c.value}</div>
        <div className="rpt-chip-label">{c.label}</div>
      </div>
    ))}
  </div>
);

const Empty = ({ msg = 'No data found for the selected period.' }) => (
  <div className="rpt-empty"><div className="rpt-empty-icon">📭</div><p>{msg}</p></div>
);

const Spinner = () => (
  <div className="rpt-loading"><div className="rpt-spinner" /></div>
);

const BADGE = {
  blue:    'rpt-badge rpt-badge-blue',
  low:     'rpt-badge rpt-badge-low',
};

// ── Project Status ────────────────────────────────────────────────────────────
export const ProjectStatus = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(r => setData(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = data.reduce((acc, p) => {
    const s = p.status || 'Unknown'; acc[s] = (acc[s] || 0) + 1; return acc;
  }, {});

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${data.length}</div><div class="chip-label">Total Projects</div></div>
      ${Object.entries(byStatus).map(([s, c]) => `<div class="chip"><div class="chip-val">${c}</div><div class="chip-label">${s}</div></div>`).join('')}
    </div>`;
    const rows = data.map(p => `<tr>
      <td><strong>${p.project_name || p.name || '—'}</strong></td><td>${p.client_name || '—'}</td>
      <td>${p.location || '—'}</td><td><span class="badge badge-blue">${p.status || '—'}</span></td>
      <td>${fmtDate(p.created_at)}</td><td>${p.project_type || '—'}</td></tr>`).join('');
    printReport('Project Status Summary',
      `<div class="sec">All Projects</div><table><thead><tr>
        <th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th>
      </tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No projects found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Project Status Summary" subtitle="Overview of all projects and their current construction stage" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: data.length, label: 'Total Projects', color: '#497B97' },
        ...Object.entries(byStatus).map(([s, c]) => ({ value: c, label: s, color: '#6366f1' })),
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th></tr></thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i}>
                  <td className="rpt-fw">{p.project_name || p.name || '—'}</td>
                  <td>{p.client_name || '—'}</td>
                  <td>{p.location || '—'}</td>
                  <td><span className={BADGE.blue}>{p.status || '—'}</span></td>
                  <td className="rpt-dim">{fmtDate(p.created_at)}</td>
                  <td>{p.project_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Material Requests ─────────────────────────────────────────────────────────
export const MaterialRequests = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/material-requests/pending')
      .then(r => setData(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Pending Requests</div></div>
    </div>`;
    const rows = data.map(m => `<tr>
      <td><strong>${m.material_name || m.item_name || '—'}</strong></td>
      <td>${m.project?.project_name || m.project_name || '—'}</td>
      <td style="text-align:center">${m.quantity ?? '—'}</td><td>${m.unit || '—'}</td>
      <td><span class="badge badge-yellow">${m.status || 'Pending'}</span></td>
      <td>${fmtDate(m.created_at)}</td>
      <td style="color:#64748b">${m.notes || '—'}</td></tr>`).join('');
    printReport('Material Request Report',
      `<div class="sec">Pending Material Requests</div><table><thead><tr>
        <th>Material</th><th>Project</th><th>Qty</th><th>Unit</th><th>Status</th><th>Requested</th><th>Notes</th>
      </tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No pending material requests.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Material Request Report" subtitle="Pending material requests across all active construction projects" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[{ value: data.length, label: 'Pending Requests', color: '#f59e0b' }]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty msg="No pending material requests." /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Material</th><th>Project</th><th>Qty</th><th>Unit</th><th>Status</th><th>Requested</th><th>Notes</th></tr></thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={i}>
                  <td className="rpt-fw">{m.material_name || m.item_name || '—'}</td>
                  <td>{m.project?.project_name || m.project_name || '—'}</td>
                  <td className="rpt-tc">{m.quantity ?? '—'}</td>
                  <td>{m.unit || '—'}</td>
                  <td><span className={BADGE.low}>{m.status || 'Pending'}</span></td>
                  <td className="rpt-dim">{fmtDate(m.created_at)}</td>
                  <td className="rpt-dim">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
