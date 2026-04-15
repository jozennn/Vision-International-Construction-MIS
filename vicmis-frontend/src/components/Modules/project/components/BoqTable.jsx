import React, { useState, useEffect, useRef } from 'react';
import warehouseInventoryService from '@/api/warehouseInventoryService';
import '../css/BoqTable.css';

const STOCK_CFG = {
  'ON STOCK':  { cls: 'boq-stock-on',  dot: '#10B981' },
  'LOW STOCK': { cls: 'boq-stock-low', dot: '#F59E0B' },
  'NO STOCK':  { cls: 'boq-stock-no',  dot: '#EF4444' },
};

const InlineSelect = ({ value, options, placeholder, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
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
          <input autoFocus className="boq-dd-search" placeholder="Search..." value={query}
            onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()} />
          <div className="boq-dd-list">
            {filtered.length === 0 && <div className="boq-dd-empty">No results</div>}
            {filtered.map(opt => (
              <div key={opt} className={`boq-dd-item ${value === opt ? 'active' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
        <span className="boq-alert-title">
          Stock Warning — {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention
        </span>
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

const BoqTable = ({ type, boqData, readOnly, onAdd, onRemove, onChange }) => {
  const [inventory, setInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);

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

  const rows = boqData[type] || [];
  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  const categories = [...new Set(inventory.map(i => i.product_category))].filter(Boolean).sort();
  const codesForCategory = (cat) => inventory.filter(i => i.product_category === cat).map(i => i.product_code).filter(Boolean).sort();
  const itemForCode = (code) => inventory.find(i => i.product_code === code);

  const handleCategoryChange = (idx, category) => {
    onChange(type, idx, 'product_category', category);
    onChange(type, idx, 'product_code', '');
    onChange(type, idx, 'unit', '');
    onChange(type, idx, 'unitCost', '');
    onChange(type, idx, 'total', '');
  };

  const handleCodeChange = (idx, code) => {
    const item = itemForCode(code);
    onChange(type, idx, 'product_code', code);
    if (item) {
      onChange(type, idx, 'unit', item.unit || '');
      const price = parseFloat(item.price_per_piece) || 0;
      onChange(type, idx, 'unitCost', price > 0 ? String(price) : '');
      const row = rows[idx];
      const qty = parseFloat(row?.qty) || 0;
      onChange(type, idx, 'total', price > 0 && qty > 0 ? String(qty * price) : '');
    }
  };

  const handleQtyChange = (idx, value, invItem) => {
    let qty = value;
    if (invItem?.current_stock !== undefined) {
      const max = parseFloat(invItem.current_stock);
      if (!isNaN(max) && parseFloat(qty) > max) qty = String(max);
    }
    onChange(type, idx, 'qty', qty);
    const row = rows[idx];
    const cost = parseFloat(row?.unitCost) || 0;
    onChange(type, idx, 'total', String((parseFloat(qty) || 0) * cost));
  };

  const handleUnitCostChange = (idx, value) => {
    onChange(type, idx, 'unitCost', value);
    const row = rows[idx];
    const qty = parseFloat(row?.qty) || 0;
    onChange(type, idx, 'total', String(qty * (parseFloat(value) || 0)));
  };

  return (
    <div className="boq-wrapper">
      {!readOnly && !loadingInv && <StockAlerts rows={rows} inventory={inventory} />}

      <div className="boq-scroll">
        {loadingInv && !readOnly && (
          <div className="boq-loading-bar">
            <div className="boq-loading-inner" />
            <span>Loading inventory data…</span>
          </div>
        )}

        <table className={`boq-table${readOnly ? ' boq-table--readonly' : ''}`}>
          <thead>
            <tr>
              <th className="boq-th-category">Category</th>
              <th className="boq-th-code">
                Code{!readOnly && <span className="boq-th-hint"> (inventory)</span>}
              </th>
              <th className="boq-th-unit">Unit</th>
              <th className="boq-th-qty">Qty</th>
              <th className="boq-th-cost">
                {/* Shorten label on small screens via CSS class */}
                <span className="boq-th-label-full">Unit Cost (₱)</span>
                <span className="boq-th-label-short">Cost (₱)</span>
              </th>
              <th className="boq-th-total">Total (₱)</th>
              <th className="boq-th-stock">Stock</th>
              {!readOnly && <th className="boq-th-action">—</th>}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 7 : 8} className="boq-empty-row">
                  No items added yet. Click "+ Add BOQ Item" to begin.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const invItem = itemForCode(row.product_code);
              const availability = invItem?.availability || null;
              const stockCfg = availability ? STOCK_CFG[availability] : null;
              const codesAvail = row.product_category ? codesForCategory(row.product_category) : [];
              const isLowOrNo = availability === 'LOW STOCK' || availability === 'NO STOCK';
              const maxQty = invItem?.current_stock !== undefined ? parseFloat(invItem.current_stock) : undefined;

              return (
                <tr key={idx} className={isLowOrNo ? 'boq-row-warn' : ''}>
                  {/* Category */}
                  <td>
                    {readOnly
                      ? <span className="boq-readonly-cell">{row.product_category || '—'}</span>
                      : <InlineSelect value={row.product_category || ''} options={categories}
                          placeholder="Select category" onChange={val => handleCategoryChange(idx, val)}
                          disabled={loadingInv} />
                    }
                  </td>

                  {/* Code + stock inline hint */}
                  <td>
                    {readOnly
                      ? <span className="boq-readonly-cell boq-code-chip">{row.product_code || '—'}</span>
                      : <InlineSelect value={row.product_code || ''} options={codesAvail}
                          placeholder={row.product_category ? 'Select code' : 'Pick category first'}
                          onChange={val => handleCodeChange(idx, val)}
                          disabled={!row.product_category || loadingInv} />
                    }
                    {invItem && (
                      <div className="boq-stock-inline">
                        <span className="boq-stock-dot" style={{ background: stockCfg?.dot }} />
                        <span className={`boq-stock-label ${stockCfg?.cls}`}>
                          {invItem.current_stock} {invItem.unit} · {availability}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Unit (auto-filled, read-only) */}
                  <td>
                    <input disabled value={row.unit || ''} className="pm-input boq-unit-input"
                      style={{ margin: 0, background: 'var(--pm-input-disabled-bg, #f3f4f6)', cursor: 'not-allowed', textAlign: 'center' }}
                      placeholder="—" readOnly />
                  </td>

                  {/* Qty */}
                  <td>
                    <input disabled={readOnly} type="number" value={row.qty || ''}
                      min={0} max={maxQty ?? undefined}
                      onChange={e => handleQtyChange(idx, e.target.value, invItem)}
                      className="pm-input boq-qty-input" style={{ margin: 0, textAlign: 'center' }} placeholder="0" />
                  </td>

                  {/* Unit Cost */}
                  <td>
                    <div style={{ position: 'relative' }}>
                      <input
                        disabled={readOnly}
                        type="number"
                        value={row.unitCost || ''}
                        onChange={e => handleUnitCostChange(idx, e.target.value)}
                        className="pm-input boq-cost-input"
                        style={{ margin: 0, textAlign: 'center' }}
                        placeholder="0.00"
                      />
                      {invItem?.price_per_piece > 0 && row.unitCost === String(invItem.price_per_piece) && !readOnly && (
                        <span className="boq-auto-badge">auto</span>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="boq-total-cell">
                    ₱{(parseFloat(row.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Stock badge */}
                  <td style={{ textAlign: 'center' }}>
                    {stockCfg
                      ? <span className={`boq-stock-badge ${stockCfg.cls}`}>
                          <span className="boq-stock-dot" style={{ background: stockCfg.dot }} />
                          <span className="boq-stock-badge-text">{availability}</span>
                        </span>
                      : <span className="boq-stock-badge boq-stock-unknown">—</span>
                    }
                  </td>

                  {/* Remove btn */}
                  {!readOnly && (
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => onRemove(type, idx)} className="pm-btn-icon-danger boq-remove-btn">✕</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="pm-boq-total-label">Grand Total Budget:</td>
                <td className="pm-boq-total-val">
                  ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={readOnly ? 1 : 2} />
              </tr>
            </tfoot>
          )}
        </table>

        {!readOnly && (
          <div className="boq-add-row">
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