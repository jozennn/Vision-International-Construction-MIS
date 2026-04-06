import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import {
  Edit, X, Loader2, Package, CheckCircle,
  Globe, Building2, ChevronDown, RefreshCw, Box, FolderOpen,
  PackageCheck, AlertTriangle, ClipboardList, ChevronRight,
  RotateCcw, Info
} from 'lucide-react';
import '../css/IncomingShipment.css';

const STATUS_CLASS = {
  ARRIVED:   'pill-arrived',
  DEPARTURE: 'pill-departure',
  WAITING:   'pill-waiting',
};

// ── Production status options (now a dropdown, not free text) ──
const PROD_STATUS_OPTIONS = [
  'ONGOING PRODUCTION',
  'ON STOCK',
  'READY FOR SHIPMENT',
];

const PROD_STATUS_CLASS = {
  'ON STOCK':           'prod-on',
  'READY FOR SHIPMENT': 'prod-ready',
  'ONGOING PRODUCTION': 'prod-ongoing',
};

// ─── Received Stock Panel ─────────────────────────────────────────────────────
const ReceivedStockPanel = ({ shipments, onClose, onAddToInventory, onReportReturn }) => {
  // Only show ARRIVED shipments not yet in inventory
  const arrived = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory);
  // Auto-select the first one
  const [selectedShipment, setSelectedShipment] = useState(arrived[0] || null);

  return (
    <div className="is-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="is-modal is-modal-received">
        {/* Header */}
        <div className="is-modal-header is-received-header">
          <div className="is-received-header-left">
            <div className="is-received-header-icon">
              <PackageCheck size={18} />
            </div>
            <div>
              <h2 className="is-modal-title">New Received Stock</h2>
              <p className="is-modal-sub">
                {arrived.length} shipment{arrived.length !== 1 ? 's' : ''} pending inventory verification
              </p>
            </div>
          </div>
          <button className="is-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="is-received-layout">
          {/* ── Left list ── */}
          <div className="is-received-list">
            {arrived.length === 0 ? (
              <div className="is-received-empty">
                <PackageCheck size={28} />
                <p>No received shipments pending.</p>
              </div>
            ) : arrived.map((s, idx) => (
              <button
                key={s.id}
                className={`is-received-item ${selectedShipment?.id === s.id ? 'active' : ''}`}
                onClick={() => setSelectedShipment(s)}
              >
                <div className="is-received-item-inner">
                  {/* Actual DB shipment number shown smaller below */}
                  <span className="is-received-code">{s.shipment_number}</span>
                  <span className={`is-received-purpose ${s.shipment_purpose === 'NEW_STOCK' ? 'purpose-stock' : 'purpose-reserve'}`}>
                    {s.shipment_purpose === 'NEW_STOCK'
                      ? <><Box size={9} /> New Stock</>
                      : <><FolderOpen size={9} /> Reserve</>}
                  </span>
                </div>
                <ChevronRight size={13} className="is-received-chevron" />
              </button>
            ))}
          </div>

          {/* ── Right detail ── */}
          <div className="is-received-detail">
            {!selectedShipment ? (
              <div className="is-received-placeholder">
                <ClipboardList size={32} />
                <p>Select a shipment to verify</p>
              </div>
            ) : (
              <ReceivedShipmentDetail
                shipment={selectedShipment}
                onAddToInventory={onAddToInventory}
                onReportReturn={onReportReturn}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Detail inside panel ──────────────────────────────────────────────────────
const ReceivedShipmentDetail = ({ shipment, onAddToInventory, onReportReturn }) => {
  const isReserve = !shipment.shipment_purpose || shipment.shipment_purpose === 'RESERVE_FOR_PROJECT';

  return (
    <div className="is-detail-wrap">
      {/* Meta */}
      <div className="is-detail-meta">
        <div className="is-detail-meta-item">
          <span className="is-detail-label">SHIPMENT NO.</span>
          <span className="is-detail-value">{shipment.shipment_number}</span>
        </div>
        <div className="is-detail-meta-item">
          <span className="is-detail-label">TYPE</span>
          <span className={`is-origin-tag ${shipment.origin_type === 'INTERNATIONAL' ? 'intl' : 'local'}`}>
            {shipment.origin_type === 'INTERNATIONAL'
              ? <><Globe size={10} /> International</>
              : <><Building2 size={10} /> Local</>}
          </span>
        </div>
        <div className="is-detail-meta-item">
          <span className="is-detail-label">CONTAINER</span>
          <span className="is-detail-value">{shipment.container_type}</span>
        </div>
        <div className="is-detail-meta-item">
          <span className="is-detail-label">PURPOSE</span>
          <span className={`is-purpose-tag ${isReserve ? 'purpose-reserve' : 'purpose-stock'}`}>
            {isReserve
              ? <><FolderOpen size={10} /> Reserve for Project</>
              : <><Box size={10} /> New Stock</>}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="is-detail-table-wrap">
        <table className="is-mini-table">
          <thead>
            <tr>
              {isReserve && <th>Project</th>}
              <th>Category</th>
              <th>Code</th>
              <th>Unit</th>
              <th className="text-right">Qty</th>
              {isReserve && <th className="text-right">SQM</th>}
            </tr>
          </thead>
          <tbody>
            {shipment.projects?.map((p, i) => (
              <tr key={i}>
                {isReserve && <td className="is-proj-name">{p.project_name || '—'}</td>}
                <td className="is-proj-cat">{p.product_category || '—'}</td>
                <td className="is-proj-code">{p.product_code || '—'}</td>
                <td className="is-proj-unit">{p.unit || '—'}</td>
                <td className="text-right is-proj-num">{parseInt(p.quantity || 0).toLocaleString()}</td>
                {isReserve && <td className="text-right is-proj-num">{parseFloat(p.coverage_sqm || 0).toLocaleString()}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="is-mini-total">
              <td colSpan={isReserve ? 4 : 3}>Total Volume</td>
              <td className="text-right">
                {shipment.projects?.reduce((s, p) => s + parseInt(p.quantity || 0), 0).toLocaleString()} pcs
              </td>
              {isReserve && (
                <td className="text-right">
                  {shipment.projects?.reduce((s, p) => s + parseFloat(p.coverage_sqm || 0), 0).toLocaleString()} SQM
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info note */}
      <div className="is-detail-note">
        <Info size={13} />
        <span>
          {isReserve
            ? 'Reserved quantities will be added to Current Stock and marked under Reserve. Click the reserve number in inventory to see project allocation.'
            : 'All quantities will be added directly to Current Stock in the warehouse inventory.'}
        </span>
      </div>

      {/* Actions */}
      <div className="is-detail-actions">
        <button className="is-action-report" onClick={() => onReportReturn(shipment)}>
          <AlertTriangle size={14} /> Report / Return
        </button>
        <button className="is-action-add" onClick={() => onAddToInventory(shipment)}>
          <PackageCheck size={14} /> Add to Inventory
        </button>
      </div>
    </div>
  );
};

// ─── Report / Return Modal ────────────────────────────────────────────────────
const ReportReturnModal = ({ shipment, onClose, onSubmit, submitting }) => {
  const [reports, setReports] = useState(
    (shipment.projects || []).map(p => ({
      product_category: p.product_category,
      product_code:     p.product_code,
      issue:            '',
      condition:        'Damaged',
      selected:         false,
    }))
  );

  const toggle = (i) => setReports(r => r.map((row, idx) => idx === i ? { ...row, selected: !row.selected } : row));
  const update = (i, field, val) => setReports(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const selected = reports.filter(r => r.selected);

  return (
    <div className="is-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="is-modal is-modal-report">
        <div className="is-modal-header is-modal-header-warn">
          <div>
            <h2 className="is-modal-title">
              <AlertTriangle size={15} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Report / Return
            </h2>
            <p className="is-modal-sub">{shipment.shipment_number} — Select items to report</p>
          </div>
          <button className="is-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="is-modal-body" style={{ padding: '1rem 1.2rem' }}>
          <p className="is-report-hint">Check the items you want to report or return. Fill in the issue and condition for each.</p>
          <div className="is-report-items">
            {reports.map((row, i) => (
              <div key={i} className={`is-report-item ${row.selected ? 'selected' : ''}`}>
                <label className="is-report-check-label">
                  <input type="checkbox" checked={row.selected} onChange={() => toggle(i)} />
                  <span className="is-report-item-name">
                    <span className="is-proj-cat">{row.product_category}</span>
                    <span className="is-proj-code" style={{ marginLeft: 6 }}>{row.product_code}</span>
                  </span>
                </label>
                {row.selected && (
                  <div className="is-report-fields">
                    <div className="is-field">
                      <label>Issue / Reason</label>
                      <input className="is-input" placeholder="Describe the issue…" value={row.issue} onChange={e => update(i, 'issue', e.target.value)} />
                    </div>
                    <div className="is-field">
                      <label>Condition</label>
                      <div className="is-select-wrap">
                        <select className="is-input" value={row.condition} onChange={e => update(i, 'condition', e.target.value)}>
                          <option value="Damaged">Damaged</option>
                          <option value="Returned">Returned</option>
                          <option value="Defective">Defective</option>
                          <option value="Wrong Item">Wrong Item</option>
                        </select>
                        <ChevronDown size={13} className="is-select-icon" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="is-modal-footer">
          <button className="is-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="is-btn-report"
            disabled={selected.length === 0 || submitting || selected.some(r => !r.issue.trim())}
            onClick={() => onSubmit(shipment, selected)}
          >
            {submitting
              ? <><Loader2 size={14} className="is-spinner" /> Submitting…</>
              : <><RotateCcw size={14} /> Submit Report ({selected.length})</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const IncomingShipment = ({ onBack, onStockArrival, onReportFiled }) => {
  const [shipments, setShipments]                   = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [isRefreshing, setIsRefreshing]             = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]       = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment]     = useState(null);
  const [updateLoading, setUpdateLoading]           = useState(false);
  const [receiveLoading, setReceiveLoading]         = useState(null);
  const [showReceivedPanel, setShowReceivedPanel]   = useState(false);
  const [addingToInventory, setAddingToInventory]   = useState(false);
  const [reportShipment, setReportShipment]         = useState(null);
  const [reportSubmitting, setReportSubmitting]     = useState(false);

  const fetchShipments = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setIsRefreshing(true);
      const res = await api.get('/inventory/shipments');
      setShipments(res.data);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { fetchShipments(); }, []);

  const handleMarkAsReceived = async (shipment) => {
    if (!window.confirm(`Mark Shipment ${shipment.shipment_number} as RECEIVED?`)) return;
    setReceiveLoading(shipment.id);
    try {
      await api.put(`/inventory/shipments/${shipment.id}`, {
        ...shipment,
        shipment_status: 'ARRIVED',
        status:          'ON STOCK',
        location:        'WAREHOUSE',
      });
      if (onStockArrival) onStockArrival(shipment);
      fetchShipments(true);
    } catch { alert('Failed to mark as received.'); }
    finally { setReceiveLoading(null); }
  };

  const handleAddToInventory = async (shipment) => {
    setAddingToInventory(true);
    try {
      await api.post(`/inventory/shipments/${shipment.id}/add-to-inventory`);
      setShowReceivedPanel(false);
      fetchShipments(true);
      alert(`Shipment ${shipment.shipment_number} has been added to inventory successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to inventory.');
    } finally { setAddingToInventory(false); }
  };

  const handleReportSubmit = async (shipment, selectedItems) => {
    setReportSubmitting(true);
    try {
      const payload = {
        shipment_id:     shipment.id,
        shipment_number: shipment.shipment_number,
        items: selectedItems.map(({ product_category, product_code, issue, condition }) => ({
          product_category, product_code, issue, condition,
        })),
      };
      await api.post('/inventory/shipments/report', payload);
      setReportShipment(null);
      setShowReceivedPanel(false);
      fetchShipments(true);
      if (onReportFiled) onReportFiled(payload);
      alert('Report submitted. The procurement team has been notified.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally { setReportSubmitting(false); }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      await api.put(`/inventory/shipments/${selectedShipment.id}`, selectedShipment);
      setIsEditModalOpen(false);
      fetchShipments(true);
    } catch { alert('Update failed.'); }
    finally { setUpdateLoading(false); }
  };

  const isReserveShipment = (s) => !s?.shipment_purpose || s?.shipment_purpose === 'RESERVE_FOR_PROJECT';
  const arrivedPending = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory);

  return (
    <div className="is-wrapper">

      {/* Top Bar */}
      <div className="is-topbar">
        <div className="is-topbar-left">
          <div className="is-title-block">
            <h1 className="is-title">Incoming Shipments</h1>
            <p className="is-subtitle">Logistics Master Tracker</p>
          </div>
        </div>
        <div className="is-topbar-right">
          {arrivedPending.length > 0 && (
            <button className="is-received-stock-btn" onClick={() => setShowReceivedPanel(true)}>
              <PackageCheck size={14} />
              New Received Stock
              <span className="is-received-badge">{arrivedPending.length}</span>
            </button>
          )}
          <button className={`is-refresh-btn ${isRefreshing ? 'spinning' : ''}`} onClick={() => fetchShipments(true)} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="is-table-wrap">
        <table className="is-table">
          <thead>
            <tr>
              <th>Shipment #</th>
              <th>Purpose</th>
              <th>Type</th>
              <th>Container</th>
              <th>Items / Projects</th>
              <th>Production Status</th>
              <th>Location</th>
              <th>Tentative Arrival</th>
              <th>Shipment Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="is-loading-cell"><Loader2 size={18} className="is-spinner" /> Loading shipments…</td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan="10" className="is-empty-cell">No shipments found.</td></tr>
            ) : shipments.map(s => (
              <tr key={s.id} className={`is-row ${s.added_to_inventory ? 'is-row-done' : ''}`}>
                <td className="is-shipno">
                  {s.shipment_number}
                  {s.added_to_inventory && <span className="is-inv-tag">In Inventory</span>}
                </td>
                <td>
                  <span className={`is-purpose-tag ${isReserveShipment(s) ? 'purpose-reserve' : 'purpose-stock'}`}>
                    {isReserveShipment(s) ? <><FolderOpen size={11} /> Reserve</> : <><Box size={11} /> New Stock</>}
                  </span>
                </td>
                <td>
                  <span className={`is-origin-tag ${s.origin_type === 'INTERNATIONAL' ? 'intl' : 'local'}`}>
                    {s.origin_type === 'INTERNATIONAL' ? <><Globe size={11} /> Intl</> : <><Building2 size={11} /> Local</>}
                  </span>
                </td>
                <td className="is-container">{s.container_type}</td>
                <td>
                  <button className="is-project-btn" onClick={() => { setSelectedShipment(s); setIsProjectModalOpen(true); }}>
                    <Package size={13} /> {s.projects?.length || 0} {isReserveShipment(s) ? 'Project' : 'Item'}{s.projects?.length !== 1 ? 's' : ''}
                  </button>
                </td>
                <td>
                  <span className={`is-prod-tag ${PROD_STATUS_CLASS[s.status] || 'prod-ongoing'}`}>{s.status}</span>
                </td>
                <td className="is-location">{s.location || '—'}</td>
                <td>
                  {s.tentative_arrival ? <span className="is-date-badge">{s.tentative_arrival}</span> : <span className="is-tba">TBA</span>}
                </td>
                <td>
                  <span className={`is-pill ${STATUS_CLASS[s.shipment_status] || 'pill-waiting'}`}>{s.shipment_status}</span>
                </td>
                <td className="is-actions">
                  <button className="is-edit-btn" onClick={() => { setSelectedShipment({ ...s }); setIsEditModalOpen(true); }}>
                    <Edit size={13} /> Update
                  </button>
                  {s.shipment_status !== 'ARRIVED' && (
                    <button className="is-receive-btn" onClick={() => handleMarkAsReceived(s)} disabled={receiveLoading === s.id}>
                      {receiveLoading === s.id ? <Loader2 size={13} className="is-spinner" /> : <CheckCircle size={13} />}
                      {receiveLoading === s.id ? 'Saving…' : 'Received'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panels & Modals */}
      {showReceivedPanel && (
        <ReceivedStockPanel
          shipments={shipments}
          onClose={() => setShowReceivedPanel(false)}
          onAddToInventory={handleAddToInventory}
          onReportReturn={(s) => setReportShipment(s)}
        />
      )}

      {reportShipment && (
        <ReportReturnModal
          shipment={reportShipment}
          onClose={() => setReportShipment(null)}
          onSubmit={handleReportSubmit}
          submitting={reportSubmitting}
        />
      )}

      {isProjectModalOpen && selectedShipment && (
        <div className="is-overlay" onClick={e => e.target === e.currentTarget && setIsProjectModalOpen(false)}>
          <div className="is-modal is-modal-wide">
            <div className="is-modal-header">
              <div>
                <h2 className="is-modal-title">{isReserveShipment(selectedShipment) ? 'Project Allocation' : 'Stock Items'}</h2>
                <p className="is-modal-sub">Shipment: {selectedShipment.shipment_number}</p>
              </div>
              <button className="is-modal-close" onClick={() => setIsProjectModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="is-modal-body">
              <table className="is-mini-table">
                <thead>
                  <tr>
                    {isReserveShipment(selectedShipment) && <th>Project Name</th>}
                    <th>Product Category</th><th>Product Code</th><th>Unit</th>
                    <th className="text-right">Qty</th>
                    {isReserveShipment(selectedShipment) && <th className="text-right">Area (SQM)</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedShipment.projects?.map((p, i) => (
                    <tr key={i}>
                      {isReserveShipment(selectedShipment) && <td className="is-proj-name">{p.project_name || '—'}</td>}
                      <td className="is-proj-cat">{p.product_category || '—'}</td>
                      <td className="is-proj-code">{p.product_code || '—'}</td>
                      <td className="is-proj-unit">{p.unit || '—'}</td>
                      <td className="text-right is-proj-num">{parseInt(p.quantity || 0).toLocaleString()}</td>
                      {isReserveShipment(selectedShipment) && <td className="text-right is-proj-num">{parseFloat(p.coverage_sqm || 0).toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="is-mini-total">
                    <td colSpan={isReserveShipment(selectedShipment) ? 4 : 3}>Total Volume</td>
                    <td className="text-right">{selectedShipment.projects?.reduce((s, p) => s + parseInt(p.quantity || 0), 0).toLocaleString()} pcs</td>
                    {isReserveShipment(selectedShipment) && <td className="text-right">{selectedShipment.projects?.reduce((s, p) => s + parseFloat(p.coverage_sqm || 0), 0).toLocaleString()} SQM</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Logistics Update Modal — Production Progress is now a SELECT ── */}
      {isEditModalOpen && selectedShipment && (
        <div className="is-overlay" onClick={e => e.target === e.currentTarget && setIsEditModalOpen(false)}>
          <div className="is-modal">
            <div className="is-modal-header">
              <div>
                <h2 className="is-modal-title">Update Logistics</h2>
                <p className="is-modal-sub">{selectedShipment.shipment_number}</p>
              </div>
              <button className="is-modal-close" onClick={() => setIsEditModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="is-modal-form">
              <div className="is-modal-grid">
                <div className="is-field">
                  <label>Shipment Status</label>
                  <div className="is-select-wrap">
                    <select className="is-input" value={selectedShipment.shipment_status}
                      onChange={e => setSelectedShipment({ ...selectedShipment, shipment_status: e.target.value })}>
                      <option value="WAITING">WAITING</option>
                      <option value="DEPARTURE">DEPARTURE</option>
                      <option value="ARRIVED">ARRIVED</option>
                    </select>
                    <ChevronDown size={13} className="is-select-icon" />
                  </div>
                </div>
                <div className="is-field">
                  <label>Tentative Arrival Date</label>
                  <input type="date" className="is-input" value={selectedShipment.tentative_arrival || ''}
                    onChange={e => setSelectedShipment({ ...selectedShipment, tentative_arrival: e.target.value })} />
                </div>

                {/* FIXED: Was a free-text input, now a dropdown */}
                <div className="is-field">
                  <label>Production Progress</label>
                  <div className="is-select-wrap">
                    <select className="is-input" value={selectedShipment.status || ''}
                      onChange={e => setSelectedShipment({ ...selectedShipment, status: e.target.value })}>
                      <option value="">— Select Status —</option>
                      {PROD_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="is-select-icon" />
                  </div>
                </div>

                <div className="is-field">
                  <label>Current Location</label>
                  <input type="text" className="is-input" placeholder="Port / Warehouse"
                    value={selectedShipment.location || ''}
                    onChange={e => setSelectedShipment({ ...selectedShipment, location: e.target.value })} />
                </div>
              </div>
              <div className="is-modal-footer">
                <button type="button" className="is-btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="is-btn-save" disabled={updateLoading}>
                  {updateLoading ? <><Loader2 size={14} className="is-spinner" /> Saving…</> : 'Save Logistics Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingShipment;
