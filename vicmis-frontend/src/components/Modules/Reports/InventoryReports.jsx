import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import './Reports.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt        = (n) => new Intl.NumberFormat('en-PH').format(n ?? 0);
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtCurrency= (n) => `₱ ${fmt(n)}`;
const nowStr     = () =>
  new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) +
  ' at ' +
  new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

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
      .chip.red{border-top-color:#C20100}.chip.green{border-top-color:#16a34a}.chip.orange{border-top-color:#f59e0b}
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
      .badge-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
      .badge-low{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}
      .badge-nostock{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
      .badge-blue{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
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
        <div class="rp-date">Generated: ${nowStr()}</div>
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

const DateFilter = ({ from, to, onFrom, onTo, onApply }) => (
  <div className="rpt-date-row">
    <label>From<input type="date" value={from} max={to} onChange={e => onFrom(e.target.value)} className="rpt-date-input" /></label>
    <label>To<input type="date" value={to} min={from} onChange={e => onTo(e.target.value)} className="rpt-date-input" /></label>
    <button className="rpt-btn rpt-btn-apply" onClick={onApply}>Apply</button>
  </div>
);

const today      = () => new Date().toISOString().split('T')[0];
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

const BADGE = {
  ok:      'rpt-badge rpt-badge-ok',
  low:     'rpt-badge rpt-badge-low',
  nostock: 'rpt-badge rpt-badge-nostock',
  blue:    'rpt-badge rpt-badge-blue',
};

// ── 1. Ending Inventory ───────────────────────────────────────────────────────
export const EndingInventory = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouse-inventory')
      .then(r => setData(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const totalVal = data.reduce((s, i) => s + ((i.current_stock ?? i.quantity ?? 0) * (i.unit_price || 0)), 0);
  const onStock  = data.filter(i => i.availability === 'ON STOCK').length;
  const low      = data.filter(i => i.availability === 'LOW STOCK').length;
  const none     = data.filter(i => i.availability === 'NO STOCK').length;

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Total Items</div></div>
      <div class="chip green"><div class="chip-val">${onStock}</div><div class="chip-label">On Stock</div></div>
      <div class="chip orange"><div class="chip-val">${low}</div><div class="chip-label">Low Stock</div></div>
      <div class="chip red"><div class="chip-val">${none}</div><div class="chip-label">Out of Stock</div></div>
      <div class="chip green"><div class="chip-val">${fmtCurrency(totalVal)}</div><div class="chip-label">Total Value</div></div>
    </div>`;
    const rows = data.map(i => {
      const qty = i.current_stock ?? i.quantity ?? 0;
      const res = parseInt(i.reserve || 0);
      const av  = i.availability || (qty === 0 ? 'NO STOCK' : qty <= 10 ? 'LOW STOCK' : 'ON STOCK');
      const cls = av === 'NO STOCK' ? 'badge-nostock' : av === 'LOW STOCK' ? 'badge-low' : 'badge-ok';
      return `<tr>
        <td><strong>${i.product_category || i.category || '—'}</strong></td>
        <td>${i.product_code || i.item_name || i.name || '—'}</td>
        <td style="text-align:center">${qty}</td>
        <td>${i.unit || '—'}</td>
        <td style="text-align:center">${res > 0 ? res : '—'}</td>
        <td style="text-align:center;font-weight:700">${qty - res}</td>
        <td>${i.condition || '—'}</td>
        <td><span class="badge ${cls}">${av}</span></td>
        <td style="color:#64748b;font-size:10px">${i.notes || '—'}</td></tr>`;
    }).join('');
    printReport('Monthly Ending Inventory Report',
      `<div class="sec">Warehouse Inventory — Construction Materials</div>
       <table><thead><tr>
         <th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th>
         <th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">No items.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Monthly Ending Inventory"
        subtitle="Warehouse stock levels, reserve quantities, and availability — Construction Materials module"
        onPrint={handlePrint}
        loading={loading}
      />
      <SummaryRow chips={[
        { value: data.length,        label: 'Total Items',   color: '#497B97' },
        { value: onStock,            label: 'On Stock',      color: '#16a34a' },
        { value: low,                label: 'Low Stock',     color: '#f59e0b' },
        { value: none,               label: 'Out of Stock',  color: '#C20100' },
        { value: fmtCurrency(totalVal), label: 'Total Value', color: '#6366f1' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th>
              <th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => {
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
      )}
    </div>
  );
};

// ── 2. Low Stock ──────────────────────────────────────────────────────────────
export const LowStock = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/warehouse-inventory')
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setData(all.filter(i => i.availability === 'LOW STOCK' || i.availability === 'NO STOCK'));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip orange"><div class="chip-val">${data.length}</div><div class="chip-label">Need Reorder</div></div>
      <div class="chip red"><div class="chip-val">${data.filter(i => i.availability === 'NO STOCK').length}</div><div class="chip-label">Out of Stock</div></div>
      <div class="chip"><div class="chip-val">${data.filter(i => i.availability === 'LOW STOCK').length}</div><div class="chip-label">Low Stock</div></div>
    </div>`;
    const rows = data.map(i => {
      const qty = i.current_stock ?? i.quantity ?? 0;
      const av  = i.availability || 'NO STOCK';
      const cls = av === 'NO STOCK' ? 'badge-nostock' : 'badge-low';
      return `<tr>
        <td><strong>${i.product_category || i.category || '—'}</strong></td>
        <td>${i.product_code || i.item_name || '—'}</td>
        <td style="text-align:center;color:${qty === 0 ? '#991b1b' : '#92400e'};font-weight:700">${qty}</td>
        <td>${i.unit || '—'}</td>
        <td>${i.condition || '—'}</td>
        <td style="color:#64748b">${i.notes || '—'}</td>
        <td><span class="badge ${cls}">${av === 'NO STOCK' ? 'URGENT — NO STOCK' : 'LOW STOCK'}</span></td></tr>`;
    }).join('');
    printReport('Low Stock / Reorder Report',
      `<div class="sec">Items Requiring Reorder</div>
       <table><thead><tr>
         <th>Category</th><th>Product Code</th><th>Current Stock</th><th>Unit</th>
         <th>Condition</th><th>Notes</th><th>Status</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">All items sufficiently stocked.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Low Stock / Reorder Report"
        subtitle="Items flagged LOW STOCK or NO STOCK requiring immediate procurement action"
        onPrint={handlePrint}
        loading={loading}
      />
      <SummaryRow chips={[
        { value: data.length,                                          label: 'Need Reorder',  color: '#f59e0b' },
        { value: data.filter(i => i.availability === 'NO STOCK').length, label: 'Out of Stock', color: '#C20100' },
        { value: data.filter(i => i.availability === 'LOW STOCK').length, label: 'Low Stock',   color: '#d97706' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty msg="All items are sufficiently stocked." /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th>
              <th>Condition</th><th>Notes</th><th>Status</th>
            </tr></thead>
            <tbody>
              {data.map((item, i) => {
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
                    <td><span className={av === 'NO STOCK' ? BADGE.nostock : BADGE.low}>
                      {av === 'NO STOCK' ? 'URGENT — NO STOCK' : 'LOW STOCK'}
                    </span></td>
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

// ── 3. Stock Movement ─────────────────────────────────────────────────────────
export const StockMovement = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo]     = useState(today());

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

      ships
        .filter(s => { const d = new Date(s.created_at); return d >= from && d <= to; })
        .forEach(s => (s.projects || []).forEach(p => {
          const k = `${p.product_category || '?'}::${p.product_code || '?'}`;
          if (!map[k]) map[k] = { cat: p.product_category || '?', code: p.product_code || '?', unit: p.unit || '', in: 0, out: 0 };
          map[k].in += parseInt(p.quantity || 0);
        }));

      logs
        .filter(l => { const d = new Date(l.date_of_delivery || l.created_at); return d >= from && d <= to; })
        .forEach(l => {
          const k = `${l.product_category || '?'}::${l.product_code || '?'}`;
          if (!map[k]) map[k] = { cat: l.product_category || '?', code: l.product_code || '?', unit: 'pcs', in: 0, out: 0 };
          map[k].out += parseInt(l.quantity || 0);
        });

      setData(Object.values(map).sort((a, b) => a.cat.localeCompare(b.cat)));
    }).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tIn  = data.reduce((s, d) => s + d.in,  0);
  const tOut = data.reduce((s, d) => s + d.out, 0);

  const handlePrint = () => {
    const chips = `<div class="summary">
      <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Products</div></div>
      <div class="chip green"><div class="chip-val">${fmt(tIn)}</div><div class="chip-label">In (Shipments)</div></div>
      <div class="chip red"><div class="chip-val">${fmt(tOut)}</div><div class="chip-label">Out (Deliveries)</div></div>
      <div class="chip"><div class="chip-val">${fmt(tIn - tOut)}</div><div class="chip-label">Net Movement</div></div>
    </div>`;
    const rows = data.map(d => `<tr>
      <td><strong>${d.cat}</strong></td><td>${d.code}</td><td>${d.unit}</td>
      <td style="text-align:center;color:#065f46;font-weight:700">${fmt(d.in)}</td>
      <td style="text-align:center;color:#991b1b;font-weight:700">${fmt(d.out)}</td>
      <td style="text-align:center;font-weight:800;color:${d.in - d.out >= 0 ? '#065f46' : '#991b1b'}">
        ${d.in - d.out >= 0 ? '+' : ''}${fmt(d.in - d.out)}
      </td></tr>`).join('');
    printReport(`Stock Movement (${fmtDate(dateFrom)}—${fmtDate(dateTo)})`,
      `<div class="sec">Shipments IN vs Deliveries OUT per Product</div>
       <table><thead><tr>
         <th>Category</th><th>Product Code</th><th>Unit</th>
         <th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net</th>
       </tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No movement in period.</td></tr>'}</tbody></table>`,
      chips);
  };

  return (
    <div className="rpt-card">
      <SectionHeader
        title="Stock Movement Summary"
        subtitle="Cross-module: incoming shipments (IN) vs delivery dispatches (OUT) per product"
        onPrint={handlePrint}
        loading={loading}
      >
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData} />
      </SectionHeader>
      <SummaryRow chips={[
        { value: data.length,      label: 'Products',       color: '#497B97' },
        { value: fmt(tIn),         label: 'In (Shipments)', color: '#16a34a' },
        { value: fmt(tOut),        label: 'Out (Deliveries)',color: '#C20100' },
        { value: fmt(tIn - tOut),  label: 'Net Movement',   color: '#6366f1' },
      ]} />
      {loading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead><tr>
              <th>Category</th><th>Product Code</th><th>Unit</th>
              <th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net Movement</th>
            </tr></thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i}>
                  <td><span className="rpt-category-badge">{d.cat}</span></td>
                  <td className="rpt-fw">{d.code}</td>
                  <td>{d.unit}</td>
                  <td className="rpt-tc rpt-fw rpt-green">{fmt(d.in)}</td>
                  <td className="rpt-tc rpt-fw rpt-red">{fmt(d.out)}</td>
                  <td className={`rpt-tc rpt-fw ${d.in - d.out >= 0 ? 'rpt-green' : 'rpt-red'}`}>
                    {d.in - d.out >= 0 ? '+' : ''}{fmt(d.in - d.out)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};