import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  Plus, X, Loader2, RefreshCw, Truck,
  ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Search,
  PackageCheck, RotateCcw, ClipboardList,
  AlertCircle, CheckSquare,
} from 'lucide-react';
import '../css/Delivery.css';

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  trucking_service: '',
  product_category: '',
  product_code:     '',
  is_consumable:    false,
  project_name:     '',
  driver_name:      '',
  destination:      '',
  date_of_delivery: '',
  quantity:         1,
};

const STATUS_CLASS = {
  Delivered:    'pill-delivered',
  'In Transit': 'pill-transit',
};

const REQUEST_STATUS_CLASS = {
  pending:    'req-pill-pending',
  approved:   'req-pill-approved',
  reordering: 'req-pill-reorder',
  dispatched: 'req-pill-dispatched',
  delivered:  'req-pill-delivered',
  rejected:   'req-pill-rejected',
};

// ─── Delivery Counter Bar ──────────────────────────────────────────────────────
const DeliveryCounterBar = ({ inTransit, delivered, pendingRequests }) => (
  <div className="dl-counter-bar">
    {pendingRequests > 0 && (
      <>
        <div className="dl-counter-item dl-counter-pending">
          <span className="dl-counter-dot" />
          <span className="dl-counter-value">{pendingRequests}</span>
          <span className="dl-counter-label">Pending Requests</span>
        </div>
        <div className="dl-counter-divider" />
      </>
    )}
    <div className="dl-counter-item dl-counter-transit">
      <span className="dl-counter-dot" />
      <span className="dl-counter-value">{inTransit}</span>
      <span className="dl-counter-label">In Transit</span>
    </div>
    <div className="dl-counter-divider" />
    <div className="dl-counter-item dl-counter-delivered">
      <span className="dl-counter-dot" />
      <span className="dl-counter-value">{delivered}</span>
      <span className="dl-counter-label">Delivered</span>
    </div>
  </div>
);

// ─── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, from, to, total, perPage, onPageChange, onPerPageChange }) => {
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) pages.push(i);
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
    <div className="dl-pagination">
      <div className="dl-pagination-info">
        {total > 0 ? `Showing ${from}–${to} of ${total}` : 'No records'}
      </div>
      <div className="dl-pagination-controls">
        <div className="dl-perpage-wrap">
          <span className="dl-perpage-label">Rows:</span>
          <div className="dl-select-wrap">
            <select value={perPage} onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1); }} className="dl-perpage-select">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={12} className="dl-select-icon" />
          </div>
        </div>
        <div className="dl-page-btns">
          <button className="dl-page-btn dl-page-nav" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft size={14} />
          </button>
          {buildPages().map((p, i) =>
            p === '…'
              ? <span key={`g${i}`} className="dl-page-ellipsis">…</span>
              : <button key={p} className={`dl-page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
          )}
          <button className="dl-page-btn dl-page-nav" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reorder Modal (triggered from a pending request that has no stock) ────────
const ReorderFromRequestModal = ({ request, onConfirm, onClose, loading }) => {
  const [notes, setNotes]           = useState('');
  const [qtyNeeded, setQtyNeeded]   = useState(request?.items?.[0]?.requested_qty || '');

  return (
    <div className="dl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dl-modal">
        <div className="dl-modal-header" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
          <div>
            <h2 className="dl-modal-title" style={{ color: '#fff' }}>⚠️ No Stock — Request Reorder</h2>
            <p className="dl-modal-sub" style={{ color: 'rgba(255,255,255,.8)' }}>
              Notify Procurement to restock before dispatching.
            </p>
          </div>
          <button className="dl-modal-close" onClick={onClose} style={{ color: '#fff' }}><X size={18} /></button>
        </div>

        <div className="dl-form" style={{ padding: '1.5rem' }}>
          <div className="dl-req-detail-card">
            <div className="dl-req-detail-row">
              <span className="dl-req-detail-label">Project</span>
              <span className="dl-req-detail-val">{request.project_name}</span>
            </div>
            <div className="dl-req-detail-row">
              <span className="dl-req-detail-label">Requested by</span>
              <span className="dl-req-detail-val">{request.requested_by_name}</span>
            </div>
            <div className="dl-req-detail-row">
              <span className="dl-req-detail-label">Items</span>
              <span className="dl-req-detail-val">
                {request.items?.map(i => `${i.product_code} ×${i.requested_qty}`).join(', ')}
              </span>
            </div>
          </div>

          <div className="dl-form-group mt-4">
            <label>Quantity to Reorder <span className="dl-req">*</span></label>
            <input type="number" min="1" required className="dl-input"
              value={qtyNeeded} onChange={e => setQtyNeeded(e.target.value)} placeholder="0" />
          </div>

          <div className="dl-form-group">
            <label>Notes for Procurement <span style={{ color: '#9ca3af' }}>(optional)</span></label>
            <textarea className="dl-input" rows={3} style={{ resize: 'vertical' }}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Needed within 3 days, preferred supplier…" />
          </div>

          <div className="dl-modal-footer">
            <button type="button" className="dl-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button
              type="button"
              className="dl-btn-save"
              style={{ background: '#ef4444' }}
              disabled={loading || !qtyNeeded}
              onClick={() => onConfirm({ notes, quantity_needed: qtyNeeded })}
            >
              {loading
                ? <><Loader2 size={14} className="dl-spinner" /> Sending…</>
                : <><RotateCcw size={14} /> Send Reorder Request</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Convert Request → Delivery Modal ─────────────────────────────────────────
const DispatchFromRequestModal = ({ request, onConfirm, onClose, loading }) => {
  const [form, setForm] = useState({
    trucking_service: '',
    driver_name:      '',
    destination:      request?.destination || '',
    date_of_delivery: '',
  });

  const valid = form.trucking_service && form.driver_name && form.destination && form.date_of_delivery;

  return (
    <div className="dl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dl-modal">
        <div className="dl-modal-header">
          <div>
            <h2 className="dl-modal-title">🚚 Dispatch Materials</h2>
            <p className="dl-modal-sub">
              Fulfill request from <strong>{request.project_name}</strong>
            </p>
          </div>
          <button className="dl-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dl-form" style={{ padding: '1.5rem' }}>
          {/* Request summary */}
          <div className="dl-req-detail-card">
            <div className="dl-req-detail-row">
              <span className="dl-req-detail-label">Requested by</span>
              <span className="dl-req-detail-val">{request.requested_by_name}</span>
            </div>
            <div className="dl-req-detail-row">
              <span className="dl-req-detail-label">Items</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {request.items?.map((item, i) => (
                  <span key={i} className="dl-item-chip">
                    {item.product_code} — {item.description} ×{item.requested_qty} {item.unit}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="dl-form-group mt-4">
            <label>Trucking Service <span className="dl-req">*</span></label>
            <input type="text" required className="dl-input"
              placeholder="e.g. VISION, JRS Trucking"
              value={form.trucking_service}
              onChange={e => setForm(f => ({ ...f, trucking_service: e.target.value }))} />
          </div>

          <div className="dl-form-row">
            <div className="dl-form-group">
              <label>Driver Name <span className="dl-req">*</span></label>
              <input type="text" required className="dl-input"
                placeholder="Driver's full name"
                value={form.driver_name}
                onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
            </div>
            <div className="dl-form-group">
              <label>Destination <span className="dl-req">*</span></label>
              <input type="text" required className="dl-input"
                placeholder="Delivery address"
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
            </div>
          </div>

          <div className="dl-form-group">
            <label>Date of Delivery <span className="dl-req">*</span></label>
            <input type="date" required className="dl-input"
              value={form.date_of_delivery}
              onChange={e => setForm(f => ({ ...f, date_of_delivery: e.target.value }))} />
          </div>

          <div className="dl-modal-footer">
            <button type="button" className="dl-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="button" className="dl-btn-save" disabled={loading || !valid}
              onClick={() => onConfirm(form)}>
              {loading
                ? <><Loader2 size={14} className="dl-spinner" /> Dispatching…</>
                : <><Truck size={14} /> Confirm Dispatch</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Pending Requests Tab ──────────────────────────────────────────────────────
// Replace the PendingRequestsTab component with this updated version

const PendingRequestsTab = ({
  requests,
  loading,
  onDispatch,
  onReorder,
  onReject,
}) => {
  if (loading) {
    return (
      <div className="dl-loading-cell" style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={20} className="dl-spinner" /> Loading requests…
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="dl-empty-requests">
        <ClipboardList size={40} style={{ color: '#d1d5db', marginBottom: '0.75rem' }} />
        <p>No pending material requests.</p>
      </div>
    );
  }

  return (
    <div className="dl-requests-list">
      {requests.map(req => {
        // Check stock status for EACH item
        const itemsWithStock = req.items?.map(item => {
          const currentStock = item.current_stock ?? 0;
          const requestedQty = parseFloat(item.requested_qty) || 0;
          const isOutOfStock = currentStock <= 0;
          const isInsufficientStock = currentStock > 0 && currentStock < requestedQty;
          const stockStatus = isOutOfStock ? 'NO STOCK' 
            : isInsufficientStock ? 'LOW STOCK' 
            : 'ON STOCK';
          
          return {
            ...item,
            current_stock: currentStock,
            stock_status: stockStatus,
            isOutOfStock,
            isInsufficientStock,
            canFulfill: currentStock >= requestedQty
          };
        });

        // Check if ANY item cannot be fulfilled
        const hasNoStock = itemsWithStock?.some(i => i.stock_status === 'NO STOCK');
        const hasInsufficientStock = itemsWithStock?.some(i => i.stock_status === 'LOW STOCK' && i.current_stock < i.requested_qty);
        const canDispatchAll = itemsWithStock?.every(i => i.canFulfill);
        
        // Determine if dispatch should be allowed
        const canDispatch = req.status === 'pending' && canDispatchAll;
        const needsReorder = req.status === 'pending' && (hasNoStock || hasInsufficientStock);

        return (
          <div key={req.id} className={`dl-req-card ${needsReorder ? 'dl-req-card-danger' : hasInsufficientStock ? 'dl-req-card-warn' : ''}`}>
            {/* Header */}
            <div className="dl-req-card-header">
              <div className="dl-req-card-meta">
                <span className="dl-req-project">{req.project_name}</span>
                <span className="dl-req-location">{req.location}</span>
              </div>
              <div className="dl-req-card-right">
                <span className={`dl-req-status-pill ${REQUEST_STATUS_CLASS[req.status] || 'req-pill-pending'}`}>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
                <span className="dl-req-date">
                  {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Requested by */}
            <p className="dl-req-by">
              <strong>Requested by:</strong> {req.requested_by_name} {req.engineer_name && `· ${req.engineer_name}`}
            </p>

            {/* Stock warning banner */}
            {hasNoStock && (
              <div className="dl-req-stock-warn dl-req-stock-danger">
                <AlertCircle size={14} />
                <strong>No Stock</strong> — one or more items are completely out of stock. Reorder from Procurement before dispatching.
              </div>
            )}
            {!hasNoStock && hasInsufficientStock && (
              <div className="dl-req-stock-warn dl-req-stock-low">
                <AlertTriangle size={14} />
                <strong>Insufficient Stock</strong> — requested quantity exceeds available stock for some items.
              </div>
            )}
            {canDispatchAll && !hasNoStock && !hasInsufficientStock && (
              <div className="dl-req-stock-warn dl-req-stock-ok">
                <CheckCircle size={14} />
                <strong>Stock Available</strong> — all items can be fulfilled.
              </div>
            )}

{/* Items table */}
<table className="dl-req-items-table">
    <thead>
        <tr>
            <th>Category</th>
            <th>Code</th>
            <th>Description</th>
            <th>Unit</th>
            <th className="text-right">Requested Qty</th>
            <th className="text-right">Current Stock</th>
            <th>Stock Status</th>
        </tr>
    </thead>
    <tbody>
        {itemsWithStock?.map((item, i) => (
            <tr key={i} className={!item.canFulfill ? 'dl-row-warning' : ''}>
                <td>
                    <span className="dl-category-badge">
                        {item.product_category || '—'}
                    </span>
                </td>
                <td className="dl-code">{item.product_code || '—'}</td>
                <td>{item.description}</td>
                <td>{item.unit}</td>
                <td className="text-right">{item.requested_qty}</td>
                <td className="text-right">
                    {item.current_stock != null ? item.current_stock : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td>
                    {item.stock_status === 'ON STOCK'  && <span className="wh-avail avail-on">ON STOCK</span>}
                    {item.stock_status === 'LOW STOCK' && !item.isOutOfStock && <span className="wh-avail avail-low">LOW STOCK (Insufficient)</span>}
                    {item.stock_status === 'LOW STOCK' && item.isOutOfStock === false && item.current_stock > 0 && 
                        <span className="wh-avail avail-low">LOW STOCK</span>
                    }
                    {item.stock_status === 'NO STOCK'  && <span className="wh-avail avail-no">NO STOCK</span>}
                    {!item.stock_status && <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
            </tr>
        ))}
    </tbody>
</table>

            {/* Actions */}
            {req.status === 'pending' && (
              <div className="dl-req-actions">
                {needsReorder && (
                  <button className="dl-reorder-action-btn" onClick={() => onReorder(req)}>
                    <RotateCcw size={13} /> Request Reorder
                  </button>
                )}
                {canDispatch && (
                  <button className="dl-dispatch-action-btn" onClick={() => onDispatch(req)}>
                    <Truck size={13} /> Dispatch Now
                  </button>
                )}
                {!canDispatch && !needsReorder && hasInsufficientStock && (
                  <button className="dl-dispatch-action-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <Truck size={13} /> Insufficient Stock
                  </button>
                )}
                <button className="dl-reject-action-btn" onClick={() => onReject(req.id)}>
                  <X size={13} /> Reject
                </button>
              </div>
            )}

            {req.status === 'reordering' && (
              <div className="dl-req-status-note">
                <RotateCcw size={13} /> Reorder sent to Procurement — waiting for stock replenishment.
              </div>
            )}
            {req.status === 'dispatched' && (
              <div className="dl-req-status-note dl-req-status-note-ok">
                <CheckSquare size={13} /> Materials dispatched — delivery in progress.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DeliveryMat = ({ onBack, newArrivalData, clearArrivalData }) => {
  const [activeMainTab, setActiveMainTab] = useState('deliveries'); // 'requests' | 'deliveries'

  const [deliveries, setDeliveries]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [markLoading, setMarkLoading]     = useState(null);
  const [saveLoading, setSaveLoading]     = useState(false);

  // Pending material requests
  const [requests, setRequests]           = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [dispatchTarget, setDispatchTarget]   = useState(null);
  const [reorderTarget, setReorderTarget]     = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [reorderLoading, setReorderLoading]   = useState(false);

  // Global counts
  const [globalCounts, setGlobalCounts]   = useState({ inTransit: 0, delivered: 0, pending: 0 });

  // Meta for manual delivery form
  const [categories, setCategories]       = useState([]);
  const [products, setProducts]           = useState({});
  const [projects, setProjects]           = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [codesForCat, setCodesForCat]     = useState([]);
  const [lowStockWarn, setLowStockWarn]   = useState(false);

  // Filters (deliveries tab)
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [typeFilter, setTypeFilter]       = useState('all');

  // Pagination
  const [currentPage, setCurrentPage]     = useState(1);
  const [lastPage, setLastPage]           = useState(1);
  const [total, setTotal]                 = useState(0);
  const [from, setFrom]                   = useState(0);
  const [to, setTo]                       = useState(0);
  const [perPage, setPerPage]             = useState(10);

  // Manual delivery modal
  const [showModal, setShowModal]         = useState(false);
  const [formData, setFormData]           = useState({ ...EMPTY_FORM });

  // ── Meta ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/inventory/logistics/meta')
      .then(res => { setCategories(res.data.categories || []); setProducts(res.data.products || {}); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setProjectsLoading(true);
    api.get('/projects')
      .then(res => { const d = res.data; setProjects(Array.isArray(d) ? d : (d.projects ?? [])); })
      .catch(console.error)
      .finally(() => setProjectsLoading(false));
  }, []);

  // ── Global counts ─────────────────────────────────────────────────────────
  const fetchGlobalCounts = useCallback(async () => {
    try {
      const [delRes, reqRes] = await Promise.all([
        api.get('/inventory/logistics', { params: { per_page: 9999, page: 1 } }),
        api.get('/inventory/material-requests', { params: { per_page: 9999, status: 'pending' } }),
      ]);
      const all = delRes.data.data || [];
      const reqs = reqRes.data.data || [];
      setGlobalCounts({
        inTransit: all.filter(d => d.status === 'In Transit').length,
        delivered: all.filter(d => d.status === 'Delivered').length,
        pending:   reqs.length,
      });
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  }, []);

  useEffect(() => { fetchGlobalCounts(); }, [fetchGlobalCounts]);

  // ── Fetch pending requests ────────────────────────────────────────────────
  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setRequestsLoading(true);
    try {
      // Backend enriches each item with stock_status + current_stock from warehouse
      const res = await api.get('/inventory/material-requests');
      setRequests(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Fetch deliveries ──────────────────────────────────────────────────────
  const fetchDeliveries = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setIsRefreshing(true);
      const params = { page: currentPage, per_page: perPage };
      if (search)                 params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all')   params.type   = typeFilter;
      const res = await api.get('/inventory/logistics', { params });
      const d   = res.data;
      setDeliveries(d.data || []);
      setTotal(d.total || 0);
      setLastPage(d.last_page || 1);
      setFrom(d.from || 0);
      setTo(d.to || 0);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false); setIsRefreshing(false);
    }
  }, [currentPage, perPage, search, statusFilter, typeFilter]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, typeFilter, perPage]);

  // ── New arrival pre-fill ──────────────────────────────────────────────────
  useEffect(() => {
    if (newArrivalData?.projects?.length > 0) {
      const proj = newArrivalData.projects[0];
      setFormData({
        ...EMPTY_FORM,
        product_category: proj.product_category || '',
        product_code:     newArrivalData.shipment_number || '',
        current_stock:    proj.quantity || '',
        is_consumable:    proj.product_category === 'CONSUMABLES',
      });
      setShowModal(true);
    }
  }, [newArrivalData]);

  // ── Manual form helpers ───────────────────────────────────────────────────
  const handleCategoryChange = (cat) => {
    setCodesForCat(products[cat] || []);
    setLowStockWarn(false);
    setFormData(f => ({ ...f, product_category: cat, product_code: '', is_consumable: false }));
  };

  const handleCodeChange = (code) => {
    const item = codesForCat.find(c => c.product_code === code);
    setLowStockWarn(item?.availability === 'LOW STOCK' || item?.availability === 'NO STOCK');
    setFormData(f => ({ ...f, product_code: code, is_consumable: item?.is_consumable ?? false }));
  };

  const handleProjectChange = (projectName) => {
    const proj = projects.find(p => p.project_name === projectName);
    setFormData(f => ({ ...f, project_name: projectName, destination: f.destination || proj?.location || '' }));
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.post('/inventory/logistics', { ...formData, quantity: parseInt(formData.quantity) || 1 });
      closeModal();
      fetchDeliveries(true);
      fetchGlobalCounts();
    } catch (err) {
      alert(`Dispatch failed: ${err.response?.data?.message || 'Unknown error'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Mark delivered → triggers backend to push new arrival to MaterialsMonitoring ──
  // Replace the handleDelivered function with this updated version

const handleDelivered = async (id) => {
  const delivery = deliveries.find(d => d.id === id);
  
  // Show appropriate confirmation message
  const confirmMessage = delivery?.material_request_id
    ? 'Mark this delivery as Delivered?\n\nThis will automatically add the items as new arrivals in the project\'s Materials Monitoring.\n\nNote: Stock has already been reserved when the request was dispatched.'
    : 'Mark this delivery as Delivered?\n\nThis will automatically add the items as new arrivals in the project\'s Materials Monitoring and update warehouse stock.';
  
  if (!window.confirm(confirmMessage)) return;
  
  setMarkLoading(id);
  try {
    const response = await api.patch(`/inventory/logistics/${id}/delivered`);
    
    // Show success message
    alert(response.data?.message || 'Delivery marked as delivered successfully.');
    
    fetchDeliveries(true);
    fetchRequests(true);
    fetchGlobalCounts();
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Failed to update delivery status.';
    console.error('Delivery error:', err.response?.data);
    alert(errorMsg);
  } finally {
    setMarkLoading(null);
  }
};

  // ── Dispatch from request ──────────────────────────────────────────────────
  const handleDispatchConfirm = async (form) => {
    setDispatchLoading(true);
    try {
      // POST: converts the pending request into a delivery record (status → dispatched)
      await api.post(`/inventory/material-requests/${dispatchTarget.id}/dispatch`, form);
      setDispatchTarget(null);
      fetchRequests(true);
      fetchDeliveries(true);
      fetchGlobalCounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch.');
    } finally {
      setDispatchLoading(false);
    }
  };

  // ── Reorder from request ───────────────────────────────────────────────────
  const handleReorderConfirm = async ({ notes, quantity_needed }) => {
    setReorderLoading(true);
    try {
      // PATCH: marks request as 'reordering' + sends reorder to Procurement
      await api.post(`/inventory/material-requests/${reorderTarget.id}/reorder`, {
        notes,
        quantity_needed: parseInt(quantity_needed, 10) || null,
      });
      setReorderTarget(null);
      fetchRequests(true);
      fetchGlobalCounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reorder request.');
    } finally {
      setReorderLoading(false);
    }
  };

  // ── Reject request ─────────────────────────────────────────────────────────
  const handleReject = async (id) => {
    if (!window.confirm('Reject this material request?')) return;
    try {
      await api.patch(`/inventory/material-requests/${id}/reject`);
      fetchRequests(true);
      fetchGlobalCounts();
    } catch {
      alert('Failed to reject request.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ ...EMPTY_FORM });
    setCodesForCat([]);
    setLowStockWarn(false);
    if (clearArrivalData) clearArrivalData();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dl-wrapper">

      {/* ── Modals ── */}
      {dispatchTarget && (
        <DispatchFromRequestModal
          request={dispatchTarget}
          onConfirm={handleDispatchConfirm}
          onClose={() => setDispatchTarget(null)}
          loading={dispatchLoading}
        />
      )}
      {reorderTarget && (
        <ReorderFromRequestModal
          request={reorderTarget}
          onConfirm={handleReorderConfirm}
          onClose={() => setReorderTarget(null)}
          loading={reorderLoading}
        />
      )}

      {/* ── Top Bar ── */}
      <div className="dl-topbar">
        <div className="dl-topbar-left">
          <div className="dl-title-block">
            <h1 className="dl-title">Delivery Logistics</h1>
            <p className="dl-subtitle">Dispatch, Requests & Trucking Management</p>
          </div>
        </div>
        <div className="dl-topbar-right">
          <button
            className={`dl-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => { fetchDeliveries(true); fetchRequests(true); fetchGlobalCounts(); }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button className="dl-add-btn" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Schedule Delivery
          </button>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="dl-main-tabs">
        <button
          className={`dl-main-tab ${activeMainTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('requests')}
        >
          <ClipboardList size={15} />
          Pending Requests
          {globalCounts.pending > 0 && (
            <span className="dl-tab-badge">{globalCounts.pending}</span>
          )}
        </button>
        <button
          className={`dl-main-tab ${activeMainTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('deliveries')}
        >
          <Truck size={15} />
          Deliveries
        </button>
      </div>

      {/* ── Pending Requests Tab ── */}
      {activeMainTab === 'requests' && (
        <div className="dl-tab-body">
          <PendingRequestsTab
            requests={requests}
            loading={requestsLoading}
            onDispatch={setDispatchTarget}
            onReorder={setReorderTarget}
            onReject={handleReject}
          />
        </div>
      )}

      {/* ── Deliveries Tab ── */}
      {activeMainTab === 'deliveries' && (
        <>
          {/* Filter Bar */}
          <div className="dl-filters">
            <div className="dl-type-toggle">
              {[{ val: 'all', label: 'All' }, { val: 'In Transit', label: 'In Transit' }, { val: 'Delivered', label: 'Delivered' }].map(({ val, label }) => (
                <button key={val} className={`dl-toggle-btn ${statusFilter === val ? 'active' : ''}`} onClick={() => setStatusFilter(val)}>{label}</button>
              ))}
            </div>
            <div className="dl-type-toggle">
              {[{ val: 'all', label: 'All Types' }, { val: 'main', label: 'Main Product' }, { val: 'consumable', label: 'Consumable' }].map(({ val, label }) => (
                <button key={val} className={`dl-toggle-btn ${typeFilter === val ? 'active' : ''}`} onClick={() => setTypeFilter(val)}>{label}</button>
              ))}
            </div>

            <DeliveryCounterBar
              inTransit={globalCounts.inTransit}
              delivered={globalCounts.delivered}
              pendingRequests={globalCounts.pending}
            />

            <div className="dl-search-wrap">
              <Search size={14} className="dl-search-icon" />
              <input type="text" className="dl-search-input"
                placeholder="Search project, driver, destination…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="dl-table-wrap">
            <table className="dl-table">
              <thead>
                <tr>
                  <th>Trucking</th>
                  <th>Category</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Project</th>
                  <th>Driver</th>
                  <th>Destination</th>
                  <th className="text-right">Qty</th>
                  <th>Delivery Date</th>
                  <th>Delivered On</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="13" className="dl-loading-cell"><Loader2 size={18} className="dl-spinner" /> Loading…</td></tr>
                ) : deliveries.length === 0 ? (
                  <tr><td colSpan="13" className="dl-empty-cell">No deliveries found.</td></tr>
                ) : deliveries.map(d => (
                  <tr key={d.id} className="dl-row">
                    <td className="dl-trucking">{d.trucking_service}</td>
                    <td><span className="dl-category-badge">{d.product_category}</span></td>
                    <td className="dl-code">{d.product_code}</td>
                    <td>
                      <span className={d.is_consumable ? 'dl-pill consumable' : 'dl-pill main'}>
                        {d.is_consumable ? 'Consumable' : 'Main'}
                      </span>
                    </td>
                    <td className="dl-project">{d.project_name}</td>
                    <td className="dl-driver">{d.driver_name}</td>
                    <td className="dl-dest">
                      {d.destination}
                      {d.destination && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.destination)}`}
                          target="_blank" rel="noopener noreferrer" className="dl-map-pin" title="Open in Maps">↗</a>
                      )}
                    </td>
                    <td className="text-right dl-qty">{d.quantity ?? '—'}</td>
                    <td className="dl-date">{d.date_of_delivery}</td>
                    <td className="dl-date">
                      {d.date_delivered
                        ? new Date(d.date_delivered).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : <span className="dl-tba">—</span>}
                    </td>
                    <td>
                      {/* Shows whether this delivery came from a material request */}
                      {d.material_request_id
                        ? <span className="dl-source-pill dl-source-req">From Request</span>
                        : <span className="dl-source-pill dl-source-manual">Manual</span>}
                    </td>
                    <td>
                      <span className={`dl-status-pill ${STATUS_CLASS[d.status] || 'pill-transit'}`}>{d.status}</span>
                    </td>
                    <td className="dl-actions">
                      {d.status !== 'Delivered' ? (
                        <button className="dl-deliver-btn" onClick={() => handleDelivered(d.id)} disabled={markLoading === d.id} title="Mark as delivered">
                          {markLoading === d.id ? <Loader2 size={13} className="dl-spinner" /> : <CheckCircle size={13} />}
                          {markLoading === d.id ? 'Saving…' : 'Delivered'}
                        </button>
                      ) : (
                        <span className="dl-done-label">✓ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && total > 0 && (
              <Pagination
                currentPage={currentPage} lastPage={lastPage}
                from={from} to={to} total={total} perPage={perPage}
                onPageChange={setCurrentPage} onPerPageChange={setPerPage}
              />
            )}
          </div>
        </>
      )}

      {/* ── Manual Schedule Modal ── */}
      {showModal && (
        <div className="dl-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="dl-modal">
            <div className="dl-modal-header">
              <div>
                <h2 className="dl-modal-title">Schedule Delivery</h2>
                <p className="dl-modal-sub">Dispatch a product to a project site</p>
              </div>
              <button className="dl-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSchedule} className="dl-form">
              <div className="dl-form-group">
                <label>Trucking Service <span className="dl-req">*</span></label>
                <input type="text" required className="dl-input" placeholder="e.g. VISION, JRS Trucking"
                  value={formData.trucking_service}
                  onChange={e => setFormData(f => ({ ...f, trucking_service: e.target.value }))} />
              </div>

              <div className="dl-form-row">
                <div className="dl-form-group">
                  <label>Product Category <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select required className="dl-input" value={formData.product_category} onChange={e => handleCategoryChange(e.target.value)}>
                      <option value="">— Select Category —</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown size={13} className="dl-select-icon" />
                  </div>
                </div>
                <div className="dl-form-group">
                  <label>Code / Product Name <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select required className="dl-input" value={formData.product_code}
                      onChange={e => handleCodeChange(e.target.value)} disabled={!formData.product_category}>
                      <option value="">— Select Code —</option>
                      {codesForCat.map(item => (
                        <option key={item.product_code} value={item.product_code} disabled={item.availability === 'NO STOCK'}>
                          {item.product_code}{item.availability === 'NO STOCK' ? ' (No Stock)' : ''}{item.availability === 'LOW STOCK' ? ' (Low Stock)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="dl-select-icon" />
                  </div>
                  {lowStockWarn && (
                    <div className="dl-warn"><AlertTriangle size={13} /> This item is low or out of stock. Proceed with caution.</div>
                  )}
                </div>
              </div>

              {formData.product_code && (
                <div className="dl-type-indicator">
                  <span className="dl-type-label">Type:</span>
                  <span className={formData.is_consumable ? 'dl-pill consumable' : 'dl-pill main'}>
                    {formData.is_consumable ? 'Consumable' : 'Main Product'}
                  </span>
                </div>
              )}

              <div className="dl-form-row">
                <div className="dl-form-group">
                  <label>Quantity <span className="dl-req">*</span></label>
                  <input type="number" required min="1" className="dl-input" value={formData.quantity}
                    onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="dl-form-group">
                  <label>Project Name <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select required className="dl-input" value={formData.project_name}
                      onChange={e => handleProjectChange(e.target.value)} disabled={projectsLoading}>
                      <option value="">{projectsLoading ? 'Loading…' : '— Select Project —'}</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.project_name}>
                          {proj.project_name}{proj.client_name ? ` — ${proj.client_name}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="dl-select-icon" />
                  </div>
                </div>
              </div>

              <div className="dl-form-row">
                <div className="dl-form-group">
                  <label>Driver Name <span className="dl-req">*</span></label>
                  <input type="text" required className="dl-input" placeholder="Driver's full name"
                    value={formData.driver_name} onChange={e => setFormData(f => ({ ...f, driver_name: e.target.value }))} />
                </div>
                <div className="dl-form-group">
                  <label>Destination <span className="dl-req">*</span></label>
                  <input type="text" required className="dl-input" placeholder="Delivery address"
                    value={formData.destination} onChange={e => setFormData(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>

              <div className="dl-form-group">
                <label>Date of Delivery <span className="dl-req">*</span></label>
                <input type="date" required className="dl-input" value={formData.date_of_delivery}
                  onChange={e => setFormData(f => ({ ...f, date_of_delivery: e.target.value }))} />
              </div>

              <div className="dl-modal-footer">
                <button type="button" className="dl-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dl-btn-save" disabled={saveLoading}>
                  {saveLoading ? <><Loader2 size={14} className="dl-spinner" /> Scheduling…</> : <><Truck size={14} /> Confirm Dispatch</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryMat;