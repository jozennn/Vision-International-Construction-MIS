import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import './Reports.css';

const today      = () => new Date().toISOString().split('T')[0];
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const fmt        = (n) => new Intl.NumberFormat('en-PH').format(n ?? 0);
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—';
const fmtCurrency= (n) => `₱ ${fmt(n)}`;
const nowStr     = () => new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) + ' at ' + new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#221F1F;padding:36px;font-size:12px;background:#fff}
  .rh{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:16px;border-bottom:4px solid #C20100}
  .rh .co-name{font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
  .rh .co-sub{font-size:10px;color:#497B97;font-weight:600;margin-top:2px}
  .rh .co-tag{font-size:9px;color:#94a3b8;margin-top:1px}
  .rh .rt{font-size:14px;font-weight:800;color:#C20100;text-align:right}
  .rh .rd{font-size:10px;color:#64748b;margin-top:4px;text-align:right}
  .chips{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
  .chip{flex:1;min-width:100px;background:#FAF8F6;border:1px solid #EBDBD6;border-top:3px solid #497B97;border-radius:8px;padding:9px 12px}
  .chip.red{border-top-color:#C20100}.chip.green{border-top-color:#16a34a}.chip.orange{border-top-color:#f59e0b}
  .cv{font-size:18px;font-weight:800;color:#221F1F;line-height:1}.cl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-top:3px}
  .sec{font-size:10px;font-weight:800;color:#221F1F;text-transform:uppercase;letter-spacing:.1em;margin:16px 0 8px;display:flex;align-items:center;gap:8px}
  .sec::after{content:'';flex:1;height:1px;background:#EBDBD6}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}thead tr{background:#221F1F}
  th{padding:8px 10px;text-align:left;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr:nth-child(even) td{background:#FAF8F6}tr:last-child td{border-bottom:none}
  .b{display:inline-flex;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:700}
  .ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}.low{background:#fffbeb;color:#92400e;border:1px solid #fcd34d}
  .no{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}.bl{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
  .rf{margin-top:20px;padding-top:10px;border-top:1px solid #EBDBD6;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
  .rf strong{color:#C20100}.pb{page-break-before:always;margin-top:32px}
  @media print{body{padding:20px}}
`;

const rh = (title) => `<div class="rh"><div><div class="co-name">Vision International Construction OPC</div><div class="co-sub">VICMIS — Management Information System</div><div class="co-tag">"You Envision, We Build!"</div></div><div><div class="rt">${title}</div><div class="rd">Generated: ${nowStr()}</div></div></div>`;
const rf = (title) => `<div class="rf"><span>VICMIS — <strong>Confidential</strong> · Do not distribute</span><span>${title} · ${new Date().toLocaleDateString('en-PH')}</span></div>`;

const openPrint = (title, body) => {
  const win = window.open('','_blank','width=1050,height=780');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VICMIS — ${title}</title><style>${BASE_CSS}</style></head><body>${rh(title)}${body}${rf(title)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
};

const SectionHeader = ({ title, subtitle, onPrint, loading, children }) => (
  <div className="rpt-sec-header">
    <div className="rpt-sec-header-left">
      <h2 className="rpt-sec-title">{title}</h2>
      <p className="rpt-sec-sub">{subtitle}</p>
    </div>
    <div className="rpt-sec-actions">
      {children}
      {onPrint && <button className="rpt-btn rpt-btn-print" onClick={onPrint} disabled={loading}>🖨️ Print / PDF</button>}
    </div>
  </div>
);

const SummaryRow = ({ chips }) => (
  <div className="rpt-summary-row">
    {chips.map((c,i) => (
      <div key={i} className="rpt-chip" style={{'--chip-accent':c.color||'#497B97'}}>
        <div className="rpt-chip-val">{c.value}</div>
        <div className="rpt-chip-label">{c.label}</div>
      </div>
    ))}
  </div>
);

const Empty = ({ msg='No data found for the selected period.' }) => (
  <div className="rpt-empty"><div className="rpt-empty-icon">📭</div><p>{msg}</p></div>
);
const Spinner = () => <div className="rpt-loading"><div className="rpt-spinner" /></div>;
const DateFilter = ({ from, to, onFrom, onTo, onApply }) => (
  <div className="rpt-date-row">
    <label>From<input type="date" value={from} max={to} onChange={e=>onFrom(e.target.value)} className="rpt-date-input"/></label>
    <label>To<input type="date" value={to} min={from} onChange={e=>onTo(e.target.value)} className="rpt-date-input"/></label>
    <button className="rpt-btn rpt-btn-apply" onClick={onApply}>Apply</button>
  </div>
);

const BD = { ok:'rpt-badge rpt-badge-ok', low:'rpt-badge rpt-badge-low', nostock:'rpt-badge rpt-badge-nostock', blue:'rpt-badge rpt-badge-blue' };

// ── 1. Ending Inventory (ConstructionMat) ─────────────────────────────────────
const EndingInventory = () => {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ api.get('/warehouse-inventory').then(r=>setData(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(()=>setData([])).finally(()=>setLoading(false)); },[]);
  const totalVal=data.reduce((s,i)=>s+((i.current_stock??i.quantity??0)*(i.unit_price||0)),0);
  const low=data.filter(i=>i.availability==='LOW STOCK').length;
  const none=data.filter(i=>i.availability==='NO STOCK').length;
  const onStock=data.filter(i=>i.availability==='ON STOCK').length;
  const rows=(d)=>d.map(i=>{
    const qty=i.current_stock??i.quantity??0; const res=parseInt(i.reserve||0);
    const av=i.availability||(qty===0?'NO STOCK':qty<=10?'LOW STOCK':'ON STOCK');
    const cls=av==='NO STOCK'?'no':av==='LOW STOCK'?'low':'ok';
    return `<tr><td><strong>${i.product_category||i.category||'—'}</strong></td><td>${i.product_code||i.item_name||i.name||'—'}</td><td style="text-align:center">${qty}</td><td>${i.unit||'—'}</td><td style="text-align:center">${res>0?res:'—'}</td><td style="text-align:center;font-weight:700">${qty-res}</td><td>${i.condition||'—'}</td><td><span class="b ${cls}">${av}</span></td><td style="color:#64748b;font-size:10px">${i.notes||'—'}</td></tr>`;
  }).join('');
  const handlePrint=()=>openPrint('Monthly Ending Inventory Report',
    `<div class="chips"><div class="chip"><div class="cv">${data.length}</div><div class="cl">Total Items</div></div><div class="chip green"><div class="cv">${onStock}</div><div class="cl">On Stock</div></div><div class="chip orange"><div class="cv">${low}</div><div class="cl">Low Stock</div></div><div class="chip red"><div class="cv">${none}</div><div class="cl">Out of Stock</div></div><div class="chip green"><div class="cv">${fmtCurrency(totalVal)}</div><div class="cl">Total Value</div></div></div>
    <div class="sec">Warehouse Inventory — Construction Materials</div>
    <table><thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows(data)||'<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">No items.</td></tr>'}</tbody></table>`);
  return (
    <div className="rpt-card">
      <SectionHeader title="Monthly Ending Inventory" subtitle="Warehouse stock levels, reserve quantities, and availability — from Construction Materials module" onPrint={handlePrint} loading={loading}/>
      <SummaryRow chips={[{value:data.length,label:'Total Items',color:'#497B97'},{value:onStock,label:'On Stock',color:'#16a34a'},{value:low,label:'Low Stock',color:'#f59e0b'},{value:none,label:'Out of Stock',color:'#C20100'},{value:fmtCurrency(totalVal),label:'Total Value',color:'#6366f1'}]}/>
      {loading?<Spinner/>:data.length===0?<Empty/>:(
        <div className="rpt-table-wrap"><table className="rpt-table">
          <thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>{data.map((item,i)=>{const qty=item.current_stock??item.quantity??0;const res=parseInt(item.reserve||0);const av=item.availability||(qty===0?'NO STOCK':qty<=10?'LOW STOCK':'ON STOCK');const st=av==='NO STOCK'?'nostock':av==='LOW STOCK'?'low':'ok';return(<tr key={i}><td><span className="rpt-category-badge">{item.product_category||item.category||'—'}</span></td><td className="rpt-fw">{item.product_code||item.item_name||item.name||'—'}</td><td className="rpt-tc">{qty}</td><td>{item.unit||'—'}</td><td className="rpt-tc rpt-dim">{res>0?res:'—'}</td><td className="rpt-tc rpt-fw">{qty-res}</td><td>{item.condition||'—'}</td><td><span className={BD[st]}>{av}</span></td><td className="rpt-dim">{item.notes||'—'}</td></tr>);})}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ── 2. Low Stock (ConstructionMat) ────────────────────────────────────────────
const LowStock = () => {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ api.get('/warehouse-inventory').then(r=>{const all=Array.isArray(r.data)?r.data:r.data?.data??[];setData(all.filter(i=>i.availability==='LOW STOCK'||i.availability==='NO STOCK'));}).catch(()=>setData([])).finally(()=>setLoading(false)); },[]);
  const handlePrint=()=>openPrint('Low Stock / Reorder Report',
    `<div class="chips"><div class="chip orange"><div class="cv">${data.length}</div><div class="cl">Need Reorder</div></div><div class="chip red"><div class="cv">${data.filter(i=>i.availability==='NO STOCK').length}</div><div class="cl">Out of Stock</div></div><div class="chip"><div class="cv">${data.filter(i=>i.availability==='LOW STOCK').length}</div><div class="cl">Low Stock</div></div></div>
    <div class="sec">Items Requiring Reorder</div>
    <table><thead><tr><th>Category</th><th>Product Code</th><th>Current Stock</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Status</th></tr></thead><tbody>${data.map(i=>{const qty=i.current_stock??i.quantity??0;const av=i.availability||'NO STOCK';const cls=av==='NO STOCK'?'no':'low';return`<tr><td><strong>${i.product_category||i.category||'—'}</strong></td><td>${i.product_code||i.item_name||'—'}</td><td style="text-align:center;color:${qty===0?'#991b1b':'#92400e'};font-weight:700">${qty}</td><td>${i.unit||'—'}</td><td>${i.condition||'—'}</td><td style="color:#64748b">${i.notes||'—'}</td><td><span class="b ${cls}">${av==='NO STOCK'?'URGENT — NO STOCK':'LOW STOCK'}</span></td></tr>`;}).join('')||'<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">All items sufficiently stocked.</td></tr>'}</tbody></table>`);
  return (
    <div className="rpt-card">
      <SectionHeader title="Low Stock / Reorder Report" subtitle="Items flagged LOW STOCK or NO STOCK requiring immediate procurement action" onPrint={handlePrint} loading={loading}/>
      <SummaryRow chips={[{value:data.length,label:'Need Reorder',color:'#f59e0b'},{value:data.filter(i=>i.availability==='NO STOCK').length,label:'Out of Stock',color:'#C20100'},{value:data.filter(i=>i.availability==='LOW STOCK').length,label:'Low Stock',color:'#d97706'}]}/>
      {loading?<Spinner/>:data.length===0?<Empty msg="All items are sufficiently stocked."/>:(
        <div className="rpt-table-wrap"><table className="rpt-table">
          <thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Status</th></tr></thead>
          <tbody>{data.map((item,i)=>{const qty=item.current_stock??item.quantity??0;const av=item.availability||'NO STOCK';return(<tr key={i}><td><span className="rpt-category-badge">{item.product_category||item.category||'—'}</span></td><td className="rpt-fw">{item.product_code||item.item_name||item.name||'—'}</td><td className={`rpt-tc rpt-fw ${av==='NO STOCK'?'rpt-red':'rpt-orange'}`}>{qty}</td><td>{item.unit||'—'}</td><td>{item.condition||'—'}</td><td className="rpt-dim">{item.notes||'—'}</td><td><span className={av==='NO STOCK'?BD.nostock:BD.low}>{av==='NO STOCK'?'URGENT — NO STOCK':'LOW STOCK'}</span></td></tr>);})}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ── 3. Incoming Shipments (IncomingShipment.jsx) ──────────────────────────────
const IncomingShipments = () => {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  const [dateFrom,setDateFrom]=useState(monthStart()); const [dateTo,setDateTo]=useState(today());
  const fetchData=useCallback(()=>{
    setLoading(true);
    api.get('/inventory/shipments').then(r=>{
      const all=Array.isArray(r.data)?r.data:r.data?.data??[];
      const from=new Date(dateFrom); const to=new Date(dateTo); to.setHours(23,59,59);
      setData(all.filter(s=>{const d=new Date(s.created_at||s.date);return d>=from&&d<=to;}));
    }).catch(()=>setData([])).finally(()=>setLoading(false));
  },[dateFrom,dateTo]);
  useEffect(()=>{fetchData();},[fetchData]);
  const arrived=data.filter(s=>s.shipment_status==='ARRIVED').length;
  const inTransit=data.filter(s=>s.shipment_status==='DEPARTURE').length;
  const waiting=data.filter(s=>s.shipment_status==='WAITING').length;
  const addedInv=data.filter(s=>s.added_to_inventory).length;
  const sBadge=s=>s==='ARRIVED'?'<span class="b ok">ARRIVED</span>':s==='DEPARTURE'?'<span class="b bl">IN TRANSIT</span>':'<span class="b low">WAITING</span>';
  const handlePrint=()=>openPrint(`Incoming Shipments (${fmtDate(dateFrom)}—${fmtDate(dateTo)})`,
    `<div class="chips"><div class="chip"><div class="cv">${data.length}</div><div class="cl">Total</div></div><div class="chip green"><div class="cv">${arrived}</div><div class="cl">Arrived</div></div><div class="chip"><div class="cv">${inTransit}</div><div class="cl">In Transit</div></div><div class="chip orange"><div class="cv">${waiting}</div><div class="cl">Waiting</div></div><div class="chip green"><div class="cv">${addedInv}</div><div class="cl">Added to Inventory</div></div></div>
    <div class="sec">Shipments — ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}</div>
    <table><thead><tr><th>Shipment No.</th><th>Origin</th><th>Container</th><th>Purpose</th><th>Location</th><th>Tentative Arrival</th><th>Status</th><th>In Inventory</th></tr></thead><tbody>${data.map(s=>`<tr><td><strong>${s.shipment_number||'—'}</strong></td><td>${s.origin_type||'—'}</td><td>${s.container_type||'—'}</td><td>${s.shipment_purpose==='NEW_STOCK'?'New Stock':'Reserve'}</td><td>${s.location||'—'}</td><td>${fmtDate(s.tentative_arrival)}</td><td>${sBadge(s.shipment_status)}</td><td>${s.added_to_inventory?'<span class="b ok">Yes</span>':'<span class="b low">Pending</span>'}</td></tr>`).join('')||'<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No shipments in period.</td></tr>'}</tbody></table>`);
  return (
    <div className="rpt-card">
      <SectionHeader title="Incoming Shipments Report" subtitle="All shipment records — status, origin, container, arrival timeline, and inventory readiness" onPrint={handlePrint} loading={loading}>
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData}/>
      </SectionHeader>
      <SummaryRow chips={[{value:data.length,label:'Total Shipments',color:'#497B97'},{value:arrived,label:'Arrived',color:'#16a34a'},{value:inTransit,label:'In Transit',color:'#6366f1'},{value:waiting,label:'Waiting',color:'#f59e0b'},{value:addedInv,label:'In Inventory',color:'#059669'}]}/>
      {loading?<Spinner/>:data.length===0?<Empty/>:(
        <div className="rpt-table-wrap"><table className="rpt-table">
          <thead><tr><th>Shipment No.</th><th>Origin</th><th>Container</th><th>Purpose</th><th>Location</th><th>Tentative Arrival</th><th>Status</th><th>In Inventory</th></tr></thead>
          <tbody>{data.map((s,i)=><tr key={i}><td className="rpt-fw">{s.shipment_number||'—'}</td><td><span className={`rpt-origin-tag ${s.origin_type==='INTERNATIONAL'?'rpt-intl':'rpt-local'}`}>{s.origin_type==='INTERNATIONAL'?'🌐 Intl':'🏢 Local'}</span></td><td>{s.container_type||'—'}</td><td><span className={s.shipment_purpose==='NEW_STOCK'?BD.ok:BD.blue}>{s.shipment_purpose==='NEW_STOCK'?'New Stock':'Reserve'}</span></td><td>{s.location||'—'}</td><td className="rpt-dim">{fmtDate(s.tentative_arrival)}</td><td><span className={s.shipment_status==='ARRIVED'?BD.ok:s.shipment_status==='DEPARTURE'?BD.blue:BD.low}>{s.shipment_status}</span></td><td className="rpt-tc"><span className={s.added_to_inventory?BD.ok:BD.low}>{s.added_to_inventory?'Yes':'Pending'}</span></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ── 4. Delivery Materials (DeliveryMat.jsx) ───────────────────────────────────
const DeliveryMaterials = () => {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  const [dateFrom,setDateFrom]=useState(monthStart()); const [dateTo,setDateTo]=useState(today());
  const fetchData=useCallback(()=>{
    setLoading(true);
    api.get('/inventory/logistics',{params:{per_page:9999,page:1}}).then(r=>{
      const all=Array.isArray(r.data)?r.data:r.data?.data??[];
      const from=new Date(dateFrom); const to=new Date(dateTo); to.setHours(23,59,59);
      setData(all.filter(d=>{const dt=new Date(d.date_of_delivery||d.created_at);return dt>=from&&dt<=to;}));
    }).catch(()=>setData([])).finally(()=>setLoading(false));
  },[dateFrom,dateTo]);
  useEffect(()=>{fetchData();},[fetchData]);
  const delivered=data.filter(d=>d.status==='Delivered').length;
  const inTransit=data.filter(d=>d.status==='In Transit').length;
  const totalQty=data.reduce((s,d)=>s+parseInt(d.quantity||0),0);
  const handlePrint=()=>openPrint(`Delivery Materials (${fmtDate(dateFrom)}—${fmtDate(dateTo)})`,
    `<div class="chips"><div class="chip"><div class="cv">${data.length}</div><div class="cl">Total Deliveries</div></div><div class="chip green"><div class="cv">${delivered}</div><div class="cl">Delivered</div></div><div class="chip orange"><div class="cv">${inTransit}</div><div class="cl">In Transit</div></div><div class="chip"><div class="cv">${fmt(totalQty)}</div><div class="cl">Total Units</div></div></div>
    <div class="sec">Deliveries — ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}</div>
    <table><thead><tr><th>Trucking</th><th>Category</th><th>Product Code</th><th>Type</th><th>Project</th><th>Driver</th><th>Destination</th><th>Qty</th><th>Delivery Date</th><th>Date Delivered</th><th>Status</th></tr></thead><tbody>${data.map(d=>`<tr><td>${d.trucking_service||'—'}</td><td><strong>${d.product_category||'—'}</strong></td><td>${d.product_code||'—'}</td><td>${d.is_consumable?'Consumable':'Main'}</td><td>${d.project_name||'—'}</td><td>${d.driver_name||'—'}</td><td>${d.destination||'—'}</td><td style="text-align:center">${d.quantity||'—'}</td><td>${d.date_of_delivery||'—'}</td><td>${d.date_delivered?fmtDate(d.date_delivered):'—'}</td><td><span class="b ${d.status==='Delivered'?'ok':'low'}">${d.status}</span></td></tr>`).join('')||'<tr><td colspan="11" style="text-align:center;padding:20px;color:#94a3b8">No deliveries in period.</td></tr>'}</tbody></table>`);
  return (
    <div className="rpt-card">
      <SectionHeader title="Delivery Materials Report" subtitle="All dispatched deliveries — trucking service, driver, destination, and delivery status" onPrint={handlePrint} loading={loading}>
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData}/>
      </SectionHeader>
      <SummaryRow chips={[{value:data.length,label:'Total Deliveries',color:'#497B97'},{value:delivered,label:'Delivered',color:'#16a34a'},{value:inTransit,label:'In Transit',color:'#f59e0b'},{value:fmt(totalQty),label:'Total Units',color:'#6366f1'}]}/>
      {loading?<Spinner/>:data.length===0?<Empty/>:(
        <div className="rpt-table-wrap"><table className="rpt-table">
          <thead><tr><th>Trucking</th><th>Category</th><th>Product Code</th><th>Type</th><th>Project</th><th>Driver</th><th>Destination</th><th>Qty</th><th>Delivery Date</th><th>Delivered</th><th>Status</th></tr></thead>
          <tbody>{data.map((d,i)=><tr key={i}><td>{d.trucking_service||'—'}</td><td><span className="rpt-category-badge">{d.product_category||'—'}</span></td><td className="rpt-fw">{d.product_code||'—'}</td><td><span className={d.is_consumable?BD.low:BD.blue}>{d.is_consumable?'Consumable':'Main'}</span></td><td>{d.project_name||'—'}</td><td>{d.driver_name||'—'}</td><td>{d.destination||'—'}</td><td className="rpt-tc rpt-fw">{d.quantity||'—'}</td><td className="rpt-dim">{d.date_of_delivery||'—'}</td><td className="rpt-dim">{d.date_delivered?fmtDate(d.date_delivered):'—'}</td><td><span className={d.status==='Delivered'?BD.ok:BD.low}>{d.status}</span></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ── 5. Stock Movement (Shipments IN + Deliveries OUT) ─────────────────────────
const StockMovement = () => {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  const [dateFrom,setDateFrom]=useState(monthStart()); const [dateTo,setDateTo]=useState(today());
  const fetchData=useCallback(()=>{
    setLoading(true);
    Promise.all([api.get('/inventory/shipments').catch(()=>({data:[]})),api.get('/inventory/logistics',{params:{per_page:9999,page:1}}).catch(()=>({data:[]}))]).then(([sR,lR])=>{
      const ships=Array.isArray(sR.data)?sR.data:sR.data?.data??[];
      const logs=Array.isArray(lR.data)?lR.data:lR.data?.data??[];
      const from=new Date(dateFrom); const to=new Date(dateTo); to.setHours(23,59,59);
      const map={};
      ships.filter(s=>{const d=new Date(s.created_at);return d>=from&&d<=to;}).forEach(s=>(s.projects||[]).forEach(p=>{const k=`${p.product_category||'?'}::${p.product_code||'?'}`;if(!map[k])map[k]={cat:p.product_category||'?',code:p.product_code||'?',unit:p.unit||'',in:0,out:0};map[k].in+=parseInt(p.quantity||0);}));
      logs.filter(l=>{const d=new Date(l.date_of_delivery||l.created_at);return d>=from&&d<=to;}).forEach(l=>{const k=`${l.product_category||'?'}::${l.product_code||'?'}`;if(!map[k])map[k]={cat:l.product_category||'?',code:l.product_code||'?',unit:'pcs',in:0,out:0};map[k].out+=parseInt(l.quantity||0);});
      setData(Object.values(map).sort((a,b)=>a.cat.localeCompare(b.cat)));
    }).finally(()=>setLoading(false));
  },[dateFrom,dateTo]);
  useEffect(()=>{fetchData();},[fetchData]);
  const tIn=data.reduce((s,d)=>s+d.in,0); const tOut=data.reduce((s,d)=>s+d.out,0);
  const handlePrint=()=>openPrint(`Stock Movement (${fmtDate(dateFrom)}—${fmtDate(dateTo)})`,
    `<div class="chips"><div class="chip"><div class="cv">${data.length}</div><div class="cl">Products</div></div><div class="chip green"><div class="cv">${fmt(tIn)}</div><div class="cl">In (Shipments)</div></div><div class="chip red"><div class="cv">${fmt(tOut)}</div><div class="cl">Out (Deliveries)</div></div><div class="chip"><div class="cv">${fmt(tIn-tOut)}</div><div class="cl">Net Movement</div></div></div>
    <div class="sec">Shipments IN vs Deliveries OUT per Product</div>
    <table><thead><tr><th>Category</th><th>Product Code</th><th>Unit</th><th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net</th></tr></thead><tbody>${data.map(d=>`<tr><td><strong>${d.cat}</strong></td><td>${d.code}</td><td>${d.unit}</td><td style="text-align:center;color:#065f46;font-weight:700">${fmt(d.in)}</td><td style="text-align:center;color:#991b1b;font-weight:700">${fmt(d.out)}</td><td style="text-align:center;font-weight:800;color:${d.in-d.out>=0?'#065f46':'#991b1b'}">${d.in-d.out>=0?'+':''}${fmt(d.in-d.out)}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No movement in period.</td></tr>'}</tbody></table>`);
  return (
    <div className="rpt-card">
      <SectionHeader title="Stock Movement Summary" subtitle="Cross-module: incoming shipments (IN) vs delivery dispatches (OUT) per product" onPrint={handlePrint} loading={loading}>
        <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={fetchData}/>
      </SectionHeader>
      <SummaryRow chips={[{value:data.length,label:'Products',color:'#497B97'},{value:fmt(tIn),label:'In (Shipments)',color:'#16a34a'},{value:fmt(tOut),label:'Out (Deliveries)',color:'#C20100'},{value:fmt(tIn-tOut),label:'Net Movement',color:'#6366f1'}]}/>
      {loading?<Spinner/>:data.length===0?<Empty/>:(
        <div className="rpt-table-wrap"><table className="rpt-table">
          <thead><tr><th>Category</th><th>Product Code</th><th>Unit</th><th>In (Shipments)</th><th>Out (Deliveries)</th><th>Net Movement</th></tr></thead>
          <tbody>{data.map((d,i)=><tr key={i}><td><span className="rpt-category-badge">{d.cat}</span></td><td className="rpt-fw">{d.code}</td><td>{d.unit}</td><td className="rpt-tc rpt-fw rpt-green">{fmt(d.in)}</td><td className="rpt-tc rpt-fw rpt-red">{fmt(d.out)}</td><td className={`rpt-tc rpt-fw ${d.in-d.out>=0?'rpt-green':'rpt-red'}`}>{d.in-d.out>=0?'+':''}{fmt(d.in-d.out)}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ── Export All Combined ───────────────────────────────────────────────────────
const ExportAll = ({ dateFrom, dateTo }) => {
  const [loading,setLoading]=useState(false);
  const handle=async()=>{
    setLoading(true);
    try {
      const [whR,shR,lgR]=await Promise.all([
        api.get('/warehouse-inventory').catch(()=>({data:[]})),
        api.get('/inventory/shipments').catch(()=>({data:[]})),
        api.get('/inventory/logistics',{params:{per_page:9999,page:1}}).catch(()=>({data:[]})),
      ]);
      const wh=Array.isArray(whR.data)?whR.data:whR.data?.data??[];
      const sh=Array.isArray(shR.data)?shR.data:shR.data?.data??[];
      const lg=Array.isArray(lgR.data)?lgR.data:lgR.data?.data??[];
      const from=new Date(dateFrom); const to=new Date(dateTo); to.setHours(23,59,59);
      const fSh=sh.filter(s=>{const d=new Date(s.created_at);return d>=from&&d<=to;});
      const fLg=lg.filter(l=>{const d=new Date(l.date_of_delivery||l.created_at);return d>=from&&d<=to;});
      const totalVal=wh.reduce((s,i)=>s+((i.current_stock??i.quantity??0)*(i.unit_price||0)),0);
      const whRows=wh.map(i=>{const qty=i.current_stock??i.quantity??0;const res=parseInt(i.reserve||0);const av=i.availability||(qty===0?'NO STOCK':qty<=10?'LOW STOCK':'ON STOCK');const cls=av==='NO STOCK'?'no':av==='LOW STOCK'?'low':'ok';return`<tr><td><strong>${i.product_category||i.category||'—'}</strong></td><td>${i.product_code||i.item_name||'—'}</td><td style="text-align:center">${qty}</td><td>${i.unit||'—'}</td><td style="text-align:center">${res>0?res:'—'}</td><td style="text-align:center;font-weight:700">${qty-res}</td><td>${i.condition||'—'}</td><td><span class="b ${cls}">${av}</span></td><td style="color:#64748b;font-size:10px">${i.notes||'—'}</td></tr>`;}).join('');
      const shRows=fSh.map(s=>`<tr><td><strong>${s.shipment_number||'—'}</strong></td><td>${s.origin_type||'—'}</td><td>${s.container_type||'—'}</td><td>${s.shipment_purpose==='NEW_STOCK'?'New Stock':'Reserve'}</td><td>${s.location||'—'}</td><td>${fmtDate(s.tentative_arrival)}</td><td><span class="b ${s.shipment_status==='ARRIVED'?'ok':s.shipment_status==='DEPARTURE'?'bl':'low'}">${s.shipment_status}</span></td><td>${s.added_to_inventory?'<span class="b ok">Yes</span>':'<span class="b low">Pending</span>'}</td></tr>`).join('');
      const lgRows=fLg.map(d=>`<tr><td>${d.trucking_service||'—'}</td><td><strong>${d.product_category||'—'}</strong></td><td>${d.product_code||'—'}</td><td>${d.project_name||'—'}</td><td>${d.driver_name||'—'}</td><td>${d.destination||'—'}</td><td style="text-align:center">${d.quantity||'—'}</td><td>${d.date_of_delivery||'—'}</td><td><span class="b ${d.status==='Delivered'?'ok':'low'}">${d.status}</span></td></tr>`).join('');
      const win=window.open('','_blank','width=1100,height=800');
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VICMIS — Complete Inventory Report</title>
        <style>${BASE_CSS}
          .cover{text-align:center;padding:50px 40px;background:#221F1F;color:#fff;border-radius:12px;margin-bottom:28px}
          .cover h1{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
          .cover p{font-size:11px;color:rgba(235,219,214,.65);margin-bottom:4px}
          .period{font-size:11px;color:#C20100;font-weight:700;margin-top:12px;background:rgba(194,1,0,.15);padding:5px 14px;border-radius:999px;display:inline-block}
          .toc-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #EBDBD6;font-size:11px}
          .tnum{width:22px;height:22px;background:#221F1F;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
          .tl{font-weight:600}.ts{color:#94a3b8;font-size:10px;margin-left:auto}
        </style></head><body>
        ${rh('Complete Inventory Report')}
        <div class="cover">
          <h1>📦 Complete Inventory Report</h1>
          <p>Vision International Construction OPC · VICMIS</p>
          <p>All Inventory Sub-Modules Combined</p>
          <div class="period">Period: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div>
        </div>
        <div style="margin-bottom:20px">
          <div class="toc-item"><div class="tnum">1</div><span class="tl">Warehouse / Ending Inventory</span><span class="ts">${wh.length} items · ${fmtCurrency(totalVal)}</span></div>
          <div class="toc-item"><div class="tnum">2</div><span class="tl">Incoming Shipments</span><span class="ts">${fSh.length} shipments in period</span></div>
          <div class="toc-item"><div class="tnum">3</div><span class="tl">Delivery Materials</span><span class="ts">${fLg.length} deliveries · ${fLg.filter(d=>d.status==='Delivered').length} delivered</span></div>
        </div>
        <div class="chips">
          <div class="chip"><div class="cv">${wh.length}</div><div class="cl">Warehouse Items</div></div>
          <div class="chip red"><div class="cv">${wh.filter(i=>i.availability==='NO STOCK').length}</div><div class="cl">Out of Stock</div></div>
          <div class="chip orange"><div class="cv">${wh.filter(i=>i.availability==='LOW STOCK').length}</div><div class="cl">Low Stock</div></div>
          <div class="chip"><div class="cv">${fSh.length}</div><div class="cl">Shipments</div></div>
          <div class="chip green"><div class="cv">${fLg.length}</div><div class="cl">Deliveries</div></div>
          <div class="chip green"><div class="cv">${fmtCurrency(totalVal)}</div><div class="cl">Total Stock Value</div></div>
        </div>
        <div class="sec">1 · Warehouse Ending Inventory</div>
        <table><thead><tr><th>Category</th><th>Product Code</th><th>Stock</th><th>Unit</th><th>Reserve</th><th>Available</th><th>Condition</th><th>Status</th><th>Notes</th></tr></thead><tbody>${whRows||'<tr><td colspan="9" style="text-align:center;padding:16px;color:#94a3b8">No items.</td></tr>'}</tbody></table>
        <div class="sec pb">2 · Incoming Shipments (${fmtDate(dateFrom)}—${fmtDate(dateTo)})</div>
        <table><thead><tr><th>Shipment No.</th><th>Origin</th><th>Container</th><th>Purpose</th><th>Location</th><th>Tentative Arrival</th><th>Status</th><th>In Inventory</th></tr></thead><tbody>${shRows||'<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">No shipments in period.</td></tr>'}</tbody></table>
        <div class="sec pb">3 · Delivery Materials (${fmtDate(dateFrom)}—${fmtDate(dateTo)})</div>
        <table><thead><tr><th>Trucking</th><th>Category</th><th>Product Code</th><th>Project</th><th>Driver</th><th>Destination</th><th>Qty</th><th>Date</th><th>Status</th></tr></thead><tbody>${lgRows||'<tr><td colspan="9" style="text-align:center;padding:16px;color:#94a3b8">No deliveries in period.</td></tr>'}</tbody></table>
        ${rf('Complete Inventory Report')}
        <script>window.onload=()=>window.print()<\/script></body></html>`);
      win.document.close();
    } catch(e){ alert('Failed to generate report.'); } finally { setLoading(false); }
  };
  return (
    <button className="rpt-btn rpt-btn-export-all" onClick={handle} disabled={loading}>
      {loading?<><span className="rpt-export-spinner"/>Generating…</>:<>📥 Export All — Combined Report</>}
    </button>
  );
};

// ── Project Reports ───────────────────────────────────────────────────────────
const ProjectStatus=()=>{
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/projects').then(r=>setData(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(()=>setData([])).finally(()=>setLoading(false));},[]);
  const byStatus=data.reduce((acc,p)=>{const s=p.status||'Unknown';acc[s]=(acc[s]||0)+1;return acc;},{});
  const handlePrint=()=>openPrint('Project Status Summary',
    `<div class="chips"><div class="chip"><div class="cv">${data.length}</div><div class="cl">Total Projects</div></div>${Object.entries(byStatus).map(([s,c])=>`<div class="chip"><div class="cv">${c}</div><div class="cl">${s}</div></div>`).join('')}</div>
    <div class="sec">All Projects</div>
    <table><thead><tr><th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th></tr></thead><tbody>${data.map(p=>`<tr><td><strong>${p.project_name||p.name||'—'}</strong></td><td>${p.client_name||'—'}</td><td>${p.location||'—'}</td><td><span class="b bl">${p.status||'—'}</span></td><td>${fmtDate(p.created_at)}</td><td>${p.project_type||'—'}</td></tr>`).join('')}</tbody></table>`);
  return (<div className="rpt-card"><SectionHeader title="Project Status Summary" subtitle="Overview of all construction projects and their current stage" onPrint={handlePrint} loading={loading}/><SummaryRow chips={[{value:data.length,label:'Total Projects',color:'#497B97'},...Object.entries(byStatus).map(([s,c])=>({value:c,label:s,color:'#6366f1'}))]}/>{loading?<Spinner/>:data.length===0?<Empty/>:(<div className="rpt-table-wrap"><table className="rpt-table"><thead><tr><th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th>Date Started</th><th>Type</th></tr></thead><tbody>{data.map((p,i)=><tr key={i}><td className="rpt-fw">{p.project_name||p.name||'—'}</td><td>{p.client_name||'—'}</td><td>{p.location||'—'}</td><td><span className={BD.blue}>{p.status||'—'}</span></td><td className="rpt-dim">{fmtDate(p.created_at)}</td><td>{p.project_type||'—'}</td></tr>)}</tbody></table></div>)}</div>);
};

const MaterialRequests=()=>{
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/material-requests/pending').then(r=>setData(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(()=>setData([])).finally(()=>setLoading(false));},[]);
  const handlePrint=()=>openPrint('Material Request Report',
    `<div class="chips"><div class="chip orange"><div class="cv">${data.length}</div><div class="cl">Pending Requests</div></div></div>
    <div class="sec">Pending Material Requests</div>
    <table><thead><tr><th>Material</th><th>Project</th><th>Qty</th><th>Unit</th><th>Status</th><th>Requested</th><th>Notes</th></tr></thead><tbody>${data.map(m=>`<tr><td><strong>${m.material_name||m.item_name||'—'}</strong></td><td>${m.project?.project_name||m.project_name||'—'}</td><td style="text-align:center">${m.quantity??'—'}</td><td>${m.unit||'—'}</td><td><span class="b low">${m.status||'Pending'}</span></td><td>${fmtDate(m.created_at)}</td><td style="color:#64748b">${m.notes||'—'}</td></tr>`).join('')}</tbody></table>`);
  return (<div className="rpt-card"><SectionHeader title="Material Request Report" subtitle="Pending material requests across all active construction projects" onPrint={handlePrint} loading={loading}/><SummaryRow chips={[{value:data.length,label:'Pending Requests',color:'#f59e0b'}]}/>{loading?<Spinner/>:data.length===0?<Empty msg="No pending material requests."/>:(<div className="rpt-table-wrap"><table className="rpt-table"><thead><tr><th>Material</th><th>Project</th><th>Qty</th><th>Unit</th><th>Status</th><th>Requested</th><th>Notes</th></tr></thead><tbody>{data.map((m,i)=><tr key={i}><td className="rpt-fw">{m.material_name||m.item_name||'—'}</td><td>{m.project?.project_name||m.project_name||'—'}</td><td className="rpt-tc">{m.quantity??'—'}</td><td>{m.unit||'—'}</td><td><span className={BD.low}>{m.status||'Pending'}</span></td><td className="rpt-dim">{fmtDate(m.created_at)}</td><td className="rpt-dim">{m.notes||'—'}</td></tr>)}</tbody></table></div>)}</div>);
};

// ── Customer Reports ──────────────────────────────────────────────────────────
const STAGES=[{key:'To be Contacted',label:'To Be Contacted',color:'#64748b'},{key:'Contacted',label:'Contacted',color:'#2563eb'},{key:'For Presentation',label:'For Presentation',color:'#d97706'},{key:'Ready for Creating Project',label:'Ready for Project',color:'#059669'},{key:'Project Created',label:'Project Created',color:'#7c3aed'}];
const SC={'To be Contacted':'#64748b','Contacted':'#2563eb','For Presentation':'#d97706','Ready for Creating Project':'#059669','Project Created':'#7c3aed'};

const LeadConversion=({user})=>{
  const [leads,setLeads]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/leads').then(r=>setLeads(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(()=>setLeads([])).finally(()=>setLoading(false));},[]);
  const conv=leads.filter(l=>{const s=(l.status||'').toLowerCase();return s.includes('project')&&s.includes('created');});
  const wr=leads.length>0?Math.round((conv.length/leads.length)*100):0;
  const byS=STAGES.map(s=>({...s,count:leads.filter(l=>l.status===s.key).length}));
  const handlePrint=()=>openPrint('Lead Conversion Report',
    `<div class="chips"><div class="chip"><div class="cv">${leads.length}</div><div class="cl">Total Leads</div></div><div class="chip green"><div class="cv">${conv.length}</div><div class="cl">Converted</div></div><div class="chip"><div class="cv">${wr}%</div><div class="cl">Win Rate</div></div>${byS.map(s=>`<div class="chip"><div class="cv">${s.count}</div><div class="cl">${s.label}</div></div>`).join('')}</div>
    <div class="sec">All Leads — Pipeline Status</div>
    <table><thead><tr><th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact</th><th>Sales Rep</th><th>Date Added</th></tr></thead><tbody>${leads.map(l=>`<tr><td>#${l.id}</td><td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td><td>${l.location||'—'}</td><td><span style="color:${SC[l.status]||'#64748b'};font-weight:700;font-size:10px">${l.status||'—'}</span></td><td>${l.contact_no||'—'}</td><td>${l.sales_rep?.name||user?.name||'—'}</td><td>${fmtDate(l.created_at)}</td></tr>`).join('')}</tbody></table>`);
  return (<div className="rpt-card"><SectionHeader title="Lead Conversion Report" subtitle="Full sales pipeline from initial lead to converted project" onPrint={handlePrint} loading={loading}/><SummaryRow chips={[{value:leads.length,label:'Total Leads',color:'#497B97'},{value:conv.length,label:'Converted',color:'#16a34a'},{value:`${wr}%`,label:'Win Rate',color:'#B45309'},...byS.map(s=>({value:s.count,label:s.label,color:s.color}))]}/>{loading?<Spinner/>:leads.length===0?<Empty/>:(<div className="rpt-table-wrap"><table className="rpt-table"><thead><tr><th>ID</th><th>Client</th><th>Project</th><th>Location</th><th>Status</th><th>Contact</th><th>Sales Rep</th><th>Date Added</th></tr></thead><tbody>{leads.map((l,i)=>{const ic=(l.status||'').toLowerCase().includes('created');return(<tr key={i}><td className="rpt-dim">#{l.id}</td><td className="rpt-fw">{l.client_name||'—'}</td><td>{l.project_name||'—'}</td><td>{l.location||'—'}</td><td><span className={ic?BD.ok:BD.blue}>{l.status||'—'}</span></td><td>{l.contact_no||'—'}</td><td>{l.sales_rep?.name||user?.name||'—'}</td><td className="rpt-dim">{fmtDate(l.created_at)}</td></tr>);})}</tbody></table></div>)}</div>);
};

const ConvertedProjects=({user})=>{
  const [leads,setLeads]=useState([]); const [projects,setProjects]=useState({}); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([api.get('/leads'),api.get('/projects').catch(()=>({data:[]}))]).then(([lR,pR])=>{const all=Array.isArray(lR.data)?lR.data:lR.data?.data??[];const prjs=Array.isArray(pR.data)?pR.data:pR.data?.data??[];const map={};prjs.forEach(p=>{if(p.lead_id)map[p.lead_id]=p;});setLeads(all.filter(l=>{const s=(l.status||'').toLowerCase();return s.includes('project')&&s.includes('created');}));setProjects(map);}).catch(()=>setLeads([])).finally(()=>setLoading(false));},[]);
  const handlePrint=()=>openPrint('Converted Projects Report',
    `<div class="chips"><div class="chip green"><div class="cv">${leads.length}</div><div class="cl">Converted Projects</div></div></div>
    <div class="sec">Leads Converted to Projects</div>
    <table><thead><tr><th>ID</th><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th></tr></thead><tbody>${leads.map(l=>{const p=projects[l.id];return`<tr><td>#${l.id}</td><td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td><td>${l.location||'—'}</td><td><span class="b bl">${p?p.status||'Ongoing':'—'}</span></td><td>${l.sales_rep?.name||user?.name||'—'}</td><td>${fmtDate(p?.created_at||l.created_at)}</td></tr>`;}).join('')}</tbody></table>`);
  return (<div className="rpt-card"><SectionHeader title="Converted Projects Report" subtitle="Leads successfully converted to active construction projects with live project stage" onPrint={handlePrint} loading={loading}/><SummaryRow chips={[{value:leads.length,label:'Converted Projects',color:'#16a34a'}]}/>{loading?<Spinner/>:leads.length===0?<Empty msg="No converted projects yet."/>:(<div className="rpt-table-wrap"><table className="rpt-table"><thead><tr><th>ID</th><th>Client</th><th>Project Name</th><th>Location</th><th>Project Stage</th><th>Sales Rep</th><th>Date Created</th></tr></thead><tbody>{leads.map((l,i)=>{const p=projects[l.id];return(<tr key={i}><td className="rpt-dim">#{l.id}</td><td className="rpt-fw">{l.client_name||'—'}</td><td>{l.project_name||'—'}</td><td>{l.location||'—'}</td><td><span className={BD.blue}>{p?p.status||'Ongoing':'—'}</span></td><td>{l.sales_rep?.name||user?.name||'—'}</td><td className="rpt-dim">{fmtDate(p?.created_at||l.created_at)}</td></tr>);})}</tbody></table></div>)}</div>);
};

const CustomerActivity=({user})=>{
  const [leads,setLeads]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([api.get('/leads'),api.get('/leads/trashed').catch(()=>({data:[]}))]).then(([a,t])=>{const active=Array.isArray(a.data)?a.data:a.data?.data??[];const trashed=Array.isArray(t.data)?t.data:t.data?.data??[];setLeads([...active,...trashed.map(l=>({...l,is_trashed:true}))]);}).catch(()=>setLeads([])).finally(()=>setLoading(false));},[]);
  const handlePrint=()=>openPrint('Customer Activity Summary',
    `<div class="chips"><div class="chip green"><div class="cv">${leads.filter(l=>!l.is_trashed).length}</div><div class="cl">Active</div></div><div class="chip red"><div class="cv">${leads.filter(l=>l.is_trashed).length}</div><div class="cl">Trashed</div></div><div class="chip"><div class="cv">${leads.length}</div><div class="cl">Total</div></div></div>
    <div class="sec">All Client Interactions</div>
    <table><thead><tr><th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th></tr></thead><tbody>${leads.map(l=>`<tr><td><strong>${l.client_name||'—'}</strong></td><td>${l.project_name||'—'}</td><td>${l.contact_no||'—'}</td><td>${l.location||'—'}</td><td>${l.is_trashed?'<span style="color:#991b1b;font-weight:700">Trashed</span>':`<span style="font-weight:600">${l.status||'—'}</span>`}</td><td>${l.sales_rep?.name||user?.name||'—'}</td><td>${fmtDate(l.updated_at||l.created_at)}</td></tr>`).join('')}</tbody></table>`);
  return (<div className="rpt-card"><SectionHeader title="Customer Activity Summary" subtitle="All client interactions including active leads and archived records" onPrint={handlePrint} loading={loading}/><SummaryRow chips={[{value:leads.filter(l=>!l.is_trashed).length,label:'Active',color:'#16a34a'},{value:leads.filter(l=>l.is_trashed).length,label:'Trashed',color:'#C20100'},{value:leads.length,label:'Total',color:'#497B97'}]}/>{loading?<Spinner/>:leads.length===0?<Empty/>:(<div className="rpt-table-wrap"><table className="rpt-table"><thead><tr><th>Client</th><th>Project</th><th>Contact</th><th>Location</th><th>Status</th><th>Sales Rep</th><th>Last Updated</th></tr></thead><tbody>{leads.map((l,i)=><tr key={i} style={{opacity:l.is_trashed?.65:1}}><td className="rpt-fw">{l.client_name||'—'}</td><td>{l.project_name||'—'}</td><td>{l.contact_no||'—'}</td><td>{l.location||'—'}</td><td><span className={l.is_trashed?BD.nostock:BD.blue}>{l.is_trashed?'Trashed':l.status||'—'}</span></td><td>{l.sales_rep?.name||user?.name||'—'}</td><td className="rpt-dim">{fmtDate(l.updated_at||l.created_at)}</td></tr>)}</tbody></table></div>)}</div>);
};

// ── Sections Config ───────────────────────────────────────────────────────────
const SECTIONS={
  'inventory-reports':{label:'Inventory Reports',icon:'📦',color:'#497B97',reports:[
    {id:'ending-inventory',  label:'Monthly Ending Inventory',  component:EndingInventory  },
    {id:'low-stock',         label:'Low Stock / Reorder',        component:LowStock         },
    {id:'incoming-shipments',label:'Incoming Shipments',         component:IncomingShipments},
    {id:'delivery-materials',label:'Delivery Materials',         component:DeliveryMaterials},
    {id:'stock-movement',    label:'Stock Movement Summary',     component:StockMovement    },
  ]},
  'project-reports':{label:'Project Reports',icon:'📝',color:'#6366f1',reports:[
    {id:'project-status',   label:'Project Status Summary', component:ProjectStatus   },
    {id:'material-requests',label:'Material Request Report',component:MaterialRequests},
  ]},
  'customer-reports':{label:'Customer Reports',icon:'👤',color:'#C20100',reports:[
    {id:'lead-conversion',   label:'Lead Conversion Report',   component:LeadConversion   },
    {id:'converted-projects',label:'Converted Projects Report',component:ConvertedProjects},
    {id:'customer-activity', label:'Customer Activity Summary',component:CustomerActivity },
  ]},
};

// ── Main Reports Page ─────────────────────────────────────────────────────────
const Reports = ({ user, activeSubItem }) => {
  const section=SECTIONS[activeSubItem]||SECTIONS['inventory-reports'];
  const [activeReport,setActiveReport]=useState(section.reports[0].id);
  const [exportFrom,setExportFrom]=useState(monthStart());
  const [exportTo,setExportTo]=useState(today());
  useEffect(()=>{const s=SECTIONS[activeSubItem]||SECTIONS['inventory-reports'];setActiveReport(s.reports[0].id);},[activeSubItem]);
  const currentSection=SECTIONS[activeSubItem]||SECTIONS['inventory-reports'];
  const currentReport=currentSection.reports.find(r=>r.id===activeReport)||currentSection.reports[0];
  const RC=currentReport.component;
  const isInv=(activeSubItem||'inventory-reports')==='inventory-reports';
  return (
    <div className="rpt-wrapper">
      <div className="rpt-page-header">
        <div className="rpt-page-header-left">
          <div className="rpt-page-icon" style={{background:`${currentSection.color}22`}}><span style={{fontSize:'1.5rem'}}>{currentSection.icon}</span></div>
          <div><h1 className="rpt-page-title">{currentSection.label}</h1><p className="rpt-page-sub">Vision International Construction OPC · VICMIS</p></div>
        </div>
        <div className="rpt-page-right">
          {isInv&&(
            <div className="rpt-export-all-wrap">
              <div className="rpt-export-all-dates">
                <input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} className="rpt-date-input rpt-date-input-sm" title="Period from"/>
                <span className="rpt-date-sep">—</span>
                <input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} className="rpt-date-input rpt-date-input-sm" title="Period to"/>
              </div>
              <ExportAll dateFrom={exportFrom} dateTo={exportTo}/>
            </div>
          )}
          <div className="rpt-live-pill"><span className="rpt-live-dot"/>Reports</div>
          <span className="rpt-page-date">{new Date().toLocaleDateString('en-PH',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}</span>
        </div>
      </div>
      <div className="rpt-tabs-bar">
        {currentSection.reports.map(r=>(
          <button key={r.id} className={`rpt-tab ${activeReport===r.id?'active':''}`} style={{'--tab-color':currentSection.color}} onClick={()=>setActiveReport(r.id)}>
            {r.label}{activeReport===r.id&&<span className="rpt-tab-indicator" style={{background:currentSection.color}}/>}
          </button>
        ))}
      </div>
      <div className="rpt-content-area"><RC user={user}/></div>
    </div>
  );
};
export default Reports;