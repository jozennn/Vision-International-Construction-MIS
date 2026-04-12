import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  Plus, X, Loader2, RefreshCw, Truck,
  ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Search,
} from 'lucide-react';
import '../css/Delivery.css';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Delivery Counter Bar ─────────────────────────────────────────────────────
// Shows live In Transit / Delivered counts across ALL deliveries (no filter).
// Fetches once on mount and refreshes whenever the parent calls fetchDeliveries.
const DeliveryCounterBar = ({ inTransit, delivered }) => (
  <div className="dl-counter-bar">
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

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ currentPage, lastPage, from, to, total, perPage, onPageChange, onPerPageChange }) => {
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      }
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
        {total > 0 ? `Showing ${from}–${to} of ${total} deliveries` : 'No deliveries'}
      </div>
      <div className="dl-pagination-controls">
        <div className="dl-perpage-wrap">
          <span className="dl-perpage-label">Rows:</span>
          <div className="dl-select-wrap">
            <select
              value={perPage}
              onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
              className="dl-perpage-select"
            >
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

// ─── Main Component ───────────────────────────────────────────────────────────

const DeliveryMat = ({ onBack }) => {
  const [deliveries, setDeliveries]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markLoading, setMarkLoading]   = useState(null);
  const [saveLoading, setSaveLoading]   = useState(false);

  // ── Global delivery counts (ignores active filters) ─────────────────────────
  const [globalCounts, setGlobalCounts] = useState({ inTransit: 0, delivered: 0 });

  // Meta for product dropdowns
  const [categories, setCategories]     = useState([]);
  const [products, setProducts]         = useState({});

  // Projects list for the project name dropdown
  const [projects, setProjects]         = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Derived from selected category
  const [codesForCat, setCodesForCat]   = useState([]);
  const [lowStockWarn, setLowStockWarn] = useState(false);

  // Filters
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter]     = useState('all');

  // Pagination
  const [currentPage, setCurrentPage]   = useState(1);
  const [lastPage, setLastPage]         = useState(1);
  const [total, setTotal]               = useState(0);
  const [from, setFrom]                 = useState(0);
  const [to, setTo]                     = useState(0);
  const [perPage, setPerPage]           = useState(10);

  // Modal
  const [showModal, setShowModal]       = useState(false);
  const [formData, setFormData]         = useState({ ...EMPTY_FORM });

  // ─── Load meta ───────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/inventory/logistics/meta')
      .then(res => {
        setCategories(res.data.categories || []);
        setProducts(res.data.products || {});
      })
      .catch(console.error);
  }, []);

  // ─── Load projects ────────────────────────────────────────────────────────────
  useEffect(() => {
    setProjectsLoading(true);
    api.get('/projects')
      .then(res => {
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.projects ?? []);
        setProjects(list);
      })
      .catch(console.error)
      .finally(() => setProjectsLoading(false));
  }, []);

  // ─── Fetch global counts (all records, no filters) ───────────────────────────
  // Runs independently so the counter bar never changes when the user filters.
  const fetchGlobalCounts = useCallback(async () => {
    try {
      const res = await api.get('/inventory/logistics', { params: { per_page: 9999, page: 1 } });
      const all = res.data.data || [];
      setGlobalCounts({
        inTransit: all.filter(d => d.status === 'In Transit').length,
        delivered: all.filter(d => d.status === 'Delivered').length,
      });
    } catch (err) {
      console.error('Failed to load delivery counts:', err);
    }
  }, []);

  useEffect(() => { fetchGlobalCounts(); }, [fetchGlobalCounts]);

  // ─── Fetch paginated deliveries (respects active filters) ────────────────────
  const fetchDeliveries = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
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
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, perPage, search, statusFilter, typeFilter]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, typeFilter, perPage]);

  // ─── Category change → populate codes dropdown ───────────────────────────────
  const handleCategoryChange = (cat) => {
    const codes = products[cat] || [];
    setCodesForCat(codes);
    setLowStockWarn(false);
    setFormData(f => ({
      ...f,
      product_category: cat,
      product_code:     '',
      is_consumable:    false,
    }));
  };

  // ─── Code change → check low stock ───────────────────────────────────────────
  const handleCodeChange = (code) => {
    const item = codesForCat.find(c => c.product_code === code);
    setLowStockWarn(item?.availability === 'LOW STOCK' || item?.availability === 'NO STOCK');
    setFormData(f => ({
      ...f,
      product_code:  code,
      is_consumable: item?.is_consumable ?? false,
    }));
  };

  // ─── Project selection ────────────────────────────────────────────────────────
  const handleProjectChange = (projectName) => {
    const proj = projects.find(p => p.project_name === projectName);
    setFormData(f => ({
      ...f,
      project_name: projectName,
      destination: f.destination || proj?.location || '',
    }));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.post('/inventory/logistics', {
        ...formData,
        quantity: parseInt(formData.quantity) || 1,
      });
      setShowModal(false);
      setFormData({ ...EMPTY_FORM });
      setCodesForCat([]);
      setLowStockWarn(false);
      fetchDeliveries(true);
      fetchGlobalCounts();
    } catch (err) {
      alert(`Dispatch failed: ${err.response?.data?.message || 'Unknown error'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // ─── Mark delivered ───────────────────────────────────────────────────────────
  const handleDelivered = async (id) => {
    if (!window.confirm('Mark this delivery as Delivered?')) return;
    setMarkLoading(id);
    try {
      await api.patch(`/inventory/logistics/${id}/delivered`);
      fetchDeliveries(true);
      fetchGlobalCounts();
    } catch {
      alert('Failed to update status.');
    } finally {
      setMarkLoading(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ ...EMPTY_FORM });
    setCodesForCat([]);
    setLowStockWarn(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="dl-wrapper">

      {/* ── Top Bar ── */}
      <div className="dl-topbar">
        <div className="dl-topbar-left">
          <div className="dl-title-block">
            <h1 className="dl-title">Delivery Logistics</h1>
            <p className="dl-subtitle">Dispatch &amp; Trucking Management</p>
          </div>
        </div>
        <div className="dl-topbar-right">
          <button
            className={`dl-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => { fetchDeliveries(true); fetchGlobalCounts(); }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button className="dl-add-btn" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Schedule Delivery
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="dl-filters">
        <div className="dl-type-toggle">
          {[
            { val: 'all',        label: 'All' },
            { val: 'In Transit', label: 'In Transit' },
            { val: 'Delivered',  label: 'Delivered' },
          ].map(({ val, label }) => (
            <button
              key={val}
              className={`dl-toggle-btn ${statusFilter === val ? 'active' : ''}`}
              onClick={() => setStatusFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dl-type-toggle">
          {[
            { val: 'all',        label: 'All Types' },
            { val: 'main',       label: 'Main Product' },
            { val: 'consumable', label: 'Consumable' },
          ].map(({ val, label }) => (
            <button
              key={val}
              className={`dl-toggle-btn ${typeFilter === val ? 'active' : ''}`}
              onClick={() => setTypeFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Delivery counter (always shows global totals) ── */}
        <DeliveryCounterBar
          inTransit={globalCounts.inTransit}
          delivered={globalCounts.delivered}
        />

        <div className="dl-search-wrap">
          <Search size={14} className="dl-search-icon" />
          <input
            type="text"
            className="dl-search-input"
            placeholder="Search project, driver, destination…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="dl-table-wrap">
        <table className="dl-table">
          <thead>
            <tr>
              <th>Trucking Service</th>
              <th>Product Category</th>
              <th>Code / Product Name</th>
              <th>Type</th>
              <th>Project Name</th>
              <th>Driver</th>
              <th>Destination</th>
              <th className="text-right">Qty</th>
              <th>Date of Delivery</th>
              <th>Date Delivered</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" className="dl-loading-cell">
                  <Loader2 size={18} className="dl-spinner" /> Loading deliveries…
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan="12" className="dl-empty-cell">No deliveries found.</td>
              </tr>
            ) : deliveries.map(d => (
              <tr key={d.id} className="dl-row">
                <td className="dl-trucking">{d.trucking_service}</td>
                <td>
                  <span className="dl-category-badge">{d.product_category}</span>
                </td>
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
                  {/* ── Map pin link ── */}
                  {d.destination && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.destination)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dl-map-pin"
                      title="Open in Google Maps"
                    >
                      ↗
                    </a>
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
                  <span className={`dl-status-pill ${STATUS_CLASS[d.status] || 'pill-transit'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="dl-actions">
                  {d.status !== 'Delivered' ? (
                    <button
                      className="dl-deliver-btn"
                      onClick={() => handleDelivered(d.id)}
                      disabled={markLoading === d.id}
                      title="Mark as delivered"
                    >
                      {markLoading === d.id
                        ? <Loader2 size={13} className="dl-spinner" />
                        : <CheckCircle size={13} />}
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

      {/* ── Schedule Modal ── */}
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
                <input
                  type="text" required
                  className="dl-input"
                  placeholder="e.g. VISION, JRS Trucking"
                  value={formData.trucking_service}
                  onChange={e => setFormData(f => ({ ...f, trucking_service: e.target.value }))}
                />
              </div>

              <div className="dl-form-row">
                <div className="dl-form-group">
                  <label>Product Category <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select
                      required className="dl-input"
                      value={formData.product_category}
                      onChange={e => handleCategoryChange(e.target.value)}
                    >
                      <option value="">— Select Category —</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="dl-select-icon" />
                  </div>
                </div>

                <div className="dl-form-group">
                  <label>Code / Product Name <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select
                      required className="dl-input"
                      value={formData.product_code}
                      onChange={e => handleCodeChange(e.target.value)}
                      disabled={!formData.product_category}
                    >
                      <option value="">— Select Code —</option>
                      {codesForCat.map(item => (
                        <option
                          key={item.product_code}
                          value={item.product_code}
                          disabled={item.availability === 'NO STOCK'}
                        >
                          {item.product_code}
                          {item.availability === 'NO STOCK'  ? ' (No Stock)'  : ''}
                          {item.availability === 'LOW STOCK' ? ' (Low Stock)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="dl-select-icon" />
                  </div>
                  {lowStockWarn && (
                    <div className="dl-warn">
                      <AlertTriangle size={13} />
                      This item is low or out of stock. Proceed with caution.
                    </div>
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
                  <input
                    type="number" required min="1" className="dl-input"
                    value={formData.quantity}
                    onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>

                <div className="dl-form-group">
                  <label>Project Name <span className="dl-req">*</span></label>
                  <div className="dl-select-wrap">
                    <select
                      required
                      className="dl-input"
                      value={formData.project_name}
                      onChange={e => handleProjectChange(e.target.value)}
                      disabled={projectsLoading}
                    >
                      <option value="">
                        {projectsLoading ? 'Loading projects…' : '— Select Project —'}
                      </option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.project_name}>
                          {proj.project_name}
                          {proj.client_name ? ` — ${proj.client_name}` : ''}
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
                  <input
                    type="text" required className="dl-input"
                    placeholder="Driver's full name"
                    value={formData.driver_name}
                    onChange={e => setFormData(f => ({ ...f, driver_name: e.target.value }))}
                  />
                </div>
                <div className="dl-form-group">
                  <label>Destination <span className="dl-req">*</span></label>
                  <input
                    type="text" required className="dl-input"
                    placeholder="Delivery address"
                    value={formData.destination}
                    onChange={e => setFormData(f => ({ ...f, destination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="dl-form-group">
                <label>Date of Delivery <span className="dl-req">*</span></label>
                <input
                  type="date" required className="dl-input"
                  value={formData.date_of_delivery}
                  onChange={e => setFormData(f => ({ ...f, date_of_delivery: e.target.value }))}
                />
              </div>

              <div className="dl-modal-footer">
                <button type="button" className="dl-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="dl-btn-save" disabled={saveLoading}>
                  {saveLoading
                    ? <><Loader2 size={14} className="dl-spinner" /> Scheduling…</>
                    : <><Truck size={14} /> Confirm Dispatch</>}
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