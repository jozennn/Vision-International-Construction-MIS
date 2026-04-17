import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, PackageCheck, Pencil, Trash2, AlertTriangle, RotateCcw, Archive, ArchiveRestore } from 'lucide-react';
import warehouseInventoryService from '@/api/warehouseInventoryService';
import '../css/Construction-1.css';

const AVAILABILITY_COLORS = {
  'ON STOCK':  'avail-on',
  'LOW STOCK': 'avail-low',
  'NO STOCK':  'avail-no',
};

const CONDITION_COLORS = {
  Good:     'cond-good',
  Damaged:  'cond-damaged',
  Returned: 'cond-returned',
};

const EMPTY_FORM = {
  product_category: '',
  product_code:     '',
  unit:             '',
  price_per_piece:  '',
  current_stock:    '',
  reserve:          '',
  condition:        'Good',
  is_consumable:    false,
  notes:            '',
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtPrice = (val) => {
  const n = parseFloat(val);
  if (!val || isNaN(n)) return '—';
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtValue = (val) => {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return '—';
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Auto-derive availability from current_stock ──────────────────────────────
const deriveAvailability = (stock) => {
  const n = parseInt(stock, 10);
  if (isNaN(n) || n <= 0) return 'NO STOCK';
  if (n <= 10)             return 'LOW STOCK';
  return 'ON STOCK';
};

// ─── Availability preview badge ───────────────────────────────────────────────
const AvailPreview = ({ stock }) => {
  const label = deriveAvailability(stock);
  const cls   = AVAILABILITY_COLORS[label] || 'avail-no';
  return (
    <span className={`wh-avail ${cls}`} style={{ fontSize: '.7rem' }}>
      {label}
    </span>
  );
};

// ─── Stock Health Summary Bar ─────────────────────────────────────────────────
const StockSummaryBar = ({ counts, loading }) => {
  const { onStock = 0, lowStock = 0, noStock = 0 } = counts;
  return (
    <div className="wh-summary-bar">
      <div className="wh-summary-card wh-summary-on">
        <span className="wh-summary-dot" />
        <div>
          <span className="wh-summary-count">
            {loading ? <Loader2 size={16} className="wh-spinner" /> : onStock}
          </span>
          <span className="wh-summary-label">On Stock</span>
        </div>
      </div>
      <div className="wh-summary-divider" />
      <div className="wh-summary-card wh-summary-low">
        <span className="wh-summary-dot" />
        <div>
          <span className="wh-summary-count">
            {loading ? <Loader2 size={16} className="wh-spinner" /> : lowStock}
          </span>
          <span className="wh-summary-label">Low Stock</span>
        </div>
      </div>
      <div className="wh-summary-divider" />
      <div className="wh-summary-card wh-summary-no">
        <span className="wh-summary-dot" />
        <div>
          <span className="wh-summary-count">
            {loading ? <Loader2 size={16} className="wh-spinner" /> : noStock}
          </span>
          <span className="wh-summary-label">No Stock</span>
        </div>
      </div>
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, from, to, total, perPage, onPageChange, onPerPageChange }) => {
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const left  = currentPage - delta;
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

  return (
    <div className="wh-pagination">
      <div className="wh-pagination-info">
        {total > 0 ? `Showing ${from}–${to} of ${total} products` : 'No products'}
      </div>
      <div className="wh-pagination-controls">
        <div className="wh-perpage-wrap">
          <span className="wh-perpage-label">Rows:</span>
          <div className="wh-select-wrap">
            <select
              value={perPage}
              onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
              className="wh-perpage-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={12} className="wh-select-icon" />
          </div>
        </div>
        <div className="wh-page-btns">
          <button className="wh-page-btn wh-page-nav" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft size={14} />
          </button>
          {buildPages().map((p, i) =>
            p === '…'
              ? <span key={`gap-${i}`} className="wh-page-ellipsis">…</span>
              : <button key={p} className={`wh-page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
          )}
          <button className="wh-page-btn wh-page-nav" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reorder Confirmation Modal ───────────────────────────────────────────────
const ReorderModal = ({ item, onConfirm, onClose, loading }) => {
  const [notes, setNotes]                   = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const isNoStock    = item?.availability === 'NO STOCK';
  const urgencyCls   = isNoStock ? 'reorder-urgent' : 'reorder-low';
  const urgencyLabel = isNoStock ? 'No Stock — Urgent' : 'Low Stock';

  return (
    <div className="wh-overlay reorder-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wh-modal reorder-modal">

        {/* Header */}
        <div className={`reorder-modal-header ${urgencyCls}`}>
          <div className="reorder-modal-header-left">
            <div className="reorder-icon-wrap">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="reorder-modal-title">Request Reorder</h2>
              <p className="reorder-modal-sub">This will notify Procurement to action this item.</p>
            </div>
          </div>
          <button className="wh-modal-close reorder-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Product identity block */}
        <div className="reorder-product-card">
          <div className="reorder-product-identity">
            <div className="reorder-identity-row">
              <span className="reorder-identity-label">Category</span>
              <span className="reorder-category-badge">{item.product_category}</span>
            </div>
            <div className="reorder-identity-row">
              <span className="reorder-identity-label">Item Code</span>
              <span className="reorder-code">{item.product_code}</span>
            </div>
            {item.price_per_piece > 0 && (
              <div className="reorder-identity-row">
                <span className="reorder-identity-label">Unit Price</span>
                <span className="reorder-code">{fmtPrice(item.price_per_piece)}</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="reorder-product-stats">
            <div className="reorder-stat">
              <span className="reorder-stat-label">Current Stock</span>
              <span className={`reorder-stat-value ${isNoStock ? 'value-danger' : 'value-warn'}`}>
                {item.current_stock} <em>{item.unit}</em>
              </span>
            </div>
            <div className="reorder-stat-divider" />
            <div className="reorder-stat">
              <span className="reorder-stat-label">Status</span>
              <span className={`wh-avail ${AVAILABILITY_COLORS[item.availability] || 'avail-no'}`} style={{ fontSize: '.72rem' }}>
                {item.availability}
              </span>
            </div>
            <div className="reorder-stat-divider" />
            <div className="reorder-stat">
              <span className="reorder-stat-label">Priority</span>
              <span className={`reorder-priority ${urgencyCls}`}>{urgencyLabel}</span>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="reorder-fields-wrap">
          <div className="reorder-field-group">
            <label className="reorder-notes-label">
              Quantity Needed <span className="reorder-required">*</span>
            </label>
            <div className="reorder-qty-wrap">
              <input
                type="number"
                min="1"
                required
                className="reorder-qty-input"
                placeholder="0"
                value={quantityNeeded}
                onChange={e => setQuantityNeeded(e.target.value)}
              />
              <span className="reorder-qty-unit">{item.unit}</span>
            </div>
            {quantityNeeded > 0 && item.price_per_piece > 0 && (
              <p className="wh-hint" style={{ marginTop: 6, color: '#059669', fontWeight: 600 }}>
                Estimated cost: {fmtPrice(quantityNeeded * item.price_per_piece)}
              </p>
            )}
          </div>

          <div className="reorder-field-group">
            <label className="reorder-notes-label">
              Notes for Procurement <span className="reorder-optional">(optional)</span>
            </label>
            <textarea
              className="reorder-notes-input"
              rows={3}
              placeholder="e.g. Needed before end of month, preferred supplier: ABC Corp…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="reorder-modal-footer">
          <button type="button" className="wh-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`reorder-confirm-btn ${urgencyCls}`}
            onClick={() => onConfirm({ notes, quantity_needed: quantityNeeded })}
            disabled={loading || !quantityNeeded}
          >
            {loading
              ? <><Loader2 size={15} className="wh-spinner" /> Sending…</>
              : <><RotateCcw size={15} /> Send Reorder Request</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reorder Success Toast ────────────────────────────────────────────────────
const ReorderToast = ({ message, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="reorder-toast">
      <PackageCheck size={16} />
      <span>{message}</span>
      <button className="reorder-toast-close" onClick={onDismiss}><X size={13} /></button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ConstructionMat = ({ onBack, newArrivalData, clearArrivalData }) => {
  const [items, setItems]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [saveLoading, setSaveLoading]         = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(null);

  // Bin state
  const [showBin, setShowBin]                 = useState(false);
  const [binItems, setBinItems]               = useState([]);
  const [binLoading, setBinLoading]           = useState(false);
  const [restoreLoading, setRestoreLoading]   = useState(null);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(null);

  const [categories, setCategories]           = useState([]);
  const [presetCodes, setPresetCodes]         = useState({});
  const [unitsByCategory, setUnitsByCategory] = useState({});

  const [typeFilter, setTypeFilter]           = useState('all');
  const [categoryFilter, setCategoryFilter]   = useState('all');
  const [search, setSearch]                   = useState('');

  const [currentPage, setCurrentPage]         = useState(1);
  const [lastPage, setLastPage]               = useState(1);
  const [total, setTotal]                     = useState(0);
  const [from, setFrom]                       = useState(0);
  const [to, setTo]                           = useState(0);
  const [perPage, setPerPage]                 = useState(10);

  const [stockCounts, setStockCounts]         = useState({ onStock: 0, lowStock: 0, noStock: 0 });
  const [countsLoading, setCountsLoading]     = useState(true);

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [isNewArrival, setIsNewArrival]       = useState(false);
  const [currentId, setCurrentId]             = useState(null);
  const [formData, setFormData]               = useState({ ...EMPTY_FORM });
  const [customCode, setCustomCode]           = useState(false);

  const [reorderTarget, setReorderTarget]     = useState(null);
  const [reorderLoading, setReorderLoading]   = useState(false);
  const [reorderToast, setReorderToast]       = useState(null);

  // ── Load meta ──────────────────────────────────────────────────────────────
  useEffect(() => {
    warehouseInventoryService.getMeta().then(res => {
      setCategories(res.data.categories || []);
      setPresetCodes(res.data.preset_codes || {});
      setUnitsByCategory(res.data.units_by_category || {});
    }).catch(console.error);
  }, []);

  // ── Fetch global stock counts ──────────────────────────────────────────────
  const fetchStockCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const res = await warehouseInventoryService.getAll({ per_page: 9999, page: 1 });
      const all = res.data.data || [];
      setStockCounts({
        onStock:  all.filter(i => i.availability === 'ON STOCK').length,
        lowStock: all.filter(i => i.availability === 'LOW STOCK').length,
        noStock:  all.filter(i => i.availability === 'NO STOCK').length,
      });
    } catch (err) {
      console.error('Failed to load stock counts:', err);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStockCounts(); }, [fetchStockCounts]);

  // ── Fetch paginated table items ────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, per_page: perPage };
      if (typeFilter !== 'all')     params.type     = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search)                   params.search   = search;
      const res = await warehouseInventoryService.getAll(params);
      const d = res.data;
      setItems(d.data || []);
      setTotal(d.total || 0);
      setLastPage(d.last_page || 1);
      setFrom(d.from || 0);
      setTo(d.to || 0);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, typeFilter, categoryFilter, search]);

  // ── Fetch bin items (deleted items) ────────────────────────────────────────
  const fetchBinItems = useCallback(async () => {
    setBinLoading(true);
    try {
      const res = await warehouseInventoryService.getBin({ per_page: 9999 });
      setBinItems(res.data.data || []);
    } catch (err) {
      console.error('Failed to load bin items:', err);
    } finally {
      setBinLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setCurrentPage(1); }, [typeFilter, categoryFilter, search, perPage]);

  // Load bin items when bin is opened
  useEffect(() => {
    if (showBin) {
      fetchBinItems();
    }
  }, [showBin, fetchBinItems]);

  // ── Soft delete (move to bin) ──────────────────────────────────────────────
  const handleSoftDelete = async (id) => {
    if (!window.confirm('Move this product to the bin? You can restore it later from the Bin tab.')) return;
    setDeleteLoading(id);
    try {
      await warehouseInventoryService.remove(id);
      if (items.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
      else fetchItems();
      fetchStockCounts();
      if (showBin) fetchBinItems();
    } catch (err) {
      alert('Failed to move product to bin.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // ── Restore from bin ───────────────────────────────────────────────────────
  const handleRestore = async (id) => {
    setRestoreLoading(id);
    try {
      await warehouseInventoryService.restore(id);
      fetchBinItems();
      fetchItems();
      fetchStockCounts();
    } catch (err) {
      alert('Failed to restore product.');
    } finally {
      setRestoreLoading(null);
    }
  };

  // ── Permanent delete (remove from bin) ─────────────────────────────────────
  const handlePermanentDelete = async (id) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this product. This action CANNOT be undone. Continue?')) return;
    setPermanentDeleteLoading(id);
    try {
      await warehouseInventoryService.forceDelete(id);
      fetchBinItems();
    } catch (err) {
      alert('Failed to permanently delete product.');
    } finally {
      setPermanentDeleteLoading(null);
    }
  };

  // ── Category change ────────────────────────────────────────────────────────
  const handleCategoryChange = (cat) => {
    setFormData(f => ({
      ...f,
      product_category: cat,
      unit:             unitsByCategory[cat] || 'Pcs',
      product_code:     '',
      is_consumable:    cat === 'CONSUMABLES',
    }));
    setCustomCode(false);
  };

  // ── Stock change ───────────────────────────────────────────────────────────
  const handleStockChange = (value) => {
    setFormData(f => ({
      ...f,
      current_stock: value,
      availability:  deriveAvailability(value),
    }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const stockInt = parseInt(formData.current_stock, 10) || 0;
      const payload = {
        ...formData,
        current_stock:   stockInt,
        price_per_piece: parseFloat(formData.price_per_piece) || 0,
        reserve:         parseInt(formData.reserve, 10) || 0,
        availability:    deriveAvailability(stockInt),
      };

      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      if (isEditing) await warehouseInventoryService.update(currentId, cleanPayload);
      else           await warehouseInventoryService.create(payload);
      closeModal();
      fetchItems();
      fetchStockCounts();
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      alert(err.response?.data?.message || 'Failed to save. Please check all fields.');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Reorder ────────────────────────────────────────────────────────────────
  const openReorderModal  = (item) => setReorderTarget(item);
  const closeReorderModal = () => { setReorderTarget(null); setReorderLoading(false); };

  const handleReorderConfirm = async ({ notes, quantity_needed }) => {
    if (!reorderTarget) return;
    setReorderLoading(true);
    try {
      await warehouseInventoryService.requestReorder({
        warehouse_inventory_id: reorderTarget.id,
        product_category:       reorderTarget.product_category,
        product_code:           reorderTarget.product_code,
        current_stock:          reorderTarget.current_stock,
        unit:                   reorderTarget.unit,
        availability:           reorderTarget.availability,
        quantity_needed:        parseInt(quantity_needed, 10) || null,
        notes:                  notes || null,
      });
      closeReorderModal();
      setReorderToast(`Reorder request sent for ${reorderTarget.product_code}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reorder request. Please try again.';
      alert(msg);
    } finally {
      setReorderLoading(false);
    }
  };

  const openAddModal  = () => { setIsEditing(false); setIsNewArrival(false); setCurrentId(null); setFormData({ ...EMPTY_FORM }); setCustomCode(false); setIsModalOpen(true); };
  const openEditModal = (item) => { setIsEditing(true); setIsNewArrival(false); setCurrentId(item.id); setFormData({ ...item, price_per_piece: item.price_per_piece ?? '' }); setCustomCode(true); setIsModalOpen(true); };
  const closeModal    = () => { setIsModalOpen(false); setIsEditing(false); setIsNewArrival(false); setCurrentId(null); setFormData({ ...EMPTY_FORM }); setCustomCode(false); if (clearArrivalData) clearArrivalData(); };

  const codesForCategory = formData.product_category ? (presetCodes[formData.product_category] || []) : [];

  return (
    <div className="wh-container">

      {/* Success Toast */}
      {reorderToast && (
        <ReorderToast message={reorderToast} onDismiss={() => setReorderToast(null)} />
      )}

      {/* Top Bar */}
      <div className="wh-topbar">
        <div className="wh-topbar-left">
          <div className="wh-title-block">
            <h1 className="wh-title">Warehouse Inventory</h1>
            <p className="wh-subtitle">Construction Materials</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`wh-add-btn`} 
            onClick={() => setShowBin(!showBin)}
            style={{ 
              background: showBin ? 'var(--brand-red)' : 'rgba(255,255,255,.15)',
              border: showBin ? 'none' : '1px solid rgba(255,255,255,.2)'
            }}
          >
            <Archive size={16} /> {showBin ? 'Back to Inventory' : 'Bin'}
          </button>
          {!showBin && (
            <button className="wh-add-btn" onClick={openAddModal}>
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {!showBin ? (
        <>
          {/* Filter Bar */}
          <div className="wh-filters">
            <div className="wh-type-toggle">
              {[{ val: 'all', label: 'All Products' }, { val: 'main', label: 'Main Products' }, { val: 'consumable', label: 'Consumables' }].map(({ val, label }) => (
                <button key={val} className={`wh-toggle-btn ${typeFilter === val ? 'active' : ''}`} onClick={() => setTypeFilter(val)}>{label}</button>
              ))}
            </div>
            <div className="wh-filter-select-wrap">
              <select className="wh-filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={14} className="wh-select-icon" />
            </div>
            <div className="wh-search-wrap">
              <Search size={14} className="wh-search-icon" />
              <input
                type="text"
                className="wh-search-input"
                placeholder="Search code or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <StockSummaryBar counts={stockCounts} loading={countsLoading} />

          {/* Table */}
          <div className="wh-table-wrap">
            <table className="wh-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Availability</th>
                  <th className="text-right">Current Stock</th>
                  <th>Unit</th>
                  <th className="text-right">Price / Piece</th>
                  <th className="text-right">Total Value</th>
                  <th className="text-right">Reserve</th>
                  <th className="text-right">After Reserve</th>
                  <th>Condition</th>
                  <th>Type</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="12" className="wh-loading-cell"><Loader2 className="wh-spinner" size={20} /> Loading inventory…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="12" className="wh-empty-cell">No products found.</td></tr>
                ) : items.map((item) => {
                  const reserve    = parseInt(item.reserve || 0);
                  const totalAfter = item.current_stock - reserve;
                  const rowClass   = item.availability === 'NO STOCK'
                    ? 'wh-row wh-row-no-stock'
                    : item.availability === 'LOW STOCK'
                      ? 'wh-row wh-row-low-stock'
                      : 'wh-row';
                  return (
                    <tr key={item.id} className={rowClass}>
                      <td><span className="wh-category-badge">{item.product_category}</span></td>
                      <td className="wh-code">{item.product_code}</td>
                      <td>
                        <span className={`wh-avail ${AVAILABILITY_COLORS[item.availability] || 'avail-no'}`}>
                          {item.availability}
                        </span>
                      </td>
                      <td className="text-right wh-num">{item.current_stock}</td>
                      <td className="wh-unit">{item.unit}</td>
                      <td className="text-right wh-num">{fmtPrice(item.price_per_piece)}</td>
                      <td className="text-right wh-num wh-value">{fmtValue(item.total_stock_value)}</td>
                      <td className="text-right wh-num">{reserve > 0 ? reserve : '—'}</td>
                      <td className={`text-right wh-num wh-total ${totalAfter < 0 ? 'negative' : ''}`}>{totalAfter}</td>
                      <td><span className={`wh-condition ${CONDITION_COLORS[item.condition] || ''}`}>{item.condition}</span></td>
                      <td><span className={item.is_consumable ? 'wh-pill consumable' : 'wh-pill main'}>{item.is_consumable ? 'Consumable' : 'Main'}</span></td>
                      <td className="wh-actions">
                        {(item.availability === 'LOW STOCK' || item.availability === 'NO STOCK') && (
                          <button
                            className="wh-reorder-btn"
                            onClick={() => openReorderModal(item)}
                            title="Request Reorder"
                          >
                            Reorder
                          </button>
                        )}
                        <button className="wh-edit-btn" onClick={() => openEditModal(item)} title="Edit"><Pencil size={14} /></button>
                        <button className="wh-del-btn" onClick={() => handleSoftDelete(item.id)} disabled={deleteLoading === item.id} title="Move to Bin">
                          {deleteLoading === item.id ? <Loader2 size={14} className="wh-spinner" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
      ) : (
        /* ─── Bin / Archive View ─── */
        <div className="wh-table-wrap" style={{ marginTop: '1rem' }}>
          <div style={{ 
            padding: '0.85rem 1.25rem', 
            background: '#221F1F', 
            color: '#fff', 
            borderBottom: '2px solid var(--brand-red)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Archive size={20} />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Product Bin</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', opacity: 0.7 }}>
                  Deleted products are stored here. You can restore them or permanently delete them.
                </p>
              </div>
            </div>
          </div>
          <table className="wh-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Code</th>
                <th>Availability</th>
                <th className="text-right">Current Stock</th>
                <th>Unit</th>
                <th>Deleted At</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {binLoading ? (
                <tr><td colSpan="7" className="wh-loading-cell"><Loader2 className="wh-spinner" size={20} /> Loading bin…</td></tr>
              ) : binItems.length === 0 ? (
                <tr><td colSpan="7" className="wh-empty-cell">🗑️ Bin is empty. No deleted products found.</td></tr>
              ) : binItems.map((item) => (
                <tr key={item.id} className="wh-row">
                  <td><span className="wh-category-badge">{item.product_category}</span></td>
                  <td className="wh-code">{item.product_code}</td>
                  <td>
                    <span className={`wh-avail ${AVAILABILITY_COLORS[item.availability] || 'avail-no'}`}>
                      {item.availability}
                    </span>
                  </td>
                  <td className="text-right wh-num">{item.current_stock}</td>
                  <td className="wh-unit">{item.unit}</td>
                  <td className="dl-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </td>
                  <td className="wh-actions">
                    <button 
                      className="wh-edit-btn" 
                      onClick={() => handleRestore(item.id)} 
                      disabled={restoreLoading === item.id} 
                      title="Restore"
                      style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
                    >
                      {restoreLoading === item.id ? <Loader2 size={14} className="wh-spinner" /> : <ArchiveRestore size={14} />}
                    </button>
                    <button 
                      className="wh-del-btn" 
                      onClick={() => handlePermanentDelete(item.id)} 
                      disabled={permanentDeleteLoading === item.id} 
                      title="Permanently Delete"
                      style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
                    >
                      {permanentDeleteLoading === item.id ? <Loader2 size={14} className="wh-spinner" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!binLoading && binItems.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              Total {binItems.length} item{binItems.length !== 1 ? 's' : ''} in bin
            </div>
          )}
        </div>
      )}

      {/* Reorder Confirmation Modal */}
      {reorderTarget && (
        <ReorderModal
          item={reorderTarget}
          onConfirm={handleReorderConfirm}
          onClose={closeReorderModal}
          loading={reorderLoading}
        />
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="wh-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="wh-modal">
            <div className="wh-modal-header">
              <div className="wh-modal-title-row">
                {isNewArrival && <PackageCheck size={20} className="wh-modal-icon" />}
                <h2 className="wh-modal-title">
                  {isNewArrival ? 'New Arrival Stock' : isEditing ? 'Update Product' : 'Register Product'}
                </h2>
              </div>
              <button className="wh-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="wh-form">
              <div className="wh-form-row">
                <div className="wh-form-group">
                  <label>Product Category <span className="req">*</span></label>
                  <div className="wh-select-wrap">
                    <select required value={formData.product_category} onChange={e => handleCategoryChange(e.target.value)}>
                      <option value="">— Select Category —</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown size={13} className="wh-select-icon" />
                  </div>
                </div>
                <div className="wh-form-group">
                  <label>Unit <span className="req">*</span></label>
                  <input
                    type="text" required
                    value={formData.unit}
                    onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. Rolls, Pcs, Bags"
                  />
                </div>
              </div>

              <div className="wh-form-group">
                <div className="wh-label-row">
                  <label>Product Code <span className="req">*</span></label>
                  {codesForCategory.length > 0 && (
                    <button type="button" className="wh-toggle-code-btn" onClick={() => setCustomCode(v => !v)}>
                      {customCode ? 'Pick from list' : 'Enter custom code'}
                    </button>
                  )}
                </div>
                {(!customCode && codesForCategory.length > 0) ? (
                  <div className="wh-select-wrap">
                    <select required value={formData.product_code} onChange={e => setFormData(f => ({ ...f, product_code: e.target.value }))}>
                      <option value="">— Select Code —</option>
                      {codesForCategory.map(({ code }) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <ChevronDown size={13} className="wh-select-icon" />
                  </div>
                ) : (
                  <input
                    type="text" required
                    value={formData.product_code}
                    onChange={e => setFormData(f => ({ ...f, product_code: e.target.value }))}
                    placeholder="e.g. 182062 or 182062 - New"
                  />
                )}
                <p className="wh-hint">Same code across categories is valid (e.g. F6013 across multiple product types).</p>
              </div>

              <div className="wh-form-row wh-form-row-3">
                <div className="wh-form-group">
                  <div className="wh-label-row">
                    <label>Current Stock <span className="req">*</span></label>
                    {formData.current_stock !== '' && (
                      <AvailPreview stock={formData.current_stock} />
                    )}
                  </div>
                  <input
                    type="number" min="0" required
                    value={formData.current_stock}
                    onChange={e => handleStockChange(e.target.value)}
                    placeholder="0"
                  />
                  <p className="wh-hint" style={{ marginTop: 3 }}>
                    0 = No Stock · 1–10 = Low Stock · 11+ = On Stock
                  </p>
                </div>

                <div className="wh-form-group">
                  <label>Price per Piece <span className="wh-optional">(₱)</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.price_per_piece}
                    onChange={e => setFormData(f => ({ ...f, price_per_piece: e.target.value }))}
                    placeholder="0.00"
                  />
                  {formData.price_per_piece > 0 && formData.current_stock > 0 && (
                    <p className="wh-hint" style={{ marginTop: 3, color: '#059669', fontWeight: 600 }}>
                      Total value: {fmtPrice(parseFloat(formData.price_per_piece) * parseInt(formData.current_stock || 0))}
                    </p>
                  )}
                </div>

                <div className="wh-form-group">
                  <label>Reserve</label>
                  <input type="number" min="0" value={formData.reserve} onChange={e => setFormData(f => ({ ...f, reserve: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div className="wh-form-row">
                <div className="wh-form-group">
                  <label>Condition</label>
                  <div className="wh-select-wrap">
                    <select value={formData.condition} onChange={e => setFormData(f => ({ ...f, condition: e.target.value }))}>
                      <option>Good</option><option>Damaged</option><option>Returned</option>
                    </select>
                    <ChevronDown size={13} className="wh-select-icon" />
                  </div>
                </div>
              </div>

              <div className="wh-form-group wh-checkbox-group">
                <label className="wh-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_consumable}
                    onChange={e => setFormData(f => ({ ...f, is_consumable: e.target.checked }))}
                  />
                  <span>Mark as Consumable</span>
                </label>
              </div>

              <div className="wh-form-group">
                <label>Notes <span className="wh-optional">(optional)</span></label>
                <textarea rows={2} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Any remarks…" />
              </div>

              <div className="wh-modal-footer">
                <button type="button" className="wh-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="wh-btn-save" disabled={saveLoading}>
                  {saveLoading
                    ? <><Loader2 size={15} className="wh-spinner" /> Saving…</>
                    : isEditing ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionMat;