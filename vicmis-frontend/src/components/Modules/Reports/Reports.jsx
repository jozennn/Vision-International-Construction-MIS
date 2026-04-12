import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import './Reports.css';


// ── Helpers ───────────────────────────────────────────────────────────────────
const today      = () => new Date().toISOString().split('T')[0];
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const fmt        = (n) => new Intl.NumberFormat('en-PH').format(n ?? 0);
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtCurrency= (n) => `₱ ${fmt(n)}`;

// ── Shared print helper ───────────────────────────────────────────────────────
const printReport = (title, tableHTML, summaryHTML = '', extraStyle = '') => {
  const win = window.open('', '_blank', 'width=1050,height=780');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>VICMIS — ${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;color:#221F1F;padding:36px;font-size:12px;background:#fff}
      .rp-header{display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:24px;padding-bottom:18px;border-bottom:4px solid #C20100}
      .rp-co{display:flex;flex-direction:column;gap:3px}
      .rp-co-name{font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#221F1F}
      .rp-co-sub{font-size:10px;color:#497B97;font-weight:600;letter-spacing:.03em}
      .rp-co-tag{font-size:9px;color:#94a3b8;margin-top:1px}
      .rp-meta{text-align:right}
      .rp-title{font-size:15px;font-weight:800;color:#C20100;letter-spacing:.02em}
      .rp-date{font-size:10px;color:#64748b;margin-top:4px}
      .summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
      .chip{flex:1;min-width:110px;background:#FAF8F6;border:1px solid #EBDBD6;
        border-top:3px solid #497B97;border-radius:8px;padding:10px 14px}
      .chip.red{border-top-color:#C20100}
      .chip.green{border-top-color:#16a34a}
      .chip.blue{border-top-color:#497B97}
      .chip-val{font-size:19px;font-weight:800;color:#221F1F;line-height:1}
      .chip-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-top:3px}
      .sec{font-size:10px;font-weight:800;color:#221F1F;text-transform:uppercase;
        letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
      .sec::after{content:'';flex:1;height:1px;background:#EBDBD6}
      table{width:100%;border-collapse:collapse;font-size:11px}
      thead{background:#221F1F}
      th{padding:9px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;
        text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
      th:first-child{border-radius:6px 0 0 0}th:last-child{border-radius:0 6px 0 0}
      td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#221F1F}
      tr:nth-child(even) td{background:#FAF8F6}
      tr:last-child td{border-bottom:none}
      .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;
        font-size:9px;font-weight:700;white-space:nowrap}
      .badge-blue{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
      .badge-green{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
      .badge-yellow{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}
      .badge-red{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
      .rp-footer{margin-top:24px;padding-top:12px;border-top:1px solid #EBDBD6;
        display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
      .rp-footer strong{color:#C20100}
      ${extraStyle}
      @media print{body{padding:20px}.no-print{display:none!important}}
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

// ── Shared UI Components ──────────────────────────────────────────────────────
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
  <div className="rpt-empty">
    <div className="rpt-empty-icon">📭</div>
    <p>{msg}</p>
  </div>
);

const Spinner = () => (
  <div className="rpt-loading"><div className="rpt-spinner" /></div>
);

const DateFilter = ({ from, to, onFrom, onTo, onApply }) => (
  <div className="rpt-date-row">
    <label>From<input type="date" value={from} max={to} onChange={e=>onFrom(e.target.value)} className="rpt-date-input"/></label>
    <label>To<input type="date" value={to} min={from} onChange={e=>onTo(e.target.value)} className="rpt-date-input"/></label>
    <button className="rpt-btn rpt-btn-apply" onClick={onApply}>Apply</button>
  </div>
);

// ── Status badge helpers ──────────────────────────────────────────────────────
const BADGE = {
  ok:       'rpt-badge rpt-badge-ok',
  low:      'rpt-badge rpt-badge-low',
  nostock:  'rpt-badge rpt-badge-nostock',
  blue:     'rpt-badge rpt-badge-blue',
  purple:   'rpt-badge rpt-badge-purple',
  orange:   'rpt-badge rpt-badge-orange',
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const EndingInventory = () => {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouse-inventory')
      .then(r => setData(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const totalVal = data.reduce((s, i) => s + ((i.quantity||0)*(i.unit_price||0)), 0);
  const low      = data.filter(i => (i.quantity||0) > 0 && (i.quantity||0) <= (i.reorder_point||5)).length;
  const none     = data.filter(i => (i.quantity||0) === 0).length;

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${data.length}</div><div class="chip-label">Total Items</div></div>
      <div class="chip green"><div class="chip-val">${fmtCurrency(totalVal)}</div><div class="chip-label">Total Value</div></div>
      <div class="chip"><div class="chip-val">${low}</div><div class="chip-label">Low Stock</div></div>
      <div class="chip red"><div class="chip-val">${none}</div><div class="chip-label">Out of Stock</div></div>
    </div>`;
    const rows = data.map(i => {
      const qty = i.quantity??0; const rp = i.reorder_point??5;
      const [cls, lbl] = qty===0?['badge-red','NO STOCK']:qty<=rp?['badge-yellow','LOW STOCK']:['badge-green','OK'];
      return `<tr><td><strong>${i.item_name||i.name||'—'}</strong></td><td>${i.category||'—'}</td>
        <td style="text-align:center">${fmt(qty)}</td><td>${i.unit||'—'}</td>
        <td style="text-align:right">${fmtCurrency(i.unit_price)}</td>
        <td style="text-align:right"><strong>${fmtCurrency(qty*(i.unit_price||0))}</strong></td>
        <td><span class="badge ${cls}">${lbl}</span></td>
        <td style="color:#64748b;font-size:10px">${i.notes||'—'}</td></tr>`;
    }).join('');
    printReport('Monthly Ending Inventory Report',
      `<div class="sec">Inventory Items</div><table><thead><tr>
        <th>Item Name</th><th>Category</th><th>Qty</th><th>Unit</th>
        <th>Unit Price</th><th>Total Value</th><th>Status</th><th>Notes</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No items found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Monthly Ending Inventory" subtitle="Current stock levels, unit values, and status for all warehouse items" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: data.length,              label: 'Total Items',  color: '#497B97' },
        { value: fmtCurrency(totalVal),    label: 'Total Value',  color: '#16a34a' },
        { value: low,                      label: 'Low Stock',    color: '#f59e0b' },
        { value: none,                     label: 'Out of Stock', color: '#C20100' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Item Name</th><th>Category</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total Value</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {data.map((item, i) => {
                const qty = item.quantity??0; const rp = item.reorder_point??5;
                const st = qty===0?'nostock':qty<=rp?'low':'ok';
                return (
                  <tr key={i}>
                    <td className="rpt-fw">{item.item_name||item.name||'—'}</td>
                    <td>{item.category||'—'}</td>
                    <td className="rpt-tc">{fmt(qty)}</td>
                    <td>{item.unit||'—'}</td>
                    <td className="rpt-tr">{fmtCurrency(item.unit_price)}</td>
                    <td className="rpt-tr rpt-fw">{fmtCurrency(qty*(item.unit_price||0))}</td>
                    <td><span className={BADGE[st]}>{st==='nostock'?'NO STOCK':st==='low'?'LOW STOCK':'OK'}</span></td>
                    <td className="rpt-dim">{item.notes||'—'}</td>
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

const LowStock = () => {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouse-inventory')
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setData(all.filter(i => (i.quantity??0) <= (i.reorder_point??5)));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Need Reorder</div></div>
      <div class="chip red"><div class="chip-val">${data.filter(i=>(i.quantity||0)===0).length}</div><div class="chip-label">Out of Stock</div></div>
      <div class="chip"><div class="chip-val">${data.filter(i=>(i.quantity||0)>0).length}</div><div class="chip-label">Low Stock</div></div>
    </div>`;
    const rows = data.map(i => {
      const qty=i.quantity??0; const rp=i.reorder_point??5;
      return `<tr><td><strong>${i.item_name||i.name||'—'}</strong></td><td>${i.category||'—'}</td>
        <td style="text-align:center;color:${qty===0?'#991b1b':'#92400e'};font-weight:700">${qty}</td>
        <td style="text-align:center">${rp}</td>
        <td style="text-align:center;font-weight:700">${Math.max(0,rp-qty)}</td>
        <td>${i.supplier||'—'}</td>
        <td><span class="badge ${qty===0?'badge-red':'badge-yellow'}">${qty===0?'URGENT — NO STOCK':'LOW STOCK'}</span></td></tr>`;
    }).join('');
    printReport('Low Stock / Reorder Report',
      `<div class="sec">Items Requiring Reorder</div><table><thead><tr>
        <th>Item Name</th><th>Category</th><th>Current Qty</th><th>Reorder Point</th><th>Qty Needed</th><th>Supplier</th><th>Status</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">All items are sufficiently stocked.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Low Stock / Reorder Report" subtitle="Items at or below reorder point requiring immediate procurement action" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: data.length,                                 label: 'Need Reorder', color: '#f59e0b' },
        { value: data.filter(i=>(i.quantity||0)===0).length, label: 'Out of Stock', color: '#C20100' },
        { value: data.filter(i=>(i.quantity||0)>0).length,   label: 'Low Stock',    color: '#d97706' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty msg="All items are sufficiently stocked. No reorders needed." /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Item Name</th><th>Category</th><th>Current Qty</th><th>Reorder Point</th><th>Qty Needed</th><th>Supplier</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((item, i) => {
                const qty=item.quantity??0; const rp=item.reorder_point??5;
                return (
                  <tr key={i}>
                    <td className="rpt-fw">{item.item_name||item.name||'—'}</td>
                    <td>{item.category||'—'}</td>
                    <td className={`rpt-tc rpt-fw ${qty===0?'rpt-red':'rpt-orange'}`}>{qty}</td>
                    <td className="rpt-tc">{rp}</td>
                    <td className="rpt-tc rpt-fw">{Math.max(0,rp-qty)}</td>
                    <td>{item.supplier||'—'}</td>
                    <td><span className={qty===0?BADGE.nostock:BADGE.low}>{qty===0?'URGENT — NO STOCK':'LOW STOCK'}</span></td>
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

const StockMovement = () => {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo]     = useState(today());

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/shipments').catch(()=>({data:[]})),
      api.get('/inventory/logistics').catch(()=>({data:[]})),
    ]).then(([sR, lR]) => {
      const ships = Array.isArray(sR.data)?sR.data:sR.data?.data??[];
      const logs  = Array.isArray(lR.data)?lR.data:lR.data?.data??[];
      const from  = new Date(dateFrom); const to = new Date(dateTo); to.setHours(23,59,59);
      const map   = {};
      ships.filter(s=>{const d=new Date(s.received_at||s.created_at);return d>=from&&d<=to;})
        .forEach(s=>{const k=s.item_name||s.material_name||'Unknown';if(!map[k])map[k]={item:k,in:0,out:0,unit:s.unit||''};map[k].in+=s.quantity||0;});
      logs.filter(l=>{const d=new Date(l.delivered_at||l.created_at);return d>=from&&d<=to;})
        .forEach(l=>{const k=l.item_name||l.material_name||'Unknown';if(!map[k])map[k]={item:k,in:0,out:0,unit:l.unit||''};map[k].out+=l.quantity||0;});
      setData(Object.values(map));
    }).finally(()=>setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(()=>{fetchData();},[fetchData]);

  const tIn=data.reduce((s,d)=>s+d.in,0); const tOut=data.reduce((s,d)=>s+d.out,0);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${data.length}</div><div class="chip-label">Items</div></div>
      <div class="chip green"><div class="chip-val">${fmt(tIn)}</div><div class="chip-label">Total In</div></div>
      <div class="chip red"><div class="chip-val">${fmt(tOut)}</div><div class="chip-label">Total Out</div></div>
      <div class="chip"><div class="chip-val">${fmt(tIn-tOut)}</div><div class="chip-label">Net Movement</div></div>
    </div>`;
    const rows = data.map(d=>`<tr><td><strong>${d.item}</strong></td><td>${d.unit}</td>
      <td style="text-align:center;color:#065f46;font-weight:700">${fmt(d.in)}</td>
      <td style="text-align:center;color:#991b1b;font-weight:700">${fmt(d.out)}</td>
      <td style="text-align:center;font-weight:800;color:${d.in-d.out>=0?'#065f46':'#991b1b'}">${d.in-d.out>=0?'+':''}${fmt(d.in-d.out)}</td></tr>`).join('');
    printReport(`Stock Movement Summary (${fmtDate(dateFrom)} — ${fmtDate(dateTo)})`,
      `<div class="sec">Movement per Item</div><table><thead><tr>
        <th>Item Name</th><th>Unit</th><th>Total In</th><th>Total Out</th><th>Net Movement</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8">No movement in selected period.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Stock Movement Summary" subtitle="Deliveries in vs. out per item for a selected date range" onPrint={handlePrint} loading={loading}>
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData} />
      </SectionHeader>
      <SummaryRow chips={[
        { value: data.length,       label: 'Items',        color: '#497B97' },
        { value: fmt(tIn),          label: 'Total In',     color: '#16a34a' },
        { value: fmt(tOut),         label: 'Total Out',    color: '#C20100' },
        { value: fmt(tIn-tOut),     label: 'Net Movement', color: '#6366f1' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Item Name</th><th>Unit</th><th>Total In</th><th>Total Out</th><th>Net Movement</th></tr></thead>
            <tbody>
              {data.map((d,i)=>(
                <tr key={i}>
                  <td className="rpt-fw">{d.item}</td><td>{d.unit}</td>
                  <td className="rpt-tc rpt-fw rpt-green">{fmt(d.in)}</td>
                  <td className="rpt-tc rpt-fw rpt-red">{fmt(d.out)}</td>
                  <td className={`rpt-tc rpt-fw ${d.in-d.out>=0?'rpt-green':'rpt-red'}`}>{d.in-d.out>=0?'+':''}{fmt(d.in-d.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const ProjectStatus = () => {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(r=>setData(Array.isArray(r.data)?r.data:r.data?.data??[]))
      .catch(()=>setData([]))
      .finally(()=>setLoading(false));
  }, []);

  const byStatus = data.reduce((acc,p)=>{const s=p.status||'Unknown';acc[s]=(acc[s]||0)+1;return acc;},{});

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${data.length}</div><div class="chip-label">Total Projects</div></div>
      ${Object.entries(byStatus).map(([s,c])=>`<div class="chip"><div class="chip-val">${c}</div><div class="chip-label">${s}</div></div>`).join('')}
    </div>`;
    const rows = data.map(p=>`<tr>
      <td><strong>${p.project_name||p.name||'—'}</strong></td><td>${p.client_name||'—'}</td>
      <td>${p.location||'—'}</td><td><span class="badge badge-blue">${p.status||'—'}</span></td>
      <td>${fmtDate(p.created_at)}</td><td>${p.project_type||'—'}</td></tr>`).join('');
    printReport('Project Status Summary',
      `<div class="sec">All Projects</div><table><thead><tr>
        <th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No projects found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Project Status Summary" subtitle="Overview of all projects and their current construction stage" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: data.length, label: 'Total Projects', color: '#497B97' },
        ...Object.entries(byStatus).map(([s,c])=>({ value: c, label: s, color: '#6366f1' })),
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th></tr></thead>
            <tbody>
              {data.map((p,i)=>(
                <tr key={i}>
                  <td className="rpt-fw">{p.project_name||p.name||'—'}</td>
                  <td>{p.client_name||'—'}</td><td>{p.location||'—'}</td>
                  <td><span className={BADGE.blue}>{p.status||'—'}</span></td>
                  <td className="rpt-dim">{fmtDate(p.created_at)}</td>
                  <td>{p.project_type||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const MaterialRequests = () => {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/material-requests/pending')
      .then(r=>setData(Array.isArray(r.data)?r.data:r.data?.data??[]))
      .catch(()=>setData([]))
      .finally(()=>setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Pending Requests</div></div>
    </div>`;
    const rows = data.map(m=>`<tr>
      <td><strong>${m.material_name||m.item_name||'—'}</strong></td>
      <td>${m.project?.project_name||m.project_name||'—'}</td>
      <td style="text-align:center">${m.quantity??'—'}</td><td>${m.unit||'—'}</td>
      <td><span class="badge badge-yellow">${m.status||'Pending'}</span></td>
      <td>${fmtDate(m.created_at)}</td><td style="color:#64748b">${m.notes||'—'}</td></tr>`).join('');
    printReport('Material Request Report',
      `<div class="sec">Pending Material Requests</div><table><thead><tr>
        <th>Material</th><th>Project</th><th>Qty</th><th>Unit</th><th>Status</th><th>Requested</th><th>Notes</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No pending material requests.</td></tr>'}</tbody></table>`, chips);
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
              {data.map((m,i)=>(
                <tr key={i}>
                  <td className="rpt-fw">{m.material_name||m.item_name||'—'}</td>
                  <td>{m.project?.project_name||m.project_name||'—'}</td>
                  <td className="rpt-tc">{m.quantity??'—'}</td><td>{m.unit||'—'}</td>
                  <td><span className={BADGE.low}>{m.status||'Pending'}</span></td>
                  <td className="rpt-dim">{fmtDate(m.created_at)}</td>
                  <td className="rpt-dim">{m.notes||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER REPORTS — integrated from Customer.jsx export
// ═══════════════════════════════════════════════════════════════════════════════

const PIPELINE_STAGES = [
  { key: 'To be Contacted',            label: 'To Be Contacted',  color: '#64748b' },
  { key: 'Contacted',                  label: 'Contacted',         color: '#2563eb' },
  { key: 'For Presentation',           label: 'For Presentation',  color: '#d97706' },
  { key: 'Ready for Creating Project', label: 'Ready for Project', color: '#059669' },
  { key: 'Project Created',            label: 'Project Created',   color: '#7c3aed' },
];

const LeadConversion = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leads')
      .then(r=>setLeads(Array.isArray(r.data)?r.data:r.data?.data??[]))
      .catch(()=>setLeads([]))
      .finally(()=>setLoading(false));
  }, []);

  const converted = leads.filter(l=>{const s=(l.status||'').toLowerCase();return s.includes('project')&&s.includes('created');});
  const winRate   = leads.length>0 ? Math.round((converted.length/leads.length)*100) : 0;
  const byStage   = PIPELINE_STAGES.map(s=>({ ...s, count: leads.filter(l=>l.status===s.key).length }));

  // Same PDF logic as Customer.jsx export — Active Leads Report
  const handlePrint = () => {
    const statusColors = { 'To be Contacted':'#64748b','Contacted':'#2563eb','For Presentation':'#d97706','Ready for Creating Project':'#059669','Project Created':'#7c3aed' };
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total Leads</div></div>
      <div class="chip green"><div class="chip-val">${converted.length}</div><div class="chip-label">Converted</div></div>
      <div class="chip"><div class="chip-val">${winRate}%</div><div class="chip-label">Win Rate</div></div>
      ${byStage.map(s=>`<div class="chip"><div class="chip-val">${s.count}</div><div class="chip-label">${s.label}</div></div>`).join('')}
    </div>`;
    const rows = leads.map(l=>`<tr>
      <td>#${l.id}</td><td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td>
      <td>${l.location||'—'}</td>
      <td><span style="color:${statusColors[l.status]||'#64748b'};font-weight:700;font-size:10px">${l.status||'—'}</span></td>
      <td>${l.contact_no||'—'}</td>
      <td>${l.sales_rep?.name||user?.name||'—'}</td>
      <td>${fmtDate(l.created_at)}</td></tr>`).join('');
    printReport('Lead Conversion Report',
      `<div class="sec">All Leads — Active Pipeline</div><table><thead><tr>
        <th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No leads found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Lead Conversion Report" subtitle="Full sales pipeline — from initial lead to converted project" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: leads.length,     label: 'Total Leads', color: '#497B97' },
        { value: converted.length, label: 'Converted',   color: '#16a34a' },
        { value: `${winRate}%`,    label: 'Win Rate',    color: '#B45309' },
        ...byStage.map(s=>({ value: s.count, label: s.label, color: s.color })),
      ]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact No.</th><th>Sales Rep</th><th>Date Added</th></tr></thead>
            <tbody>
              {leads.map((l,i)=>{
                const isConv=(l.status||'').toLowerCase().includes('created');
                return (
                  <tr key={i}>
                    <td className="rpt-dim">#{l.id}</td>
                    <td className="rpt-fw">{l.client_name||'—'}</td>
                    <td>{l.project_name||'—'}</td><td>{l.location||'—'}</td>
                    <td><span className={isConv?BADGE.ok:BADGE.blue}>{l.status||'—'}</span></td>
                    <td>{l.contact_no||'—'}</td>
                    <td>{l.sales_rep?.name||user?.name||'—'}</td>
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

const ConvertedProjects = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads'),
      api.get('/projects').catch(()=>({data:[]})),
    ]).then(([lR, pR]) => {
      const all  = Array.isArray(lR.data)?lR.data:lR.data?.data??[];
      const prjs = Array.isArray(pR.data)?pR.data:pR.data?.data??[];
      const map  = {};
      prjs.forEach(p=>{if(p.lead_id)map[p.lead_id]=p;});
      setLeads(all.filter(l=>{const s=(l.status||'').toLowerCase();return s.includes('project')&&s.includes('created');}));
      setProjects(map);
    }).catch(()=>setLeads([])).finally(()=>setLoading(false));
  }, []);

  // Same PDF logic as Customer.jsx export — Converted Projects Report
  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Converted Projects</div></div>
    </div>`;
    const rows = leads.map(l=>{
      const proj = projects[l.id];
      const ps   = proj ? proj.status||'Ongoing' : '—';
      return `<tr>
        <td>#${l.id}</td><td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td>
        <td>${l.location||'—'}</td>
        <td><span style="background:#eff6ff;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700">${ps}</span></td>
        <td>${l.sales_rep?.name||user?.name||'—'}</td>
        <td>${fmtDate(proj?.created_at||l.created_at)}</td></tr>`;
    }).join('');
    printReport('Converted Projects Report',
      `<div class="sec">Leads Converted to Projects</div><table><thead><tr>
        <th>ID</th><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No converted projects found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Converted Projects Report" subtitle="Leads successfully converted to active construction projects with live project stage" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: leads.length, label: 'Converted Projects', color: '#16a34a' },
      ]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty msg="No converted projects yet." /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>ID</th><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th></tr></thead>
            <tbody>
              {leads.map((l,i)=>{
                const proj = projects[l.id];
                return (
                  <tr key={i}>
                    <td className="rpt-dim">#{l.id}</td>
                    <td className="rpt-fw">{l.client_name||'—'}</td>
                    <td>{l.project_name||'—'}</td><td>{l.location||'—'}</td>
                    <td><span className={BADGE.blue}>{proj?proj.status||'Ongoing':'—'}</span></td>
                    <td>{l.sales_rep?.name||user?.name||'—'}</td>
                    <td className="rpt-dim">{fmtDate(proj?.created_at||l.created_at)}</td>
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

const CustomerActivity = ({ user }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads'),
      api.get('/leads/trashed').catch(()=>({data:[]})),
    ]).then(([a,t])=>{
      const active  = Array.isArray(a.data)?a.data:a.data?.data??[];
      const trashed = Array.isArray(t.data)?t.data:t.data?.data??[];
      setLeads([...active,...trashed.map(l=>({...l,is_trashed:true}))]);
    }).catch(()=>setLeads([])).finally(()=>setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip green"><div class="chip-val">${leads.filter(l=>!l.is_trashed).length}</div><div class="chip-label">Active</div></div>
      <div class="chip red"><div class="chip-val">${leads.filter(l=>l.is_trashed).length}</div><div class="chip-label">Trashed</div></div>
      <div class="chip blue"><div class="chip-val">${leads.length}</div><div class="chip-label">Total</div></div>
    </div>`;
    const rows = leads.map(l=>`<tr>
      <td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td>
      <td>${l.contact_no||'—'}</td><td>${l.location||'—'}</td>
      <td>${l.is_trashed?'<span style="color:#991b1b;font-weight:700">Trashed</span>':`<span style="font-weight:600">${l.status||'—'}</span>`}</td>
      <td>${l.sales_rep?.name||user?.name||'—'}</td>
      <td>${fmtDate(l.updated_at||l.created_at)}</td></tr>`).join('');
    printReport('Customer Activity Summary',
      `<div class="sec">All Client Interactions</div><table><thead><tr>
        <th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th>
      </tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No records found.</td></tr>'}</tbody></table>`, chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Customer Activity Summary" subtitle="All client interactions including active leads and archived records" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: leads.filter(l=>!l.is_trashed).length, label: 'Active',  color: '#16a34a' },
        { value: leads.filter(l=> l.is_trashed).length, label: 'Trashed', color: '#C20100' },
        { value: leads.length,                          label: 'Total',   color: '#497B97' },
      ]} />
      {loading ? <Spinner /> : leads.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr><th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th></tr></thead>
            <tbody>
              {leads.map((l,i)=>(
                <tr key={i} style={{opacity:l.is_trashed?.65:1}}>
                  <td className="rpt-fw">{l.client_name||'—'}</td>
                  <td>{l.project_name||'—'}</td><td>{l.contact_no||'—'}</td><td>{l.location||'—'}</td>
                  <td><span className={l.is_trashed?BADGE.nostock:BADGE.blue}>{l.is_trashed?'Trashed':l.status||'—'}</span></td>
                  <td>{l.sales_rep?.name||user?.name||'—'}</td>
                  <td className="rpt-dim">{fmtDate(l.updated_at||l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT SECTIONS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const SECTIONS = {
  'inventory-reports': {
    label: 'Inventory Reports', icon: '📦', color: '#497B97',
    reports: [
      { id: 'ending-inventory', label: 'Monthly Ending Inventory', component: EndingInventory    },
      { id: 'low-stock',        label: 'Low Stock / Reorder',      component: LowStock           },
      { id: 'stock-movement',   label: 'Stock Movement Summary',   component: StockMovement      },
    ],
  },
  'project-reports': {
    label: 'Project Reports', icon: '📝', color: '#6366f1',
    reports: [
      { id: 'project-status',    label: 'Project Status Summary',  component: ProjectStatus      },
      { id: 'material-requests', label: 'Material Request Report', component: MaterialRequests   },
    ],
  },
  'customer-reports': {
    label: 'Customer Reports', icon: '👤', color: '#C20100',
    reports: [
      { id: 'lead-conversion',    label: 'Lead Conversion Report',    component: LeadConversion    },
      { id: 'converted-projects', label: 'Converted Projects Report', component: ConvertedProjects },
      { id: 'customer-activity',  label: 'Customer Activity Summary', component: CustomerActivity  },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Reports = ({ user, activeSubItem }) => {
  const section = SECTIONS[activeSubItem] || SECTIONS['inventory-reports'];
  const [activeReport, setActiveReport] = useState(section.reports[0].id);

  useEffect(() => {
    const sec = SECTIONS[activeSubItem] || SECTIONS['inventory-reports'];
    setActiveReport(sec.reports[0].id);
  }, [activeSubItem]);

  const currentSection  = SECTIONS[activeSubItem] || SECTIONS['inventory-reports'];
  const currentReport   = currentSection.reports.find(r=>r.id===activeReport) || currentSection.reports[0];
  const ReportComponent = currentReport.component;

  return (
    <div className="rpt-wrapper">

      {/* ── Page Header ── */}
      <div className="rpt-page-header">
        <div className="rpt-page-header-left">
          <div className="rpt-page-icon" style={{ background: `${currentSection.color}22` }}>
            <span style={{ fontSize: '1.5rem' }}>{currentSection.icon}</span>
          </div>
          <div>
            <h1 className="rpt-page-title">{currentSection.label}</h1>
            <p className="rpt-page-sub">Vision International Construction OPC · VICMIS</p>
          </div>
        </div>
        <div className="rpt-page-right">
          <div className="rpt-live-pill">
            <span className="rpt-live-dot" />
            Reports
          </div>
          <span className="rpt-page-date">
            {new Date().toLocaleDateString('en-PH', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Report Tabs ── */}
      <div className="rpt-tabs-bar">
        {currentSection.reports.map(r => (
          <button
            key={r.id}
            className={`rpt-tab ${activeReport === r.id ? 'active' : ''}`}
            style={{ '--tab-color': currentSection.color }}
            onClick={() => setActiveReport(r.id)}
          >
            {r.label}
            {activeReport === r.id && <span className="rpt-tab-indicator" style={{ background: currentSection.color }} />}
          </button>
        ))}
      </div>

      {/* ── Report Content ── */}
      <div className="rpt-content-area">
        <ReportComponent user={user} />
      </div>
    </div>
  );
};

export default Reports;
