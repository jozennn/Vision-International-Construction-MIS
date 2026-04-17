import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  Edit, X, Loader2, Package, CheckCircle,
  Globe, Building2, ChevronDown, RefreshCw, Box, FolderOpen,
  PackageCheck, AlertTriangle, ClipboardList, ChevronRight,
  RotateCcw, Info, Search, ChevronLeft, Archive, ArchiveRestore, Trash2
} from 'lucide-react';
import '../css/IncomingShipment.css';

const STATUS_CLASS = {
  ARRIVED:   'pill-arrived',
  DEPARTURE: 'pill-departure',
  WAITING:   'pill-waiting',
};

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

// ─── Pagination Component ─────────────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, from, to, total, onPageChange }) => {
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= left && i < right)) pages.push(i);
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

  if (total === 0) return null;

  return (
    <div className="is-pagination">
      <div className="is-pagination-info">
        Showing {from}–{to} of {total} shipments
      </div>
      <div className="is-pagination-controls">
        <div className="is-page-btns">
          <button 
            className="is-page-btn is-page-nav" 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} />
          </button>
          {buildPages().map((p, i) =>
            p === '…'
              ? <span key={`gap-${i}`} className="is-page-ellipsis">…</span>
              : <button 
                  key={p} 
                  className={`is-page-btn ${currentPage === p ? 'active' : ''}`} 
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
          )}
          <button 
            className="is-page-btn is-page-nav" 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === lastPage}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Shipment Timeline Stepper ────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'ORDERED',   label: 'Ordered'    },
  { key: 'WAITING',   label: 'In Prod.'   },
  { key: 'DEPARTURE', label: 'In Transit' },
  { key: 'ARRIVED',   label: 'Arrived'    },
];

const statusToStep = (status) => {
  if (status === 'ARRIVED')   return 3;
  if (status === 'DEPARTURE') return 2;
  if (status === 'WAITING')   return 1;
  return 0;
};

const ShipmentTimeline = ({ shipment }) => {
  const activeStep = statusToStep(shipment.shipment_status);

  return (
    <div className="is-timeline">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone    = idx < activeStep;
        const isCurrent = idx === activeStep;
        return (
          <React.Fragment key={step.key}>
            <div className={`is-timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="is-timeline-dot">
                {isDone ? <CheckCircle size={12} /> : <span>{idx + 1}</span>}
              </div>
              <span className="is-timeline-label">{step.label}</span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={`is-timeline-line ${isDone ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Arrival Status Badge ─────────────────────────────────────────────────────
const ArrivalBadge = ({ shipment }) => {
  if (!shipment.tentative_arrival) return <span className="is-tba">TBA</span>;

  const tentative = new Date(shipment.tentative_arrival);
  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const isArrived   = shipment.shipment_status === 'ARRIVED';
  const compareDate = isArrived && shipment.date_delivered
    ? new Date(shipment.date_delivered)
    : today;

  const diffMs   = compareDate - tentative;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedTentative = tentative.toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  if (isArrived && diffDays <= 0) {
    return (
      <div className="is-arrival-wrap">
        <span className="is-date-badge">{formattedTentative}</span>
        <span className="is-arrival-tag arrival-ontime">On Time</span>
      </div>
    );
  }

  if (isArrived && diffDays > 0) {
    return (
      <div className="is-arrival-wrap">
        <span className="is-date-badge">{formattedTentative}</span>
        <span className="is-arrival-tag arrival-delayed">Delayed {diffDays}d</span>
      </div>
    );
  }

  if (diffDays > 0) {
    return (
      <div className="is-arrival-wrap">
        <span className="is-date-badge">{formattedTentative}</span>
        <span className="is-arrival-tag arrival-overdue">Overdue {diffDays}d</span>
      </div>
    );
  }

  return <span className="is-date-badge">{formattedTentative}</span>;
};

// ─── Received Stock Panel ─────────────────────────────────────────────────────
const ReceivedStockPanel = ({ shipments, onClose, onAddToInventory, onReportReturn }) => {
  const arrived = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory);
  const [selectedShipment, setSelectedShipment] = useState(arrived[0] || null);

  return (
    <div className="is-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="is-modal is-modal-received">
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
          <div className="is-received-list">
            {arrived.length === 0 ? (
              <div className="is-received-empty">
                <PackageCheck size={28} />
                <p>No received shipments pending.</p>
              </div>
            ) : arrived.map((s) => (
              <button
                key={s.id}
                className={`is-received-item ${selectedShipment?.id === s.id ? 'active' : ''}`}
                onClick={() => setSelectedShipment(s)}
              >
                <div className="is-received-item-inner">
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
  const projects  = Array.isArray(shipment.projects) ? shipment.projects : [];

  return (
    <div className="is-detail-wrap">
      <div className="is-detail-meta">
        <div className="is-detail-meta-item">
          <span className="is-detail-label">SHIPMENT NO.</span>
          <span className="is-detail-value">{shipment.shipment_number || '—'}</span>
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
          <span className="is-detail-value">{shipment.container_type || '—'}</span>
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
            {projects.length === 0 ? (
              <tr>
                <td colSpan={isReserve ? 6 : 5} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                  No items found for this shipment.
                </td>
              </tr>
            ) : (
              projects.map((p, i) => (
                <tr key={i}>
                  {isReserve && <td className="is-proj-name">{p.project_name || '—'}</td>}
                  <td className="is-proj-cat">{p.product_category || '—'}</td>
                  <td className="is-proj-code">{p.product_code || '—'}</td>
                  <td className="is-proj-unit">{p.unit || '—'}</td>
                  <td className="text-right is-proj-num">{parseInt(p.quantity || 0).toLocaleString()}</td>
                  {isReserve && <td className="text-right is-proj-num">{parseFloat(p.coverage_sqm || 0).toLocaleString()}</td>}
                </tr>
              ))
            )}
          </tbody>
          {projects.length > 0 && (
            <tfoot>
              <tr className="is-mini-total">
                <td colSpan={isReserve ? 4 : 3}>Total Volume</td>
                <td className="text-right">
                  {projects.reduce((s, p) => s + parseInt(p.quantity || 0), 0).toLocaleString()} pcs
                </td>
                {isReserve && (
                  <td className="text-right">
                    {projects.reduce((s, p) => s + parseFloat(p.coverage_sqm || 0), 0).toLocaleString()} SQM
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="is-detail-note">
        <Info size={13} />
        <span>
          {isReserve
            ? 'Reserved quantities will be added to Current Stock and marked under Reserve.'
            : 'All quantities will be added directly to Current Stock in the warehouse inventory.'}
        </span>
      </div>

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
  const projects = Array.isArray(shipment.projects) ? shipment.projects : [];

  const [reports, setReports] = useState(
    projects.map(p => ({
      product_category:  p.product_category || '',
      product_code:      p.product_code     || '',
      unit:              p.unit             || 'Pcs',
      max_quantity:      parseInt(p.quantity || 0),
      issue:             '',
      condition:         'Damaged',
      quantity_affected: '',
      selected:          false,
    }))
  );

  const toggle = (i) =>
    setReports(r => r.map((row, idx) =>
      idx === i ? { ...row, selected: !row.selected } : row
    ));

  const update = (i, field, val) =>
    setReports(r => r.map((row, idx) =>
      idx === i ? { ...row, [field]: val } : row
    ));

  const selected = reports.filter(r => r.selected);

  const isSubmitDisabled =
    selected.length === 0 ||
    submitting ||
    selected.some(r => !r.issue.trim()) ||
    selected.some(r => {
      const qty = parseInt(r.quantity_affected);
      return isNaN(qty) || qty < 1;
    });

  return (
    <div className="is-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="is-modal is-modal-report">
        <div className="is-modal-header is-modal-header-warn">
          <div>
            <h2 className="is-modal-title">
              <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Report / Return
            </h2>
            <p className="is-modal-sub">{shipment.shipment_number} — Select items to report</p>
          </div>
          <button className="is-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="is-modal-body" style={{ padding: '1rem 1.2rem' }}>
          <p className="is-report-hint">Check the items you want to report or return.</p>
          <div className="is-report-items">
            {reports.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No items to report.</p>
            ) : (
              reports.map((row, i) => (
                <div key={i} className={`is-report-item ${row.selected ? 'selected' : ''}`}>
                  <label className="is-report-check-label">
                    <input type="checkbox" checked={row.selected} onChange={() => toggle(i)} />
                    <span className="is-report-item-name">
                      <span className="is-proj-cat">{row.product_category}</span>
                      {row.product_code && (
                        <span className="is-proj-code" style={{ marginLeft: 6 }}>
                          {row.product_code}
                        </span>
                      )}
                    </span>
                  </label>

                  {row.selected && (
                    <div className="is-report-fields">
                      <div className="is-field">
                        <label>Quantity Affected <span className="is-required">*</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            className="is-input"
                            min={1}
                            max={row.max_quantity || undefined}
                            value={row.quantity_affected}
                            onChange={e => {
                              const val = e.target.value;
                              update(i, 'quantity_affected', val === '' ? '' : Math.min(parseInt(val) || 1, row.max_quantity || Infinity));
                            }}
                            style={{ width: 90 }}
                            placeholder="Enter qty"
                          />
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            / {row.max_quantity} {row.unit}
                          </span>
                        </div>
                        {(!row.quantity_affected || row.quantity_affected === '') && (
                          <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>
                            Please enter quantity affected
                          </p>
                        )}
                      </div>

                      <div className="is-field">
                        <label>Issue / Reason <span className="is-required">*</span></label>
                        <textarea
                          className="is-input"
                          rows={3}
                          placeholder="Describe the issue in detail (e.g. cracked surface, wrong color, missing parts)…"
                          value={row.issue}
                          onChange={e => update(i, 'issue', e.target.value)}
                          style={{ resize: 'vertical', minHeight: 72 }}
                        />
                        {!row.issue.trim() && (
                          <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>
                            Please describe the issue
                          </p>
                        )}
                      </div>

                      <div className="is-field">
                        <label>Condition</label>
                        <div className="is-select-wrap">
                          <select
                            className="is-input"
                            value={row.condition}
                            onChange={e => update(i, 'condition', e.target.value)}
                          >
                            <option value="Damaged">Damaged</option>
                            <option value="Defective">Defective</option>
                            <option value="Wrong Item">Wrong Item</option>
                            <option value="Returned">Returned</option>
                          </select>
                          <ChevronDown size={13} className="is-select-icon" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="is-modal-footer">
          <button className="is-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="is-btn-report"
            disabled={isSubmitDisabled}
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

// ─── Main Component ───────────────────────────────────────────────────────────
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
  
  // Bin state
  const [showBin, setShowBin]                       = useState(false);
  const [binShipments, setBinShipments]             = useState([]);
  const [binLoading, setBinLoading]                 = useState(false);
  const [restoreLoading, setRestoreLoading]         = useState(null);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(null);
  const [softDeleteLoading, setSoftDeleteLoading]   = useState(null);
  
  // Pagination & Filters
  const [currentPage, setCurrentPage]               = useState(1);
  const [lastPage, setLastPage]                     = useState(1);
  const [total, setTotal]                           = useState(0);
  const [from, setFrom]                             = useState(0);
  const [to, setTo]                                 = useState(0);
  const [purposeFilter, setPurposeFilter]           = useState('all');
  const [searchTerm, setSearchTerm]                 = useState('');

  const fetchShipments = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setIsRefreshing(true);
      
      let url = '/inventory/shipments';
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('per_page', 10);
      if (purposeFilter !== 'all') params.append('purpose', purposeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const res = await api.get(url);
      const data = res.data;
      
      if (data.data && Array.isArray(data.data)) {
        setShipments(data.data.map(s => ({ ...s, projects: Array.isArray(s.projects) ? s.projects : [] })));
        setTotal(data.total || 0);
        setLastPage(data.last_page || 1);
        setFrom(data.from || 0);
        setTo(data.to || 0);
      } else {
        const shipmentsArray = Array.isArray(data) ? data : [];
        setShipments(shipmentsArray.map(s => ({ ...s, projects: Array.isArray(s.projects) ? s.projects : [] })));
        setTotal(shipmentsArray.length);
        setLastPage(1);
        setFrom(1);
        setTo(shipmentsArray.length);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ── Fetch bin shipments (deleted items) ──────────────────────────────────────
  const fetchBinShipments = useCallback(async () => {
    setBinLoading(true);
    try {
      const res = await api.get('/inventory/shipments', { params: { trashed: 'true', per_page: 9999 } });
      setBinShipments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load bin shipments:', err);
    } finally {
      setBinLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchShipments(); 
  }, [currentPage, purposeFilter, searchTerm]);

  // Load bin shipments when bin is opened
  useEffect(() => {
    if (showBin) {
      fetchBinShipments();
    }
  }, [showBin, fetchBinShipments]);

  // ── Soft delete (move to bin) ────────────────────────────────────────────────
  const handleSoftDelete = async (id) => {
    if (!window.confirm('Move this shipment to the bin? You can restore it later from the Bin tab.')) return;
    setSoftDeleteLoading(id);
    try {
      await api.delete(`/inventory/shipments/${id}`);
      fetchShipments(true);
      if (showBin) fetchBinShipments();
    } catch (err) {
      alert('Failed to move shipment to bin.');
    } finally {
      setSoftDeleteLoading(null);
    }
  };

  // ── Restore from bin ─────────────────────────────────────────────────────────
  const handleRestoreShipment = async (id) => {
    setRestoreLoading(id);
    try {
      await api.post(`/inventory/shipments/${id}/restore`);
      fetchBinShipments();
      fetchShipments(true);
    } catch (err) {
      alert('Failed to restore shipment.');
    } finally {
      setRestoreLoading(null);
    }
  };

  // ── Permanent delete (remove from bin) ───────────────────────────────────────
  const handlePermanentDeleteShipment = async (id) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this shipment. This action CANNOT be undone. Continue?')) return;
    setPermanentDeleteLoading(id);
    try {
      await api.delete(`/inventory/shipments/${id}/force`);
      fetchBinShipments();
    } catch (err) {
      alert('Failed to permanently delete shipment.');
    } finally {
      setPermanentDeleteLoading(null);
    }
  };

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
    } catch {
      alert('Failed to mark as received.');
    } finally {
      setReceiveLoading(null);
    }
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
    } finally {
      setAddingToInventory(false);
    }
  };

  const handleReportSubmit = async (shipment, selectedItems) => {
    setReportSubmitting(true);
    try {
      const payload = {
        shipment_id:     shipment.id,
        shipment_number: shipment.shipment_number,
        items: selectedItems.map(({ product_category, product_code, issue, condition, quantity_affected }) => ({
          product_category,
          product_code,
          issue,
          condition,
          quantity_affected: parseInt(quantity_affected) || 0,
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
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      await api.put(`/inventory/shipments/${selectedShipment.id}`, selectedShipment);
      setIsEditModalOpen(false);
      fetchShipments(true);
    } catch {
      alert('Update failed.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const isReserveShipment = (s) => !s?.shipment_purpose || s?.shipment_purpose === 'RESERVE_FOR_PROJECT';
  const arrivedPending    = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory);

  return (
    <div className="is-wrapper">

      {/* ── Top Bar ── */}
      <div className="is-topbar">
        <div className="is-topbar-left">
          <div className="is-title-block">
            <h1 className="is-title">Incoming Shipments</h1>
            <p className="is-subtitle">Logistics Master Tracker</p>
          </div>
        </div>
        <div className="is-topbar-right">
          {!showBin && arrivedPending.length > 0 && (
            <button className="is-received-stock-btn" onClick={() => setShowReceivedPanel(true)}>
              <PackageCheck size={14} />
              New Received Stock
              <span className="is-received-badge">{arrivedPending.length}</span>
            </button>
          )}
          <button 
            className="is-received-stock-btn" 
            onClick={() => setShowBin(!showBin)}
            style={{ 
              background: showBin ? 'var(--brand-red)' : '#065F46',
              marginRight: '8px'
            }}
          >
            <Archive size={14} /> {showBin ? 'Back to Shipments' : 'Bin'}
          </button>
          <button
            className={`is-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => fetchShipments(true)}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {!showBin ? (
        <>
          {/* ── Filters ── */}
          <div className="is-filters">
            <div className="is-purpose-toggle">
              {[
                { val: 'all', label: 'All Shipments' },
                { val: 'RESERVE_FOR_PROJECT', label: 'Reserve for Project' },
                { val: 'NEW_STOCK', label: 'New Stock' }
              ].map(({ val, label }) => (
                <button 
                  key={val} 
                  className={`is-purpose-filter-btn ${purposeFilter === val ? 'active' : ''}`} 
                  onClick={() => { setPurposeFilter(val); setCurrentPage(1); }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="is-search-wrap">
              <Search size={14} className="is-search-icon" />
              <input
                type="text"
                className="is-search-input"
                placeholder="Search shipment number..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* ── Table ── */}
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
                  <th>Progress</th>
                  <th>Shipment Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="is-loading-cell">
                      <Loader2 size={18} className="is-spinner" /> Loading shipments…
                    </td>
                  </tr>
                ) : shipments.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="is-empty-cell">No shipments found.</td>
                  </tr>
                ) : shipments.map(s => (
                  <tr key={s.id} className={`is-row ${s.added_to_inventory ? 'is-row-done' : ''}`}>
                    <td className="is-shipno">
                      {s.shipment_number}
                      {s.added_to_inventory && <span className="is-inv-tag">In Inventory</span>}
                    </td>
                    <td>
                      <span className={`is-purpose-tag ${isReserveShipment(s) ? 'purpose-reserve' : 'purpose-stock'}`}>
                        {isReserveShipment(s)
                          ? <><FolderOpen size={11} /> Reserve</>
                          : <><Box size={11} /> New Stock</>}
                      </span>
                    </td>
                    <td>
                      <span className={`is-origin-tag ${s.origin_type === 'INTERNATIONAL' ? 'intl' : 'local'}`}>
                        {s.origin_type === 'INTERNATIONAL'
                          ? <><Globe size={11} /> Intl</>
                          : <><Building2 size={11} /> Local</>}
                      </span>
                    </td>
                    <td className="is-container">{s.container_type || '—'}</td>
                    <td>
                      <button
                        className="is-project-btn"
                        onClick={() => { setSelectedShipment(s); setIsProjectModalOpen(true); }}
                      >
                        <Package size={13} />
                        {s.projects?.length || 0} {isReserveShipment(s) ? 'Project' : 'Item'}
                        {s.projects?.length !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td>
                      <span className={`is-prod-tag ${PROD_STATUS_CLASS[s.status] || 'prod-ongoing'}`}>
                        {s.status || '—'}
                      </span>
                    </td>
                    <td className="is-location">{s.location || '—'}</td>
                    <td><ArrivalBadge shipment={s} /></td>
                    <td className="is-timeline-cell"><ShipmentTimeline shipment={s} /></td>
                    <td>
                      <span className={`is-pill ${STATUS_CLASS[s.shipment_status] || 'pill-waiting'}`}>
                        {s.shipment_status}
                      </span>
                    </td>
                    <td className="is-actions">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className={`is-edit-btn ${s.added_to_inventory ? 'disabled' : ''}`}
                          onClick={() => { 
                            if (!s.added_to_inventory) {
                              setSelectedShipment({ ...s }); 
                              setIsEditModalOpen(true);
                            }
                          }}
                          disabled={s.added_to_inventory}
                          title={s.added_to_inventory ? 'Cannot edit - Already in inventory' : 'Edit'}
                        >
                          <Edit size={13} /> Update
                        </button>
                        {s.shipment_status !== 'ARRIVED' && !s.added_to_inventory && (
                          <button
                            className="is-edit-btn"
                            onClick={() => handleMarkAsReceived(s)}
                            disabled={receiveLoading === s.id}
                            style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
                          >
                            {receiveLoading === s.id
                              ? <Loader2 size={13} className="is-spinner" />
                              : <CheckCircle size={13} />}
                            {receiveLoading === s.id ? 'Saving…' : 'Received'}
                          </button>
                        )}
                        {!s.added_to_inventory && (
                          <button
                            className="is-edit-btn"
                            onClick={() => handleSoftDelete(s.id)}
                            disabled={softDeleteLoading === s.id}
                            style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
                            title="Move to Bin"
                          >
                            {softDeleteLoading === s.id ? <Loader2 size={13} className="is-spinner" /> : <Trash2 size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {!loading && total > 0 && (
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                from={from}
                to={to}
                total={total}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </>
      ) : (
        /* ─── Bin / Archive View for Shipments ─── */
        <div className="is-table-wrap" style={{ marginTop: '1rem' }}>
          <div style={{ 
            padding: '0.85rem 1.25rem', 
            background: '#221F1F', 
            color: '#fff', 
            borderBottom: '2px solid var(--brand-red)',
            borderRadius: 'var(--r-lg) var(--r-lg) 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Archive size={20} />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Shipment Bin</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', opacity: 0.7 }}>
                  Deleted shipments are stored here. You can restore them or permanently delete them.
                </p>
              </div>
            </div>
          </div>
          <table className="is-table">
            <thead>
              <tr>
                <th>Shipment #</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Container</th>
                <th>Items</th>
                <th>Status</th>
                <th>Deleted At</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {binLoading ? (
                <tr><td colSpan="8" className="is-loading-cell"><Loader2 className="is-spinner" size={20} /> Loading bin…</td></tr>
              ) : binShipments.length === 0 ? (
                <tr><td colSpan="8" className="is-empty-cell">🗑️ Bin is empty. No deleted shipments found.</td></tr>
              ) : binShipments.map((shipment) => (
                <tr key={shipment.id} className="is-row">
                  <td className="is-shipno">{shipment.shipment_number}</td>
                  <td>
                    <span className={`is-purpose-tag ${shipment.shipment_purpose === 'RESERVE_FOR_PROJECT' ? 'purpose-reserve' : 'purpose-stock'}`}>
                      {shipment.shipment_purpose === 'RESERVE_FOR_PROJECT' ? 'Reserve' : 'New Stock'}
                    </span>
                  </td>
                  <td>
                    <span className={`is-origin-tag ${shipment.origin_type === 'INTERNATIONAL' ? 'intl' : 'local'}`}>
                      {shipment.origin_type === 'INTERNATIONAL' ? 'Intl' : 'Local'}
                    </span>
                  </td>
                  <td className="is-container">{shipment.container_type || '—'}</td>
                  <td>
                    <button className="is-project-btn" style={{ cursor: 'default' }}>
                      <Package size={13} />
                      {shipment.projects?.length || 0} Item{shipment.projects?.length !== 1 ? 's' : ''}
                    </button>
                  </td>
                  <td>
                    <span className={`is-pill ${STATUS_CLASS[shipment.shipment_status] || 'pill-waiting'}`}>
                      {shipment.shipment_status}
                    </span>
                  </td>
                  <td className="is-location" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shipment.deleted_at ? new Date(shipment.deleted_at).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </td>
                  <td className="is-actions">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        className="is-edit-btn"
                        onClick={() => handleRestoreShipment(shipment.id)}
                        disabled={restoreLoading === shipment.id}
                        style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
                        title="Restore"
                      >
                        {restoreLoading === shipment.id ? <Loader2 size={13} className="is-spinner" /> : <ArchiveRestore size={13} />}
                      </button>
                      <button
                        className="is-edit-btn"
                        onClick={() => handlePermanentDeleteShipment(shipment.id)}
                        disabled={permanentDeleteLoading === shipment.id}
                        style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
                        title="Permanently Delete"
                      >
                        {permanentDeleteLoading === shipment.id ? <Loader2 size={13} className="is-spinner" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!binLoading && binShipments.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              Total {binShipments.length} shipment{binShipments.length !== 1 ? 's' : ''} in bin
            </div>
          )}
        </div>
      )}

      {/* ── Received Stock Panel ── */}
      {showReceivedPanel && (
        <ReceivedStockPanel
          shipments={shipments}
          onClose={() => setShowReceivedPanel(false)}
          onAddToInventory={handleAddToInventory}
          onReportReturn={(s) => setReportShipment(s)}
        />
      )}

      {/* ── Report / Return Modal ── */}
      {reportShipment && (
        <ReportReturnModal
          shipment={reportShipment}
          onClose={() => setReportShipment(null)}
          onSubmit={handleReportSubmit}
          submitting={reportSubmitting}
        />
      )}

      {/* ── Project / Items Modal ── */}
      {isProjectModalOpen && selectedShipment && (
        <div className="is-overlay" onClick={e => e.target === e.currentTarget && setIsProjectModalOpen(false)}>
          <div className="is-modal is-modal-wide">
            <div className="is-modal-header">
              <div>
                <h2 className="is-modal-title">
                  {isReserveShipment(selectedShipment) ? 'Project Allocation' : 'Stock Items'}
                </h2>
                <p className="is-modal-sub">Shipment: {selectedShipment.shipment_number}</p>
              </div>
              <button className="is-modal-close" onClick={() => setIsProjectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="is-modal-body">
              <table className="is-mini-table">
                <thead>
                  <tr>
                    {isReserveShipment(selectedShipment) && <th>Project Name</th>}
                    <th>Product Category</th>
                    <th>Product Code</th>
                    <th>Unit</th>
                    <th className="text-right">Qty</th>
                    {isReserveShipment(selectedShipment) && <th className="text-right">Area (SQM)</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedShipment.projects?.map((p, i) => (
                    <tr key={i}>
                      {isReserveShipment(selectedShipment) && (
                        <td className="is-proj-name">{p.project_name || '—'}</td>
                      )}
                      <td className="is-proj-cat">{p.product_category || '—'}</td>
                      <td className="is-proj-code">{p.product_code || '—'}</td>
                      <td className="is-proj-unit">{p.unit || '—'}</td>
                      <td className="text-right is-proj-num">
                        {parseInt(p.quantity || 0).toLocaleString()}
                      </td>
                      {isReserveShipment(selectedShipment) && (
                        <td className="text-right is-proj-num">
                          {parseFloat(p.coverage_sqm || 0).toLocaleString()}
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!selectedShipment.projects || selectedShipment.projects.length === 0) && (
                    <tr>
                      <td
                        colSpan={isReserveShipment(selectedShipment) ? 6 : 5}
                        style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}
                      >
                        No items found for this shipment.
                      </td>
                    </tr>
                  )}
                </tbody>
                {selectedShipment.projects && selectedShipment.projects.length > 0 && (
                  <tfoot>
                    <tr className="is-mini-total">
                      <td colSpan={isReserveShipment(selectedShipment) ? 4 : 3}>Total Volume</td>
                      <td className="text-right">
                        {selectedShipment.projects
                          .reduce((s, p) => s + parseInt(p.quantity || 0), 0)
                          .toLocaleString()} pcs
                        </td>
                      {isReserveShipment(selectedShipment) && (
                        <td className="text-right">
                          {selectedShipment.projects
                            .reduce((s, p) => s + parseFloat(p.coverage_sqm || 0), 0)
                            .toLocaleString()} SQM
                        </td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Update Modal ── */}
      {isEditModalOpen && selectedShipment && !selectedShipment.added_to_inventory && (
        <div className="is-overlay" onClick={e => e.target === e.currentTarget && setIsEditModalOpen(false)}>
          <div className="is-modal">
            <div className="is-modal-header">
              <div>
                <h2 className="is-modal-title">Update Logistics</h2>
                <p className="is-modal-sub">{selectedShipment.shipment_number}</p>
              </div>
              <button className="is-modal-close" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="is-modal-form">
              <div className="is-modal-grid">
                <div className="is-field">
                  <label>Shipment Status</label>
                  <div className="is-select-wrap">
                    <select
                      className="is-input"
                      value={selectedShipment.shipment_status || ''}
                      onChange={e => setSelectedShipment({ ...selectedShipment, shipment_status: e.target.value })}
                    >
                      <option value="WAITING">WAITING</option>
                      <option value="DEPARTURE">DEPARTURE</option>
                      <option value="ARRIVED">ARRIVED</option>
                    </select>
                    <ChevronDown size={13} className="is-select-icon" />
                  </div>
                </div>
                <div className="is-field">
                  <label>Tentative Arrival Date</label>
                  <input
                    type="date"
                    className="is-input"
                    value={selectedShipment.tentative_arrival || ''}
                    onChange={e => setSelectedShipment({ ...selectedShipment, tentative_arrival: e.target.value })}
                  />
                </div>
                <div className="is-field">
                  <label>Production Progress</label>
                  <div className="is-select-wrap">
                    <select
                      className="is-input"
                      value={selectedShipment.status || ''}
                      onChange={e => setSelectedShipment({ ...selectedShipment, status: e.target.value })}
                    >
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
                  <input
                    type="text"
                    className="is-input"
                    placeholder="Port / Warehouse"
                    value={selectedShipment.location || ''}
                    onChange={e => setSelectedShipment({ ...selectedShipment, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="is-modal-footer">
                <button type="button" className="is-btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="is-btn-save" disabled={updateLoading}>
                  {updateLoading
                    ? <><Loader2 size={14} className="is-spinner" /> Saving…</>
                    : 'Save Logistics Update'}
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