import React, { useState, useEffect, useRef } from 'react';
import warehouseInventoryService from '@/api/warehouseInventoryService';

// ─── Stock badge config ───────────────────────────────────────────────────────
const STOCK_CFG = {
  'ON STOCK':  { cls: 'boq-stock-on',  dot: '#10B981', label: 'ON STOCK'  },
  'LOW STOCK': { cls: 'boq-stock-low', dot: '#F59E0B', label: 'LOW STOCK' },
  'NO STOCK':  { cls: 'boq-stock-no',  dot: '#EF4444', label: 'NO STOCK'  },
};

// ─── Inline dropdown for category / code ─────────────────────────────────────
const InlineSelect = ({ value, options, placeholder, onChange, disabled }) => {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const ref = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="boq-dd-wrap" ref={ref}>
      <div
        className={`boq-dd-trigger pm-input ${disabled ? 'boq-dd-disabled' : ''}`}
        style={{ margin: 0, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? 'var(--pm-text-dark)' : 'var(--pm-text-light)' }}>
          {value || placeholder}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--pm-text-muted)', marginLeft: '4px' }}>▼</span>
      </div>

      {open && !disabled && (
        <div className="boq-dd-panel">
          <input
            autoFocus
            className="boq-dd-search"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <div className="boq-dd-list">
            {filtered.length === 0 && (
              <div className="boq-dd-empty">No results</div>
            )}
            {filtered.map(opt => (
              <div
                key={opt}
                className={`boq-dd-item ${value === opt ? 'active' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Stock alert banner ───────────────────────────────────────────────────────
const StockAlerts = ({ rows, inventory }) => {
  const alerts = rows
    .filter(r => r.product_code)
    .map(r => {
      const item = inventory.find(i => i.product_code === r.product_code);
      return item && item.availability !== 'ON STOCK' ? item : null;
    })
    .filter(Boolean);

  if (!alerts.length) return null;

  return (
    <div className="boq-alert-banner">
      <div className="boq-alert-icon">⚠️</div>
      <div className="boq-alert-body">
        <span className="boq-alert-title">Stock Warning — {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention</span>
        <div className="boq-alert-list">
          {alerts.map((item, i) => (
            <span key={i} className={`boq-alert-chip ${item.availability === 'NO STOCK' ? 'chip-no' : 'chip-low'}`}>
              <span className="boq-alert-dot" style={{ background: STOCK_CFG[item.availability]?.dot }} />
              {item.product_code} — {item.current_stock} {item.unit} ({item.availability})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main BoqTable ────────────────────────────────────────────────────────────
const BoqTable = ({ type, boqData, readOnly, onAdd, onRemove, onChange }) => {
  const [inventory,   setInventory]   = useState([]);
  const [loadingInv,  setLoadingInv]  = useState(true);

  // Updated Fetch logic using the warehouseInventoryService
  useEffect(() => {
    const fetchInventory = async () => {
      setLoadingInv(true);
      try {
        const res = await warehouseInventoryService.getAll({ per_page: 9999 });
        const rows = res.data?.data ?? res.data ?? [];
        setInventory(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error('[BoqTable] inventory fetch failed:', err);
      } finally {
        setLoadingInv(false);
      }
    };
    fetchInventory();
  }, []);

  const rows      = boqData[type] || [];
  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  // Derived lists from inventory
  const categories = [...new Set(inventory.map(i => i.product_category))].filter(Boolean).sort();

  const codesForCategory = (category) =>
    inventory.filter(i => i.product_category === category).map(i => i.product_code).filter(Boolean).sort();

  const itemForCode = (code) => inventory.find(i => i.product_code === code);

  const handleCategoryChange = (idx, category) => {
    onChange(type, idx, 'product_category', category);
    onChange(type, idx, 'product_code', '');
    onChange(type, idx, 'unit', '');
  };

  const handleCodeChange = (idx, code) => {
    const item = itemForCode(code);
    onChange(type, idx, 'product_code', code);
    if (item) {
      onChange(type, idx, 'unit', item.unit || '');
      if (!rows[idx]?.description) {
        onChange(type, idx, 'description', item.product_code);
      }
    }
  };

  return (
    <div>
      {!readOnly && !loadingInv && (
        <StockAlerts rows={rows} inventory={inventory} />
      )}

      <div className="pm-table-wrapper">
        {loadingInv && !readOnly && (
          <div className="boq-loading-bar">
            <div className="boq-loading-inner" />
            <span>Loading inventory data…</span>
          </div>
        )}

        <table className="pm-table boq-table-extended">
          <thead>
            <tr>
              <th className="boq-th-category">Product Category</th>
              <th className="boq-th-code">
                Product Code
                {!readOnly && <span className="boq-th-hint"> (from inventory)</span>}
              </th>
              <th className="boq-th-desc">Description</th>
              <th className="boq-th-unit">Unit</th>
              <th className="boq-th-qty">Qty</th>
              <th className="boq-th-cost">Unit Cost (₱)</th>
              <th className="boq-th-total">Total (₱)</th>
              <th className="boq-th-stock">Stock</th>
              {!readOnly && <th className="boq-th-action">—</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="boq-empty-row">
                  No items added yet. Click "+ Add BOQ Item" to begin.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const invItem     = itemForCode(row.product_code);
              const availability = invItem?.availability || null;
              const stockCfg    = availability ? STOCK_CFG[availability] : null;
              const codesAvail  = row.product_category ? codesForCategory(row.product_category) : [];
              const isLowOrNo   = availability === 'LOW STOCK' || availability === 'NO STOCK';

              return (
                <tr key={idx} className={isLowOrNo ? 'boq-row-warn' : ''}>
                  <td className="boq-td-category">
                    {readOnly ? (
                      <span className="boq-readonly-cell">{row.product_category || '—'}</span>
                    ) : (
                      <InlineSelect
                        value={row.product_category || ''}
                        options={categories}
                        placeholder="Select category"
                        onChange={(val) => handleCategoryChange(idx, val)}
                        disabled={loadingInv}
                      />
                    )}
                  </td>

                  <td className="boq-td-code">
                    {readOnly ? (
                      <span className="boq-readonly-cell boq-code-chip">{row.product_code || '—'}</span>
                    ) : (
                      <InlineSelect
                        value={row.product_code || ''}
                        options={codesAvail}
                        placeholder={row.product_category ? 'Select code' : 'Pick category first'}
                        onChange={(val) => handleCodeChange(idx, val)}
                        disabled={!row.product_category || loadingInv}
                      />
                    )}
                    {invItem && (
                      <div className="boq-stock-inline">
                        <span className="boq-stock-dot" style={{ background: stockCfg?.dot }} />
                        <span className={`boq-stock-label ${stockCfg?.cls}`}>
                          {invItem.current_stock} {invItem.unit} · {availability}
                        </span>
                      </div>
                    )}
                  </td>

                  <td>
                    <input
                      disabled={readOnly}
                      value={row.description || ''}
                      onChange={e => onChange(type, idx, 'description', e.target.value)}
                      className="pm-input"
                      style={{ margin: 0 }}
                      placeholder="Item description"
                    />
                  </td>

                  <td>
                    <input
                      disabled={readOnly}
                      value={row.unit || ''}
                      onChange={e => onChange(type, idx, 'unit', e.target.value)}
                      className="pm-input text-center"
                      style={{ margin: 0 }}
                      placeholder="pcs"
                    />
                  </td>

                  <td>
                    <input
                      disabled={readOnly}
                      type="number"
                      value={row.qty || ''}
                      onChange={e => onChange(type, idx, 'qty', e.target.value)}
                      className="pm-input text-center"
                      style={{ margin: 0 }}
                      placeholder="0"
                    />
                  </td>

                  <td>
                    <input
                      disabled={readOnly}
                      type="number"
                      value={row.unitCost || ''}
                      onChange={e => onChange(type, idx, 'unitCost', e.target.value)}
                      className="pm-input text-center"
                      style={{ margin: 0 }}
                      placeholder="0.00"
                    />
                  </td>

                  <td className="text-center boq-total-cell">
                    ₱{(parseFloat(row.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="boq-td-stock">
                    {stockCfg ? (
                      <span className={`boq-stock-badge ${stockCfg.cls}`}>
                        <span className="boq-stock-dot" style={{ background: stockCfg.dot }} />
                        {availability}
                      </span>
                    ) : (
                      <span className="boq-stock-badge boq-stock-unknown">—</span>
                    )}
                  </td>

                  {!readOnly && (
                    <td className="text-center">
                      <button type="button" onClick={() => onRemove(type, idx)} className="pm-btn-icon-danger">✕</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="pm-boq-total-label">Grand Total Budget:</td>
                <td className="pm-boq-total-val">
                  ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={readOnly ? 1 : 2} />
              </tr>
            </tfoot>
          )}
        </table>

        {!readOnly && (
          <div className="text-center" style={{ padding: '15px', background: '#fff' }}>
            <button type="button" onClick={() => onAdd(type)} className="pm-btn-outline">
              + Add BOQ Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoqTable;