import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './Reports.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      .badge-green{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
      .badge-red{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
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
const SectionHeader = ({ title, subtitle, onPrint, loading }) => (
  <div className="rpt-sec-header">
    <div className="rpt-sec-header-left">
      <h2 className="rpt-sec-title">{title}</h2>
      <p className="rpt-sec-sub">{subtitle}</p>
    </div>
    <div className="rpt-sec-actions">
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

const Empty = ({ msg = 'No data found.' }) => (
  <div className="rpt-empty"><div className="rpt-empty-icon">📭</div><p>{msg}</p></div>
);

const Spinner = () => (
  <div className="rpt-loading"><div className="rpt-spinner" /></div>
);

const BADGE = {
  ok:      'rpt-badge rpt-badge-ok',
  nostock: 'rpt-badge rpt-badge-nostock',
  blue:    'rpt-badge rpt-badge-blue',
};

const PIPELINE_STAGES = [
  { key: 'To be Contacted',            label: 'To Be Contacted',  color: '#64748b' },
  { key: 'Contacted',                  label: 'Contacted',         color: '#2563eb' },
  { key: 'For Presentation',           label: 'For Presentation',  color: '#d97706' },
  { key: 'Ready for Creating Project', label: 'Ready for Project', color: '#059669' },
  { key: 'Project Created',            label: 'Project Created',   color: '#7c3aed' },
];

// ── Lead Conversion ───────────────────────────────────────────────────────────
export const LeadConversion = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leads')
      .then(r => setLeads(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const converted = leads.filter(l => { const s = (l.status || '').toLowerCase(); return s.includes('project') && s.includes('created'); });
  const winRate   = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0;
  const byStage   = PIPELINE_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.key).length }));

  const handlePrint = () => {
    const statusColors = {
      'To be Contacted': '#64748b', 'Contacted': '#2563eb',
      'For Presentation': '#d97706', 'Ready for Creating Project': '#059669', 'Project Created': '#7c3aed',
    };
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total Leads</div></div>
      <div class="chip green"><div class="chip-val">${converted.length}</div><div class="chip-label">Converted</div></div>
      <div class="chip"><div class="chip-val">${winRate}%</div><div class="chip-label">Win Rate</div></div>
      ${byStage.map(s => `<div class="chip"><div class="chip-val">${s.count}</div><div class="chip-label">${s.label}</div></div>`).join('')}
    </div>`;
    const rows = leads.map(l => `<tr>
      <td>#${l.id}</td><td><strong>${l.client_name || '—'}</strong></td>
      <td>${l.project_name || '—'}</td><td>${l.location || '—'}</td>
      <td><span style="color:${statusColors[l.status] || '#64748b'};font-weight:700;font-size:10px">${l.status || '—'}</span></td>
      <td>${l.contact_no || '—'}</td>
      <td>${l.sales_rep?.name || user?.name || '—'}</td>
      <td>${fmtDate(l.created_at)}</td></tr>`).join('');
    printReport('Lead Conversion Report',
      `<div class="sec">All Leads — Active Pipeline</div>
       <table><thead><tr>
         <th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No leads found.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Lead Conversion Report"
        subtitle="Full sales pipeline — from initial lead to converted project"
        onPrint={handlePrint}
        loading={loading}
      />
      <SummaryRow chips={[
        { value: leads.length,     label: 'Total Leads', color: '#497B97' },
        { value: converted.length, label: 'Converted',   color: '#16a34a' },
        { value: `${winRate}%`,    label: 'Win Rate',    color: '#B45309' },
        ...byStage.map(s => ({ value: s.count, label: s.label, color: s.color })),
      ]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>ID</th><th>Client</th><th>Project</th><th>Location</th>
              <th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th>
            </tr></thead>
            <tbody>
              {leads.map((l, i) => {
                const isConv = (l.status || '').toLowerCase().includes('created');
                return (
                  <tr key={i}>
                    <td className="rpt-dim">#{l.id}</td>
                    <td className="rpt-fw">{l.client_name || '—'}</td>
                    <td>{l.project_name || '—'}</td>
                    <td>{l.location || '—'}</td>
                    <td><span className={isConv ? BADGE.ok : BADGE.blue}>{l.status || '—'}</span></td>
                    <td>{l.contact_no || '—'}</td>
                    <td>{l.sales_rep?.name || user?.name || '—'}</td>
                    <td className="rpt-dim">{fmtDate(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Converted Projects ────────────────────────────────────────────────────────
export const ConvertedProjects = ({ user }) => {
  const [leads, setLeads]       = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads'),
      api.get('/projects').catch(() => ({ data: [] })),
    ]).then(([lR, pR]) => {
      const all  = Array.isArray(lR.data) ? lR.data : lR.data?.data ?? [];
      const prjs = Array.isArray(pR.data) ? pR.data : pR.data?.data ?? [];
      const map  = {};
      prjs.forEach(p => { if (p.lead_id) map[p.lead_id] = p; });
      setLeads(all.filter(l => { const s = (l.status || '').toLowerCase(); return s.includes('project') && s.includes('created'); }));
      setProjects(map);
    }).catch(() => setLeads([])).finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Converted Projects</div></div>
    </div>`;
    const rows = leads.map(l => {
      const proj = projects[l.id];
      return `<tr>
        <td>#${l.id}</td><td><strong>${l.client_name || '—'}</strong></td>
        <td>${l.project_name || '—'}</td><td>${l.location || '—'}</td>
        <td><span style="background:#eff6ff;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700">${proj ? proj.status || 'Ongoing' : '—'}</span></td>
        <td>${l.sales_rep?.name || user?.name || '—'}</td>
        <td>${fmtDate(proj?.created_at || l.created_at)}</td></tr>`;
    }).join('');
    printReport('Converted Projects Report',
      `<div class="sec">Leads Converted to Projects</div>
       <table><thead><tr>
         <th>ID</th><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No converted projects found.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Converted Projects Report"
        subtitle="Leads successfully converted to active construction projects"
        onPrint={handlePrint}
        loading={loading}
      />
      <SummaryRow chips={[{ value: leads.length, label: 'Converted Projects', color: '#16a34a' }]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty msg="No converted projects yet." /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>ID</th><th>Client</th><th>Project Name</th><th>Location</th>
              <th>Project Stage</th><th>Sales Rep</th><th>Date Created</th>
            </tr></thead>
            <tbody>
              {leads.map((l, i) => {
                const proj = projects[l.id];
                return (
                  <tr key={i}>
                    <td className="rpt-dim">#{l.id}</td>
                    <td className="rpt-fw">{l.client_name || '—'}</td>
                    <td>{l.project_name || '—'}</td>
                    <td>{l.location || '—'}</td>
                    <td><span className={BADGE.blue}>{proj ? proj.status || 'Ongoing' : '—'}</span></td>
                    <td>{l.sales_rep?.name || user?.name || '—'}</td>
                    <td className="rpt-dim">{fmtDate(proj?.created_at || l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Customer Activity ─────────────────────────────────────────────────────────
export const CustomerActivity = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads'),
      api.get('/leads/trashed').catch(() => ({ data: [] })),
    ]).then(([a, t]) => {
      const active  = Array.isArray(a.data) ? a.data : a.data?.data ?? [];
      const trashed = Array.isArray(t.data) ? t.data : t.data?.data ?? [];
      setLeads([...active, ...trashed.map(l => ({ ...l, is_trashed: true }))]);
    }).catch(() => setLeads([])).finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip green"><div class="chip-val">${leads.filter(l => !l.is_trashed).length}</div><div class="chip-label">Active</div></div>
      <div class="chip red"><div class="chip-val">${leads.filter(l => l.is_trashed).length}</div><div class="chip-label">Trashed</div></div>
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total</div></div>
    </div>`;
    const rows = leads.map(l => `<tr>
      <td><strong>${l.client_name || '—'}</strong></td><td>${l.project_name || '—'}</td>
      <td>${l.contact_no || '—'}</td><td>${l.location || '—'}</td>
      <td>${l.is_trashed ? '<span style="color:#991b1b;font-weight:700">Trashed</span>' : `<span style="font-weight:600">${l.status || '—'}</span>`}</td>
      <td>${l.sales_rep?.name || user?.name || '—'}</td>
      <td>${fmtDate(l.updated_at || l.created_at)}</td></tr>`).join('');
    printReport('Customer Activity Summary',
      `<div class="sec">All Client Interactions</div>
       <table><thead><tr>
         <th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No records found.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Customer Activity Summary"
        subtitle="All client interactions including active leads and archived records"
        onPrint={handlePrint}
        loading={loading}
      />
      <SummaryRow chips={[
        { value: leads.filter(l => !l.is_trashed).length, label: 'Active',  color: '#16a34a' },
        { value: leads.filter(l =>  l.is_trashed).length, label: 'Trashed', color: '#C20100' },
        { value: leads.length,                            label: 'Total',   color: '#497B97' },
      ]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th>
            </tr></thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i} style={{ opacity: l.is_trashed ? 0.65 : 1 }}>
                  <td className="rpt-fw">{l.client_name || '—'}</td>
                  <td>{l.project_name || '—'}</td>
                  <td>{l.contact_no || '—'}</td>
                  <td>{l.location || '—'}</td>
                  <td><span className={l.is_trashed ? BADGE.nostock : BADGE.blue}>{l.is_trashed ? 'Trashed' : l.status || '—'}</span></td>
                  <td>{l.sales_rep?.name || user?.name || '—'}</td>
                  <td className="rpt-dim">{fmtDate(l.updated_at || l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};