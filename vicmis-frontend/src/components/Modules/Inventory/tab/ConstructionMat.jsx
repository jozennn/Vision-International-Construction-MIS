import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, PackageCheck, Pencil, Trash2 } from 'lucide-react';
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
  current_stock:    '',
  delivery_in:      '',
  delivery_out:     '',
  return_out:       '',
  return_in:        '',
  reserve:          '',
  condition:        'Good',
  is_consumable:    false,
  notes:            '',
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
// Receives pre-computed global counts so it always reflects the full
// warehouse regardless of which page / filter the user is on.
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

// ─── Main Component ───────────────────────────────────────────────────────────
const ConstructionMat = ({ onBack, newArrivalData, clearArrivalData }) => {
  const [items, setItems]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [saveLoading, setSaveLoading]         = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(null);

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

  // ── Global stock counts — independent of pagination and active filters ─────
  const [stockCounts, setStockCounts]         = useState({ onStock: 0, lowStock: 0, noStock: 0 });
  const [countsLoading, setCountsLoading]     = useState(true);

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [isNewArrival, setIsNewArrival]       = useState(false);
  const [currentId, setCurrentId]             = useState(null);
  const [formData, setFormData]               = useState({ ...EMPTY_FORM });
  const [customCode, setCustomCode]           = useState(false);

  // ── Load meta ──────────────────────────────────────────────────────────────
  useEffect(() => {
    warehouseInventoryService.getMeta().then(res => {
      setCategories(res.data.categories || []);
      setPresetCodes(res.data.preset_codes || {});
      setUnitsByCategory(res.data.units_by_category || {});
    }).catch(console.error);
  }, []);

  // ── Fetch global stock counts ──────────────────────────────────────────────
  // Fetches ALL records with no type/category/search filters so the summary
  // bar always shows true warehouse-wide totals no matter what the user has
  // filtered or which page they are on.
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

  // ── Fetch paginated table items (respects active filters) ──────────────────
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

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setCurrentPage(1); }, [typeFilter, categoryFilter, search, perPage]);

  // ── New arrival ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (newArrivalData?.projects?.length > 0) {
      const proj = newArrivalData.projects[0];
      setIsNewArrival(true);
      setFormData({
        ...EMPTY_FORM,
        product_category: proj.product_category || '',
        product_code:     newArrivalData.shipment_number || '',
        current_stock:    proj.quantity || '',
        is_consumable:    proj.product_category === 'CONSUMABLES',
      });
      setIsModalOpen(true);
    }
  }, [newArrivalData]);

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
        current_stock: stockInt,
        delivery_in:   parseInt(formData.delivery_in,  10) || 0,
        delivery_out:  parseInt(formData.delivery_out, 10) || 0,
        return_out:    parseInt(formData.return_out,   10) || 0,
        return_in:     parseInt(formData.return_in,    10) || 0,
        reserve:       parseInt(formData.reserve,      10) || 0,
        availability:  deriveAvailability(stockInt),
      };
      if (isEditing) await warehouseInventoryService.update(currentId, payload);
      else           await warehouseInventoryService.create(payload);
      closeModal();
      // Refresh both the table AND the global counts after any save
      fetchItems();
      fetchStockCounts();
    } catch (err) {
      alert('Failed to save. Please check all fields.');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this product from inventory?')) return;
    setDeleteLoading(id);
    try {
      await warehouseInventoryService.remove(id);
      if (items.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
      else fetchItems();
      // Refresh global counts after delete
      fetchStockCounts();
    } catch {
      alert('Failed to delete.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // ── Reorder ────────────────────────────────────────────────────────────────
  const handleReorder = async (item) => {
    if (!window.confirm(`Submit reorder request for ${item.product_category} (${item.product_code})?`)) return;
    try {
      await warehouseInventoryService.requestReorder({
        warehouse_inventory_id: item.id,
        product_category:       item.product_category,
        product_code:           item.product_code,
        current_stock:          item.current_stock,
        unit:                   item.unit,
        availability:           item.availability,
      });
      alert('✓ Reorder request sent to Procurement!');
    } catch {
      alert('Failed to send reorder request.');
    }
  };

  const openAddModal  = () => { setIsEditing(false); setIsNewArrival(false); setCurrentId(null); setFormData({ ...EMPTY_FORM }); setCustomCode(false); setIsModalOpen(true); };
  const openEditModal = (item) => { setIsEditing(true); setIsNewArrival(false); setCurrentId(item.id); setFormData({ ...item }); setCustomCode(true); setIsModalOpen(true); };
  const closeModal    = () => { setIsModalOpen(false); setIsEditing(false); setIsNewArrival(false); setCurrentId(null); setFormData({ ...EMPTY_FORM }); setCustomCode(false); if (clearArrivalData) clearArrivalData(); };

  const codesForCategory = formData.product_category ? (presetCodes[formData.product_category] || []) : [];

  return (
    <div className="wh-container">

      {/* Top Bar */}
      <div className="wh-topbar">
        <div className="wh-topbar-left">
          <div className="wh-title-block">
            <h1 className="wh-title">Warehouse Inventory</h1>
            <p className="wh-subtitle">Construction Materials</p>
          </div>
        </div>
        <button className="wh-add-btn" onClick={openAddModal}>
          <Plus size={16} /> Add Product
        </button>
      </div>

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

      {/* Stock Health Summary Bar — always shows global warehouse-wide totals */}
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
              <th className="text-right">Reserve</th>
              <th className="text-right">Total After Reserve</th>
              <th>Condition</th>
              <th>Type</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="wh-loading-cell"><Loader2 className="wh-spinner" size={20} /> Loading inventory…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="10" className="wh-empty-cell">No products found.</td></tr>
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
                  <td className="text-right wh-num">{reserve > 0 ? reserve : '—'}</td>
                  <td className={`text-right wh-num wh-total ${totalAfter < 0 ? 'negative' : ''}`}>{totalAfter}</td>
                  <td><span className={`wh-condition ${CONDITION_COLORS[item.condition] || ''}`}>{item.condition}</span></td>
                  <td><span className={item.is_consumable ? 'wh-pill consumable' : 'wh-pill main'}>{item.is_consumable ? 'Consumable' : 'Main'}</span></td>
                  <td className="wh-actions">
                    {(item.availability === 'LOW STOCK' || item.availability === 'NO STOCK') && (
                      <button
                        className="wh-reorder-btn"
                        onClick={() => handleReorder(item)}
                        title="Request Reorder"
                      >
                        Reorder
                      </button>
                    )}
                    <button className="wh-edit-btn" onClick={() => openEditModal(item)} title="Edit"><Pencil size={14} /></button>
                    <button className="wh-del-btn" onClick={() => handleDelete(item.id)} disabled={deleteLoading === item.id} title="Delete">
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

      {/* Modal */}
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

              {/* Current Stock with live availability preview */}
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
                  <label>Delivery In</label>
                  <input type="number" min="0" value={formData.delivery_in}  onChange={e => setFormData(f => ({ ...f, delivery_in:  e.target.value }))} placeholder="0" />
                </div>
                <div className="wh-form-group">
                  <label>Delivery Out</label>
                  <input type="number" min="0" value={formData.delivery_out} onChange={e => setFormData(f => ({ ...f, delivery_out: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div className="wh-form-row wh-form-row-3">
                <div className="wh-form-group">
                  <label>Return Out</label>
                  <input type="number" min="0" value={formData.return_out} onChange={e => setFormData(f => ({ ...f, return_out: e.target.value }))} placeholder="0" />
                </div>
                <div className="wh-form-group">
                  <label>Return In</label>
                  <input type="number" min="0" value={formData.return_in}  onChange={e => setFormData(f => ({ ...f, return_in:  e.target.value }))} placeholder="0" />
                </div>
                <div className="wh-form-group">
                  <label>Reserve</label>
                  <input type="number" min="0" value={formData.reserve}    onChange={e => setFormData(f => ({ ...f, reserve:    e.target.value }))} placeholder="0" />
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