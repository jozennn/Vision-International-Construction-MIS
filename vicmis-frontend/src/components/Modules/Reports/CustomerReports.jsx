import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import './css/CustomerReports.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const nowStr = () => new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const today = () => new Date().toISOString().split('T')[0];

// ── Print CSS ─────────────────────────────────────────────────────────────────
const PRINT_CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
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
.chip.red{border-top-color:#C20100}.chip.green{border-top-color:#16a34a}.chip.blue{border-top-color:#497B97}.chip.orange{border-top-color:#f59e0b}
.chip-val{font-size:19px;font-weight:800;color:#221F1F;line-height:1}
.chip-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-top:3px}
.sec{font-size:10px;font-weight:800;color:#221F1F;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec::after{content:'';flex:1;height:1px;background:#EBDBD6}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px}
thead{background:#221F1F}
th{padding:9px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#221F1F}
tr:nth-child(even) td{background:#FAF8F6}
tr:last-child td{border-bottom:none}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap}
.badge-blue{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
.badge-green{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.badge-red{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.badge-orange{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}
.rp-footer{margin-top:24px;padding-top:12px;border-top:1px solid #EBDBD6;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
.rp-footer strong{color:#C20100}
.cover{text-align:center;padding:50px 40px;background:#221F1F;color:#fff;border-radius:12px;margin-bottom:28px}
.cover h1{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.cover p{font-size:11px;color:rgba(235,219,214,.65);margin-bottom:4px}
.period{font-size:11px;color:#C20100;font-weight:700;margin-top:12px;background:rgba(194,1,0,.15);padding:5px 14px;border-radius:999px;display:inline-block}
.toc-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #EBDBD6;font-size:11px}
.tnum{width:22px;height:22px;background:#221F1F;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.tl{font-weight:600}
.ts{color:#94a3b8;font-size:10px;margin-left:auto}
.pb{page-break-before:always;margin-top:32px}
@media print{body{padding:20px}}`;

const printHeader = (title) => `<div class="rp-header">
  <div class="rp-co">
    <div class="rp-co-name">Vision International Construction OPC</div>
    <div class="rp-co-sub">VICMIS — Management Information System</div>
    <div class="rp-co-tag">"You Envision, We Build!"</div>
  </div>
  <div class="rp-meta">
    <div class="rp-title">${title}</div>
    <div class="rp-date">Generated: ${nowStr()}</div>
  </div>
</div>`;

const printFooter = (title) => `<div class="rp-footer">
  <span>VICMIS — <strong>Confidential</strong> · Do not distribute without authorization</span>
  <span>${title} · ${new Date().toLocaleDateString('en-PH')}</span>
</div>`;

const openPrintWindow = (title, body) => {
  const win = window.open('', '_blank', 'width=1100,height=820');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VICMIS — ${title}</title><style>${PRINT_CSS}</style></head><body>${printHeader(title)}${body}${printFooter(title)}<script>window.onload=()=>window.print()<\/script></body></html>`);
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

const Empty = ({ msg = 'No data found.' }) => (
  <div className="rpt-empty"><div className="rpt-empty-icon">📭</div><p>{msg}</p></div>
);

const Spinner = () => (
  <div className="rpt-loading"><div className="rpt-spinner" /></div>
);

// Pagination Component
const ReportPagination = ({ page, totalPages, total, perPage, onPage, onPerPage }) => {
  if (total <= 10 && totalPages <= 1) return null;
  
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const left = page - delta;
    const right = page + delta + 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) pages.push(i);
    }
    const withGaps = [];
    let prev = null;
    for (const p of pages) {
      if (prev !== null && p - prev > 1) withGaps.push('…');
      withGaps.push(p);
      prev = p;
    }
    return withGaps;
  };

  return (
    <div className="rpt-pagination">
      <div className="rpt-pagination-info">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total} items
      </div>
      <div className="rpt-pagination-controls">
        <div className="rpt-perpage-wrap">
          <span>Rows:</span>
          <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} className="rpt-perpage-select">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="rpt-page-btns">
          <button className="rpt-page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
          {buildPages().map((p, i) => p === '…'
            ? <span key={`g${i}`} className="rpt-page-ellipsis">…</span>
            : <button key={p} className={`rpt-page-btn ${page === p ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
          <button className="rpt-page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
        </div>
      </div>
    </div>
  );
};

const BADGE = {
  ok:      'rpt-badge rpt-badge-ok',
  nostock: 'rpt-badge rpt-badge-nostock',
  blue:    'rpt-badge rpt-badge-blue',
  green:   'rpt-badge rpt-badge-green',
  red:     'rpt-badge rpt-badge-red',
  orange:  'rpt-badge rpt-badge-orange',
};

const PIPELINE_STAGES = [
  { key: 'To be Contacted',            label: 'To Be Contacted',  color: '#64748b' },
  { key: 'Contacted',                  label: 'Contacted',         color: '#2563eb' },
  { key: 'For Presentation',           label: 'For Presentation',  color: '#d97706' },
  { key: 'Ready for Creating Project', label: 'Ready for Project', color: '#059669' },
  { key: 'Project Created',            label: 'Project Created',   color: '#7c3aed' },
];

// ── Build Report Rows Functions ───────────────────────────────────────────────
const buildLeadConversionRows = (leads, statusColors) => {
  return leads.map(l => `<tr>
    <td class="rpt-dim">#${l.id}</td>
    <td class="rpt-fw">${l.client_name || '—'}</td>
    <td>${l.project_name || '—'}</td>
    <td>${l.location || '—'}</td>
    <td><span style="background:${statusColors[l.status] || '#64748b'}20;color:${statusColors[l.status] || '#64748b'};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700">${l.status || '—'}</span></td>
    <td>${l.contact_no || '—'}</td>
    <td>${l.sales_rep?.name || '—'}</td>
    <td>${fmtDate(l.created_at)}</td>
  </tr>`).join('');
};

const buildConvertedProjectsRows = (leads, projects) => {
  return leads.map(l => {
    const proj = projects[l.id];
    return `<tr>
      <td class="rpt-fw">${l.client_name || '—'}</td>
      <td>${l.project_name || '—'}</td>
      <td>${l.location || '—'}</td>
      <td><span class="badge badge-blue">${proj ? proj.status || 'Ongoing' : '—'}</span></td>
      <td>${l.sales_rep?.name || '—'}</td>
      <td class="rpt-dim">${fmtDate(proj?.created_at || l.created_at)}</td>
    </tr>`;
  }).join('');
};

const buildCustomerActivityRows = (leads) => {
  return leads.map(l => `<tr>
    <td class="rpt-fw">${l.client_name || '—'}</td>
    <td>${l.project_name || '—'}</td>
    <td>${l.contact_no || '—'}</td>
    <td>${l.location || '—'}</td>
    <td><span class="badge ${l.is_trashed ? 'badge-red' : 'badge-blue'}">${l.is_trashed ? 'Trashed' : l.status || '—'}</span></td>
    <td>${l.sales_rep?.name || '—'}</td>
    <td class="rpt-dim">${fmtDate(l.updated_at || l.created_at)}</td>
  </tr>`).join('');
};

// ── Lead Conversion ───────────────────────────────────────────────────────────
export const LeadConversion = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    api.get('/leads')
      .then(r => setLeads(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const converted = leads.filter(l => { const s = (l.status || '').toLowerCase(); return s.includes('project') && s.includes('created'); });
  const winRate   = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0;
  const byStage   = PIPELINE_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.key).length }));
  
  const totalPages = Math.max(1, Math.ceil(leads.length / perPage));
  const pageData = leads.slice((page - 1) * perPage, page * perPage);

  const statusColors = {
    'To be Contacted': '#64748b', 'Contacted': '#2563eb',
    'For Presentation': '#d97706', 'Ready for Creating Project': '#059669', 'Project Created': '#7c3aed',
  };

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total Leads</div></div>
      <div class="chip green"><div class="chip-val">${converted.length}</div><div class="chip-label">Converted</div></div>
      <div class="chip"><div class="chip-val">${winRate}%</div><div class="chip-label">Win Rate</div></div>
      ${byStage.map(s => `<div class="chip"><div class="chip-val">${s.count}</div><div class="chip-label">${s.label}</div></div>`).join('')}
    </div>`;
    
    const rows = buildLeadConversionRows(leads, statusColors);
    
    printReport('Lead Conversion Report',
      `<div class="sec">All Leads — Active Pipeline</div>
       <table>
        <thead>
          <tr><th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No leads found.</td></tr>'}</tbody>
       </table>`,
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
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>ID</th><th>Client</th><th>Project</th><th>Location</th>
                  <th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((l, i) => {
                  const isConv = (l.status || '').toLowerCase().includes('created');
                  return (
                    <tr key={i}>
                      <td className="rpt-dim">#{l.id}</td>
                      <td className="rpt-fw">{l.client_name || '—'}</td>
                      <td>{l.project_name || '—'}</td>
                      <td>{l.location || '—'}</td>
                      <td><span className={isConv ? BADGE.green : BADGE.blue}>{l.status || '—'}</span></td>
                      <td>{l.contact_no || '—'}</td>
                      <td>{l.sales_rep?.name || user?.name || '—'}</td>
                      <td className="rpt-dim">{fmtDate(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ReportPagination 
            page={page} 
            totalPages={totalPages} 
            total={leads.length} 
            perPage={perPage} 
            onPage={setPage} 
            onPerPage={setPerPage} 
          />
        </>
      )}
    </div>
  );
};

// ── Converted Projects (No ID column) ─────────────────────────────────────────
export const ConvertedProjects = ({ user }) => {
  const [leads, setLeads]       = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(10);

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

  const totalPages = Math.max(1, Math.ceil(leads.length / perPage));
  const pageData = leads.slice((page - 1) * perPage, page * perPage);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Converted Projects</div></div>
    </div>`;
    
    const rows = buildConvertedProjectsRows(leads, projects);
    
    printReport('Converted Projects Report',
      `<div class="sec">Leads Converted to Projects</div>
       <table>
        <thead>
          <tr><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No converted projects found.</td></tr>'}</tbody>
       </table>`,
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
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Client</th><th>Project Name</th><th>Location</th>
                  <th>Project Stage</th><th>Sales Rep</th><th>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((l, i) => {
                  const proj = projects[l.id];
                  return (
                    <tr key={i}>
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
          <ReportPagination 
            page={page} 
            totalPages={totalPages} 
            total={leads.length} 
            perPage={perPage} 
            onPage={setPage} 
            onPerPage={setPerPage} 
          />
        </>
      )}
    </div>
  );
};

// ── Customer Activity (No ID column) ──────────────────────────────────────────
export const CustomerActivity = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

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

  const totalPages = Math.max(1, Math.ceil(leads.length / perPage));
  const pageData = leads.slice((page - 1) * perPage, page * perPage);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip green"><div class="chip-val">${leads.filter(l => !l.is_trashed).length}</div><div class="chip-label">Active</div></div>
      <div class="chip red"><div class="chip-val">${leads.filter(l => l.is_trashed).length}</div><div class="chip-label">Trashed</div></div>
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total</div></div>
    </div>`;
    
    const rows = buildCustomerActivityRows(leads);
    
    printReport('Customer Activity Summary',
      `<div class="sec">All Client Interactions</div>
       <table>
        <thead>
          <tr><th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No records found.</td></tr>'}</tbody>
       </table>`,
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
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Client</th><th>Project</th><th>Contact</th><th>Location</th>
                  <th>Status</th><th>Sales Rep</th><th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((l, i) => (
                  <tr key={i} style={{ opacity: l.is_trashed ? 0.65 : 1 }}>
                    <td className="rpt-fw">{l.client_name || '—'}</td>
                    <td>{l.project_name || '—'}</td>
                    <td>{l.contact_no || '—'}</td>
                    <td>{l.location || '—'}</td>
                    <td><span className={l.is_trashed ? BADGE.red : BADGE.blue}>{l.is_trashed ? 'Trashed' : l.status || '—'}</span></td>
                    <td>{l.sales_rep?.name || user?.name || '—'}</td>
                    <td className="rpt-dim">{fmtDate(l.updated_at || l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportPagination 
            page={page} 
            totalPages={totalPages} 
            total={leads.length} 
            perPage={perPage} 
            onPage={setPage} 
            onPerPage={setPerPage} 
          />
        </>
      )}
    </div>
  );
};

// ── Export All Customer Reports ───────────────────────────────────────────────
export const ExportAllCustomerReports = () => {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const handleExport = async () => {
    setLoading(true);
    try {
      const [leadsRes, projectsRes, trashedRes] = await Promise.all([
        api.get('/leads'),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/leads/trashed').catch(() => ({ data: [] })),
      ]);
      
      const leads = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data?.data ?? [];
      const projects = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.data ?? [];
      const trashed = Array.isArray(trashedRes.data) ? trashedRes.data : trashedRes.data?.data ?? [];
      const allLeadsWithTrash = [...leads, ...trashed.map(l => ({ ...l, is_trashed: true }))];
      
      const converted = leads.filter(l => { const s = (l.status || '').toLowerCase(); return s.includes('project') && s.includes('created'); });
      const winRate = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0;
      const byStage = PIPELINE_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.key).length }));
      
      const projectMap = {};
      projects.forEach(p => { if (p.lead_id) projectMap[p.lead_id] = p; });
      const convertedProjects = leads.filter(l => { const s = (l.status || '').toLowerCase(); return s.includes('project') && s.includes('created'); });
      
      const statusColors = {
        'To be Contacted': '#64748b', 'Contacted': '#2563eb',
        'For Presentation': '#d97706', 'Ready for Creating Project': '#059669', 'Project Created': '#7c3aed',
      };
      
      const leadRows = buildLeadConversionRows(leads, statusColors);
      const convertedRows = buildConvertedProjectsRows(convertedProjects, projectMap);
      const activityRows = buildCustomerActivityRows(allLeadsWithTrash);
      
      const win = window.open('', '_blank', 'width=1100,height=820');
      win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>VICMIS — Complete Customer Report</title>
          <style>${PRINT_CSS}</style>
        </head>
        <body>
          ${printHeader('Complete Customer Report')}
          
          <div class="cover">
            <h1>👥 Complete Customer Report</h1>
            <p>Vision International Construction OPC · VICMIS</p>
            <p>All Customer & Lead Reports Combined</p>
            <div class="period">Period: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div>
          </div>
          
          <div style="margin-bottom:24px">
            <div class="toc-item"><div class="tnum">1</div><span class="tl">Lead Conversion Report</span><span class="ts">${leads.length} total leads</span></div>
            <div class="toc-item"><div class="tnum">2</div><span class="tl">Converted Projects Report</span><span class="ts">${convertedProjects.length} converted projects</span></div>
            <div class="toc-item"><div class="tnum">3</div><span class="tl">Customer Activity Summary</span><span class="ts">${allLeadsWithTrash.length} total records</span></div>
          </div>
          
          <!-- Section 1: Lead Conversion Report -->
          <div class="sec">1 · Lead Conversion Report (${leads.length} leads)</div>
          <div class="summary">
            <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total Leads</div></div>
            <div class="chip green"><div class="chip-val">${converted.length}</div><div class="chip-label">Converted</div></div>
            <div class="chip"><div class="chip-val">${winRate}%</div><div class="chip-label">Win Rate</div></div>
            ${byStage.map(s => `<div class="chip"><div class="chip-val">${s.count}</div><div class="chip-label">${s.label}</div></div>`).join('')}
          </div>
          <table>
            <thead>
              <tr><th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th></tr>
            </thead>
            <tbody>${leadRows || '<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">No leads found.</td></tr>'}</tbody>
          </table>
          
          <!-- Section 2: Converted Projects Report -->
          <div class="sec pb">2 · Converted Projects Report (${convertedProjects.length} projects)</div>
          <div class="summary">
            <div class="chip green"><div class="chip-val">${convertedProjects.length}</div><div class="chip-label">Converted Projects</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th></tr>
            </thead>
            <tbody>${convertedRows || '<tr><td colspan="6" style="text-align:center;padding:16px;color:#94a3b8">No converted projects found.</td></tr>'}</tbody>
          </table>
          
          <!-- Section 3: Customer Activity Summary -->
          <div class="sec pb">3 · Customer Activity Summary (${allLeadsWithTrash.length} records)</div>
          <div class="summary">
            <div class="chip green"><div class="chip-val">${allLeadsWithTrash.filter(l => !l.is_trashed).length}</div><div class="chip-label">Active</div></div>
            <div class="chip red"><div class="chip-val">${allLeadsWithTrash.filter(l => l.is_trashed).length}</div><div class="chip-label">Trashed</div></div>
            <div class="chip blue"><div class="chip-val">${allLeadsWithTrash.length}</div><div class="chip-label">Total</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th></tr>
            </thead>
            <tbody>${activityRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8">No records found.</td></tr>'}</tbody>
          </table>
          
          ${printFooter('Complete Customer Report')}
          <script>window.onload=()=>window.print()<\/script>
        </body>
      </html>`);
      win.document.close();
    } catch (err) {
      console.error(err);
      alert('Failed to generate combined report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rpt-export-all-block">
      <div className="rpt-export-all-dates">
        <label>From
          <input type="date" value={dateFrom} max={dateTo} onChange={e => setDateFrom(e.target.value)} className="rpt-date-input rpt-date-input-sm" />
        </label>
        <span className="rpt-date-sep">—</span>
        <label>To
          <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} className="rpt-date-input rpt-date-input-sm" />
        </label>
      </div>
      <button className="rpt-btn rpt-btn-export-all" onClick={handleExport} disabled={loading}>
        {loading ? <><span className="rpt-export-spinner" /> Generating…</> : <>📥 Export All Customer Reports</>}
      </button>
    </div>
  );
};