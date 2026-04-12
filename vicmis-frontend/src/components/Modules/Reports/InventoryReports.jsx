import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import './Reports.css';

const fmt         = (n) => new Intl.NumberFormat('en-PH').format(n ?? 0);
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtCurrency = (n) => `₱ ${fmt(n)}`;
const nowStr      = () => new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
const today       = () => new Date().toISOString().split('T')[0];
const monthStart  = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

// Fetch ALL inventory bypassing server pagination
const fetchAllInventory = () =>
  api.get('/warehouse-inventory', { params: { per_page: 9999, page: 1 } })
    .then(r => Array.isArray(r.data) ? r.data : r.data?.data ?? []);

const PRINT_CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#221F1F;padding:36px;font-size:12px;background:#fff}.rp-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:4px solid #C20100}.rp-co{display:flex;flex-direction:column;gap:3px}.rp-co-name{font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#221F1F}.rp-co-sub{font-size:10px;color:#497B97;font-weight:600;letter-spacing:.03em}.rp-co-tag{font-size:9px;color:#94a3b8;margin-top:1px}.rp-meta{text-align:right}.rp-title{font-size:15px;font-weight:800;color:#C20100;letter-spacing:.02em}.rp-date{font-size:10px;color:#64748b;margin-top:4px}.summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}.chip{flex:1;min-width:110px;background:#FAF8F6;border:1px solid #EBDBD6;border-top:3px solid #497B97;border-radius:8px;padding:10px 14px}.chip.red{border-top-color:#C20100}.chip.green{border-top-color:#16a34a}.chip.orange{border-top-color:#f59e0b}.chip-val{font-size:19px;font-weight:800;color:#221F1F;line-height:1}.chip-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-top:3px}.sec{font-size:10px;font-weight:800;color:#221F1F;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:8px}.sec::after{content:'';flex:1;height:1px;background:#EBDBD6}table{width:100%;border-collapse:collapse;font-size:11px}thead{background:#221F1F}th{padding:9px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#221F1F}tr:nth-child(even) td{background:#FAF8F6}tr:last-child td{border-bottom:none}.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap}.badge-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}.badge-low{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}.badge-nostock{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}.badge-blue{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}.rp-footer{margin-top:24px;padding-top:12px;border-top:1px solid #EBDBD6;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}.rp-footer strong{color:#C20100}.cover{text-align:center;padding:50px 40px;background:#221F1F;color:#fff;border-radius:12px;margin-bottom:28px}.cover h1{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}.cover p{font-size:11px;color:rgba(235,219,214,.65);margin-bottom:4px}.period{font-size:11px;color:#C20100;font-weight:700;margin-top:12px;background:rgba(194,1,0,.15);padding:5px 14px;border-radius:999px;display:inline-block}.toc-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #EBDBD6;font-size:11px}.tnum{width:22px;height:22px;background:#221F1F;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}.tl{font-weight:600}.ts{color:#94a3b8;font-size:10px;margin-left:auto}.pb{page-break-before:always;margin-top:32px}@media print{body{padding:20px}}`;

const printHeader = (title) => `<div class="rp-header"><div class="rp-co"><div class="rp-co-name">Vision International Construction OPC</div><div class="rp-co-sub">VICMIS — Management Information System</div><div class="rp-co-tag">"You Envision, We Build!"</div></div><div class="rp-meta"><div class="rp-title">${title}</div><div class="rp-date">Generated: ${nowStr()}</div></div></div>`;
const printFooter = (title) => `<div class="rp-footer"><span>VICMIS — <strong>Confidential</strong> · Do not distribute without authorization</span><span>${title} · ${new Date().toLocaleDateString('en-PH')}</span></div>`;

const openPrintWindow = (title, body) => {
  const win = window.open('', '_blank', 'width=1050,height=780');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VICMIS — ${title}</title><style>${PRINT_CSS}</style></head><body>${printHeader(title)}${body}${printFooter(title)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
};

const buildInventoryRows = (data) => data.map(i => {
  const qty = i.current_stock ?? i.quantity ?? 0;
  const res = parseInt(i.reserve || 0);
  const av  = i.availability || (qty === 0 ? 'NO STOCK' : qty <= 10 ? 'LOW STOCK' : 'ON STOCK');
  const cls = av === 'NO STOCK' ? 'badge-nostock' : av === 'LOW STOCK' ? 'badge-low' : 'badge-ok';
  return `<tr><td><strong>${i.product_category || i.category || '—'}</strong></td><td>${i.product_code || i.item_name || i.name || '—'}</td><td style="text-align:center">${qty}</td><td>${i.unit || '—'}</td><td style="text-align:center">${res > 0 ? res : '—'}</td><td style="text-align:center;font-weight:700">${qty - res}</td><td>${i.condition || '—'}</td><td><span class="badge ${cls}">${av}</span></td><td style="color:#64748b;font-size:10px">${i.notes || '—'}</td></tr>`;
}).join('');

// Shared UI
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
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
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

const Spinner = () => <div className="rpt-loading"><div className="rpt-spinner" /></div>;

const DateFilter = ({ from, to, onFrom, onTo, onApply }) => (
  <div className="rpt-date-row">
    <label>From<input type="date" value={from} max={to} onChange={e => onFrom(e.target.value)} className="rpt-date-input" /></label>
    <label>To<input type="date" value={to} min={from} onChange={e => onTo(e.target.value)} className="rpt-date-input" /></label>
    <button className="rpt-btn rpt-btn-apply" onClick={onApply}>Apply</button>
  </div>
);

// Client-side pagination for report tables
const ReportPagination = ({ page, totalPages, total, perPage, onPage, onPerPage }) => {
  if (total <= 10 && totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i);
  }
  const withGaps = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) withGaps.push('…');
    withGaps.push(p);
    prev = p;
  }
  return (
    <div className="rpt-pagination">
      <div className="rpt-pagination-info">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total} items
      </div>
      <div className="rpt-pagination-controls">
        <div className="rpt-perpage-wrap">
          <span>Rows:</span>
          <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} className="rpt-perpage-select">
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </div>
        <div className="rpt-page-btns">
          <button className="rpt-page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
          {withGaps.map((p, i) => p === '…'
            ? <span key={`g${i}`} className="rpt-page-ellipsis">…</span>
            : <button key={p} className={`rpt-page-btn ${page === p ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
          <button className="rpt-page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
        </div>
      </div>
    </div>
  );
};

const BADGE = { ok: 'rpt-badge rpt-badge-ok', low: 'rpt-badge rpt-badge-low', nostock: 'rpt-badge rpt-badge-nostock', blue: 'rpt-badge rpt-badge-blue' };

// ── 1. Ending Inventory ───────────────────────────────────────────────────────
export const EndingInventory = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    setLoading(true);
    fetchAllInventory().then(setAllData).catch(() => setAllData([])).finally(() => setLoading(false));
  }, []);

  const totalVal   = allData.reduce((s, i) => s + ((i.current_stock ?? i.quantity ?? 0) * (i.unit_price || 0)), 0);
  const onStock    = allData.filter(i => i.availability === 'ON STOCK').length;
  const low        = allData.filter(i => i.availability === 'LOW STOCK').length;
  const none       = allData.filter(i => i.availability === 'NO STOCK').length;
  const totalPages = Math.max(1, Math.ceil(allData.length / perPage));
  const pageData   = allData.slice((page - 1) * perPage, page * perPage);

  const handlePrint = () => {
    const chips = `<div class="summary"><div class="chip"><div class="chip-val">${allData.length}</div><div class="chip-label">Total Items</div></div><div class="chip green"><div class="chip-val">${onStock}</div><div class="chip-label">On Stock</div></div><div class="chip orange"><div class="chip-val">${low}</div><div class="chip-label">Low Stock</div></div><div class="chip red"><div class="chip-val">${none}</div><div class="chip-label">Out of Stock</div></div><div class="chip green"><div class="chip-val">${fmtCurrency(totalVal)}</div><div class="chip-label">Total Value</div></div></div>`;
    openPrintWindow('Monthly Ending Inventory Report',
      `${chips}<div class="sec">Warehouse Inventory — Construction Materials (${allData.length} items)</div><table><thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead><tbody>${buildInventoryRows(allData) || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">No items.</td></tr>'}</tbody></table>`);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Monthly Ending Inventory" subtitle="Warehouse stock levels, reserve quantities, and availability — Construction Materials module" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: loading ? '…' : allData.length,        label: 'Total Items',  color: '#497B97' },
        { value: loading ? '…' : onStock,               label: 'On Stock',     color: '#16a34a' },
        { value: loading ? '…' : low,                   label: 'Low Stock',    color: '#f59e0b' },
        { value: loading ? '…' : none,                  label: 'Out of Stock', color: '#C20100' },
        { value: loading ? '…' : fmtCurrency(totalVal), label: 'Total Value',  color: '#6366f1' },
      ]} />
      {loading ? <Spinner /> : allData.length === 0 ? <Empty /> : (
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {pageData.map((item, i) => {
                  const qty = item.current_stock ?? item.quantity ?? 0;
                  const res = parseInt(item.reserve || 0);
                  const av  = item.availability || (qty === 0 ? 'NO STOCK' : qty <= 10 ? 'LOW STOCK' : 'ON STOCK');
                  const st  = av === 'NO STOCK' ? 'nostock' : av === 'LOW STOCK' ? 'low' : 'ok';
                  return (
                    <tr key={i}>
                      <td><span className="rpt-category-badge">{item.product_category || item.category || '—'}</span></td>
                      <td className="rpt-fw">{item.product_code || item.item_name || item.name || '—'}</td>
                      <td className="rpt-tc">{qty}</td>
                      <td>{item.unit || '—'}</td>
                      <td className="rpt-tc rpt-dim">{res > 0 ? res : '—'}</td>
                      <td className="rpt-tc rpt-fw">{qty - res}</td>
                      <td>{item.condition || '—'}</td>
                      <td><span className={BADGE[st]}>{av}</span></td>
                      <td className="rpt-dim">{item.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ReportPagination page={page} totalPages={totalPages} total={allData.length} perPage={perPage} onPage={setPage} onPerPage={v => { setPerPage(v); setPage(1); }} />
        </>
      )}
    </div>
  );
};

// ── 2. Low Stock ──────────────────────────────────────────────────────────────
export const LowStock = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    setLoading(true);
    fetchAllInventory()
      .then(all => setAllData(all.filter(i => i.availability === 'LOW STOCK' || i.availability === 'NO STOCK')))
      .catch(() => setAllData([]))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(allData.length / perPage));
  const pageData   = allData.slice((page - 1) * perPage, page * perPage);

  const handlePrint = () => {
    const chips = `<div class="summary"><div class="chip orange"><div class="chip-val">${allData.length}</div><div class="chip-label">Need Reorder</div></div><div class="chip red"><div class="chip-val">${allData.filter(i => i.availability === 'NO STOCK').length}</div><div class="chip-label">Out of Stock</div></div><div class="chip"><div class="chip-val">${allData.filter(i => i.availability === 'LOW STOCK').length}</div><div class="chip-label">Low Stock</div></div></div>`;
    const rows = allData.map(i => {
      const qty = i.current_stock ?? i.quantity ?? 0;
      const av  = i.availability || 'NO STOCK';
      const cls = av === 'NO STOCK' ? 'badge-nostock' : 'badge-low';
      return `<tr><td><strong>${i.product_category || i.category || '—'}</strong></td><td>${i.product_code || i.item_name || '—'}</td><td style="text-align:center;color:${qty === 0 ? '#991b1b' : '#92400e'};font-weight:700">${qty}</td><td>${i.unit || '—'}</td><td>${i.condition || '—'}</td><td style="color:#64748b">${i.notes || '—'}</td><td><span class="badge ${cls}">${av === 'NO STOCK' ? 'URGENT — NO STOCK' : 'LOW STOCK'}</span></td></tr>`;
    }).join('');
    openPrintWindow('Low Stock / Reorder Report',
      `${chips}<div class="sec">Items Requiring Reorder (${allData.length} items)</div><table><thead><tr><th>Category</th><th>Product Code</th><th>Current Stock</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">All items sufficiently stocked.</td></tr>'}</tbody></table>`);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Low Stock / Reorder Report" subtitle="Items flagged LOW STOCK or NO STOCK requiring immediate procurement action" onPrint={handlePrint} loading={loading} />
      <SummaryRow chips={[
        { value: loading ? '…' : allData.length,                                             label: 'Need Reorder', color: '#f59e0b' },
        { value: loading ? '…' : allData.filter(i => i.availability === 'NO STOCK').length,  label: 'Out of Stock', color: '#C20100' },
        { value: loading ? '…' : allData.filter(i => i.availability === 'LOW STOCK').length, label: 'Low Stock',    color: '#d97706' },
      ]} />
      {loading ? <Spinner /> : allData.length === 0 ? <Empty msg="All items are sufficiently stocked." /> : (
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                {pageData.map((item, i) => {
                  const qty = item.current_stock ?? item.quantity ?? 0;
                  const av  = item.availability || 'NO STOCK';
                  return (
                    <tr key={i}>
                      <td><span className="rpt-category-badge">{item.product_category || item.category || '—'}</span></td>
                      <td className="rpt-fw">{item.product_code || item.item_name || item.name || '—'}</td>
                      <td className={`rpt-tc rpt-fw ${av === 'NO STOCK' ? 'rpt-red' : 'rpt-orange'}`}>{qty}</td>
                      <td>{item.unit || '—'}</td>
                      <td>{item.condition || '—'}</td>
                      <td className="rpt-dim">{item.notes || '—'}</td>
                      <td><span className={av === 'NO STOCK' ? BADGE.nostock : BADGE.low}>{av === 'NO STOCK' ? 'URGENT — NO STOCK' : 'LOW STOCK'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ReportPagination page={page} totalPages={totalPages} total={allData.length} perPage={perPage} onPage={setPage} onPerPage={v => { setPerPage(v); setPage(1); }} />
        </>
      )}
    </div>
  );
};

// ── 3. Stock Movement ─────────────────────────────────────────────────────────
export const StockMovement = () => {
  const [allData, setAllData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo]     = useState(today());
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(10);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/shipments').catch(() => ({ data: [] })),
      api.get('/inventory/logistics', { params: { per_page: 9999, page: 1 } }).catch(() => ({ data: [] })),
    ]).then(([sR, lR]) => {
      const ships = Array.isArray(sR.data) ? sR.data : sR.data?.data ?? [];
      const logs  = Array.isArray(lR.data) ? lR.data : lR.data?.data ?? [];
      const from  = new Date(dateFrom);
      const to    = new Date(dateTo); to.setHours(23, 59, 59);
      const map   = {};
      ships.filter(s => { const d = new Date(s.created_at); return d >= from && d <= to; })
        .forEach(s => (s.projects || []).forEach(p => {
          const k = `${p.product_category || '?'}::${p.product_code || '?'}`;
          if (!map[k]) map[k] = { cat: p.product_category || '?', code: p.product_code || '?', unit: p.unit || '', in: 0, out: 0 };
          map[k].in += parseInt(p.quantity || 0);
        }));
      logs.filter(l => { const d = new Date(l.date_of_delivery || l.created_at); return d >= from && d <= to; })
        .forEach(l => {
          const k = `${l.product_category || '?'}::${l.product_code || '?'}`;
          if (!map[k]) map[k] = { cat: l.product_category || '?', code: l.product_code || '?', unit: 'pcs', in: 0, out: 0 };
          map[k].out += parseInt(l.quantity || 0);
        });
      setAllData(Object.values(map).sort((a, b) => a.cat.localeCompare(b.cat)));
      setPage(1);
    }).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tIn        = allData.reduce((s, d) => s + d.in,  0);
  const tOut       = allData.reduce((s, d) => s + d.out, 0);
  const totalPages = Math.max(1, Math.ceil(allData.length / perPage));
  const pageData   = allData.slice((page - 1) * perPage, page * perPage);

  const handlePrint = () => {
    const chips = `<div class="summary"><div class="chip"><div class="chip-val">${allData.length}</div><div class="chip-label">Products</div></div><div class="chip green"><div class="chip-val">${fmt(tIn)}</div><div class="chip-label">In (Shipments)</div></div><div class="chip red"><div class="chip-val">${fmt(tOut)}</div><div class="chip-label">Out (Deliveries)</div></div><div class="chip"><div class="chip-val">${fmt(tIn - tOut)}</div><div class="chip-label">Net Movement</div></div></div>`;
    const rows = allData.map(d => `<tr><td><strong>${d.cat}</strong></td><td>${d.code}</td><td>${d.unit}</td><td style="text-align:center;color:#065f46;font-weight:700">${fmt(d.in)}</td><td style="text-align:center;color:#991b1b;font-weight:700">${fmt(d.out)}</td><td style="text-align:center;font-weight:800;color:${d.in - d.out >= 0 ? '#065f46' : '#991b1b'}">${d.in - d.out >= 0 ? '+' : ''}${fmt(d.in - d.out)}</td></tr>`).join('');
    openPrintWindow(`Stock Movement (${fmtDate(dateFrom)}—${fmtDate(dateTo)})`,
      `${chips}<div class="sec">Shipments IN vs Deliveries OUT per Product</div><table><thead><tr><th>Category</th><th>Product Code</th><th>Unit</th><th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No movement in period.</td></tr>'}</tbody></table>`);
  };

  return (
    <div className="rpt-card">
      <SectionHeader title="Stock Movement Summary" subtitle="Cross-module: incoming shipments (IN) vs delivery dispatches (OUT) per product" onPrint={handlePrint} loading={loading}>
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData} />
      </SectionHeader>
      <SummaryRow chips={[
        { value: loading ? '…' : allData.length,  label: 'Products',        color: '#497B97' },
        { value: loading ? '…' : fmt(tIn),        label: 'In (Shipments)',  color: '#16a34a' },
        { value: loading ? '…' : fmt(tOut),       label: 'Out (Deliveries)',color: '#C20100' },
        { value: loading ? '…' : fmt(tIn - tOut), label: 'Net Movement',    color: '#6366f1' },
      ]} />
      {loading ? <Spinner /> : allData.length === 0 ? <Empty /> : (
        <>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Category</th><th>Product Code</th><th>Unit</th><th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net Movement</th></tr></thead>
              <tbody>
                {pageData.map((d, i) => (
                  <tr key={i}>
                    <td><span className="rpt-category-badge">{d.cat}</span></td>
                    <td className="rpt-fw">{d.code}</td>
                    <td>{d.unit}</td>
                    <td className="rpt-tc rpt-fw rpt-green">{fmt(d.in)}</td>
                    <td className="rpt-tc rpt-fw rpt-red">{fmt(d.out)}</td>
                    <td className={`rpt-tc rpt-fw ${d.in - d.out >= 0 ? 'rpt-green' : 'rpt-red'}`}>{d.in - d.out >= 0 ? '+' : ''}{fmt(d.in - d.out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportPagination page={page} totalPages={totalPages} total={allData.length} perPage={perPage} onPage={setPage} onPerPage={v => { setPerPage(v); setPage(1); }} />
        </>
      )}
    </div>
  );
};

// ── 4. Export All Inventory Reports ───────────────────────────────────────────
export const ExportAllInventoryReports = () => {
  const [loading, setLoading]   = useState(false);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo]     = useState(today());

  const handleExport = async () => {
    setLoading(true);
    try {
      const [allInv, shRes, lgRes] = await Promise.all([
        fetchAllInventory(),
        api.get('/inventory/shipments').catch(() => ({ data: [] })),
        api.get('/inventory/logistics', { params: { per_page: 9999, page: 1 } }).catch(() => ({ data: [] })),
      ]);
      const onStock     = allInv.filter(i => i.availability === 'ON STOCK').length;
      const lowStock    = allInv.filter(i => i.availability === 'LOW STOCK').length;
      const noStock     = allInv.filter(i => i.availability === 'NO STOCK').length;
      const totalVal    = allInv.reduce((s, i) => s + ((i.current_stock ?? 0) * (i.unit_price || 0)), 0);
      const needReorder = allInv.filter(i => i.availability === 'LOW STOCK' || i.availability === 'NO STOCK');
      const ships  = Array.isArray(shRes.data) ? shRes.data : shRes.data?.data ?? [];
      const logs   = Array.isArray(lgRes.data) ? lgRes.data : lgRes.data?.data ?? [];
      const from   = new Date(dateFrom);
      const to     = new Date(dateTo); to.setHours(23, 59, 59);
      const fShips = ships.filter(s => { const d = new Date(s.created_at); return d >= from && d <= to; });
      const fLogs  = logs.filter(l  => { const d = new Date(l.date_of_delivery || l.created_at); return d >= from && d <= to; });
      const movMap = {};
      fShips.forEach(s => (s.projects || []).forEach(p => {
        const k = `${p.product_category || '?'}::${p.product_code || '?'}`;
        if (!movMap[k]) movMap[k] = { cat: p.product_category || '?', code: p.product_code || '?', unit: p.unit || '', in: 0, out: 0 };
        movMap[k].in += parseInt(p.quantity || 0);
      }));
      fLogs.forEach(l => {
        const k = `${l.product_category || '?'}::${l.product_code || '?'}`;
        if (!movMap[k]) movMap[k] = { cat: l.product_category || '?', code: l.product_code || '?', unit: 'pcs', in: 0, out: 0 };
        movMap[k].out += parseInt(l.quantity || 0);
      });
      const movData = Object.values(movMap).sort((a, b) => a.cat.localeCompare(b.cat));
      const tIn     = movData.reduce((s, d) => s + d.in, 0);
      const tOut    = movData.reduce((s, d) => s + d.out, 0);
      const reorderRows = needReorder.map(i => {
        const qty = i.current_stock ?? i.quantity ?? 0;
        const av  = i.availability || 'NO STOCK';
        const cls = av === 'NO STOCK' ? 'badge-nostock' : 'badge-low';
        return `<tr><td><strong>${i.product_category || '—'}</strong></td><td>${i.product_code || i.item_name || '—'}</td><td style="text-align:center;color:${qty === 0 ? '#991b1b' : '#92400e'};font-weight:700">${qty}</td><td>${i.unit || '—'}</td><td>${i.condition || '—'}</td><td style="color:#64748b">${i.notes || '—'}</td><td><span class="badge ${cls}">${av === 'NO STOCK' ? 'URGENT — NO STOCK' : 'LOW STOCK'}</span></td></tr>`;
      }).join('');
      const movRows = movData.map(d => `<tr><td><strong>${d.cat}</strong></td><td>${d.code}</td><td>${d.unit}</td><td style="text-align:center;color:#065f46;font-weight:700">${fmt(d.in)}</td><td style="text-align:center;color:#991b1b;font-weight:700">${fmt(d.out)}</td><td style="text-align:center;font-weight:800;color:${d.in - d.out >= 0 ? '#065f46' : '#991b1b'}">${d.in - d.out >= 0 ? '+' : ''}${fmt(d.in - d.out)}</td></tr>`).join('');
      const win = window.open('', '_blank', 'width=1100,height=820');
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VICMIS — Complete Inventory Report</title><style>${PRINT_CSS}</style></head><body>${printHeader('Complete Inventory Report')}<div class="cover"><h1>📦 Complete Inventory Report</h1><p>Vision International Construction OPC · VICMIS</p><p>All Inventory Sub-Reports Combined</p><div class="period">Period: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div></div><div style="margin-bottom:24px"><div class="toc-item"><div class="tnum">1</div><span class="tl">Monthly Ending Inventory</span><span class="ts">${allInv.length} items · ${fmtCurrency(totalVal)}</span></div><div class="toc-item"><div class="tnum">2</div><span class="tl">Low Stock / Reorder Report</span><span class="ts">${needReorder.length} items need reorder</span></div><div class="toc-item"><div class="tnum">3</div><span class="tl">Stock Movement Summary</span><span class="ts">${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</span></div></div><div class="summary"><div class="chip"><div class="chip-val">${allInv.length}</div><div class="chip-label">Total Items</div></div><div class="chip green"><div class="chip-val">${onStock}</div><div class="chip-label">On Stock</div></div><div class="chip orange"><div class="chip-val">${lowStock}</div><div class="chip-label">Low Stock</div></div><div class="chip red"><div class="chip-val">${noStock}</div><div class="chip-label">Out of Stock</div></div><div class="chip green"><div class="chip-val">${fmtCurrency(totalVal)}</div><div class="chip-label">Stock Value</div></div></div><div class="sec">1 · Monthly Ending Inventory (${allInv.length} items)</div><table><thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead><tbody>${buildInventoryRows(allInv) || '<tr><td colspan="9" style="text-align:center;padding:16px;color:#94a3b8">No items.</td></tr>'}</tbody></table><div class="sec pb">2 · Low Stock / Reorder Report (${needReorder.length} items)</div><div class="summary"><div class="chip orange"><div class="chip-val">${needReorder.length}</div><div class="chip-label">Need Reorder</div></div><div class="chip red"><div class="chip-val">${noStock}</div><div class="chip-label">Out of Stock</div></div><div class="chip"><div class="chip-val">${lowStock}</div><div class="chip-label">Low Stock</div></div></div><table><thead><tr><th>Category</th><th>Product Code</th><th>Current Stock</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Status</th></tr></thead><tbody>${reorderRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8">All items sufficiently stocked.</td></tr>'}</tbody></table><div class="sec pb">3 · Stock Movement Summary (${fmtDate(dateFrom)} — ${fmtDate(dateTo)})</div><div class="summary"><div class="chip"><div class="chip-val">${movData.length}</div><div class="chip-label">Products</div></div><div class="chip green"><div class="chip-val">${fmt(tIn)}</div><div class="chip-label">In (Shipments)</div></div><div class="chip red"><div class="chip-val">${fmt(tOut)}</div><div class="chip-label">Out (Deliveries)</div></div><div class="chip"><div class="chip-val">${fmt(tIn - tOut)}</div><div class="chip-label">Net Movement</div></div></div><table><thead><tr><th>Category</th><th>Product Code</th><th>Unit</th><th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net</th></tr></thead><tbody>${movRows || '<tr><td colspan="6" style="text-align:center;padding:16px;color:#94a3b8">No movement in period.</td></tr>'}</tbody></table>${printFooter('Complete Inventory Report')}<script>window.onload=()=>window.print()<\/script></body></html>`);
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
        <label>From<input type="date" value={dateFrom} max={dateTo} onChange={e => setDateFrom(e.target.value)} className="rpt-date-input rpt-date-input-sm" /></label>
        <span className="rpt-date-sep">—</span>
        <label>To<input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} className="rpt-date-input rpt-date-input-sm" /></label>
      </div>
      <button className="rpt-btn rpt-btn-export-all" onClick={handleExport} disabled={loading}>
        {loading ? <><span className="rpt-export-spinner" /> Generating…</> : <>📥 Export All Inventory Reports</>}
      </button>
    </div>
  );
};