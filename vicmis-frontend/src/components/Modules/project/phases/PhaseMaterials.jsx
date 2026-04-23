import React, { useState, useRef, useEffect } from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseMaterials.css';
import api from '@/api/axios';
import warehouseInventoryService from '@/api/warehouseInventoryService';
import { X, Loader2, RotateCcw, PackageCheck, ShoppingCart } from 'lucide-react';

// Reorder Modal Component - Shows ALL BOQ items for reorder
const ReorderModal = ({ boqItems, onConfirm, onClose, loading }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!selectedItem || !quantityNeeded) return;
    onConfirm({
      item: selectedItem,
      quantity_needed: parseInt(quantityNeeded, 10),
      notes: notes || null
    });
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setQuantityNeeded(item.qty || '');
  };

  const getStockStatusClass = (availability) => {
    if (availability === 'NO STOCK') return 'avail-no';
    if (availability === 'LOW STOCK') return 'avail-low';
    return 'avail-on';
  };

  return (
    <div className="wh-overlay reorder-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wh-modal reorder-modal">
        {/* Header */}
        <div className="reorder-modal-header reorder-standard">
          <div className="reorder-modal-header-left">
            <div className="reorder-icon-wrap">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="reorder-modal-title">Request Reorder</h2>
              <p className="reorder-modal-sub">Select any item from the BOQ to request additional stock.</p>
            </div>
          </div>
          <button className="wh-modal-close reorder-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Item Selection */}
        <div className="reorder-fields-wrap" style={{ paddingTop: '1rem' }}>
          <div className="reorder-field-group">
            <label className="reorder-notes-label">
              Select Item from BOQ <span className="reorder-required">*</span>
            </label>
            <div className="wh-select-wrap">
              <select
                value={selectedItem?.code || ''}
                onChange={(e) => {
                  const item = boqItems.find(i => i.code === e.target.value);
                  handleItemSelect(item);
                }}
                style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.75rem' }}
              >
                <option value="">— Select Item —</option>
                {boqItems.map((item, idx) => (
                  <option key={idx} value={item.code}>
                    {item.category} - {item.code} (Required: {item.qty} {item.unit})
                  </option>
                ))}
              </select>
              <svg className="wh-select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {selectedItem && (
          <>
            <div className="reorder-product-card">
              <div className="reorder-product-identity">
                <div className="reorder-identity-row">
                  <span className="reorder-identity-label">Category</span>
                  <span className="reorder-category-badge">{selectedItem.category}</span>
                </div>
                <div className="reorder-identity-row">
                  <span className="reorder-identity-label">Item Code</span>
                  <span className="reorder-code">{selectedItem.code}</span>
                </div>
                {selectedItem.unitCost > 0 && (
                  <div className="reorder-identity-row">
                    <span className="reorder-identity-label">Unit Price</span>
                    <span className="reorder-code">₱{selectedItem.unitCost.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="reorder-product-stats">
                <div className="reorder-stat">
                  <span className="reorder-stat-label">BOQ Required</span>
                  <span className="reorder-stat-value">
                    {selectedItem.qty} <em>{selectedItem.unit}</em>
                  </span>
                </div>
                <div className="reorder-stat-divider" />
                <div className="reorder-stat">
                  <span className="reorder-stat-label">Current Stock</span>
                  <span className={`wh-avail ${getStockStatusClass(selectedItem.availability)}`}>
                    {selectedItem.currentStock || 0} {selectedItem.unit}
                  </span>
                </div>
                <div className="reorder-stat-divider" />
                <div className="reorder-stat">
                  <span className="reorder-stat-label">Status</span>
                  <span className={`wh-avail ${getStockStatusClass(selectedItem.availability)}`} style={{ fontSize: '0.68rem' }}>
                    {selectedItem.availability}
                  </span>
                </div>
              </div>
            </div>

            <div className="reorder-fields-wrap">
              <div className="reorder-field-group">
                <label className="reorder-notes-label">
                  Quantity Needed <span className="reorder-required">*</span>
                </label>
                <div className="reorder-qty-wrap">
                  <input
                    type="number"
                    min="1"
                    className="reorder-qty-input"
                    placeholder="Enter quantity"
                    value={quantityNeeded}
                    onChange={e => setQuantityNeeded(e.target.value)}
                  />
                  <span className="reorder-qty-unit">{selectedItem.unit}</span>
                </div>
                {quantityNeeded > 0 && selectedItem.unitCost > 0 && (
                  <p className="wh-hint" style={{ marginTop: 6, color: '#059669', fontWeight: 600 }}>
                    Estimated cost: ₱{(quantityNeeded * selectedItem.unitCost).toLocaleString()}
                  </p>
                )}
                {selectedItem.qty > 0 && (
                  <p className="wh-hint" style={{ marginTop: 4 }}>
                    💡 BOQ required quantity: {selectedItem.qty} {selectedItem.unit}
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
                  placeholder="e.g. Additional quantity needed beyond BOQ, urgent delivery..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <div className="reorder-modal-footer">
          <button type="button" className="wh-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="reorder-confirm-btn reorder-standard"
            onClick={handleConfirm}
            disabled={loading || !selectedItem || !quantityNeeded}
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

// Success Toast Component
const ReorderToast = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="reorder-toast">
      <PackageCheck size={16} />
      <span>{message}</span>
      <button className="reorder-toast-close" onClick={onDismiss}><X size={13} /></button>
    </div>
  );
};

const PhaseMaterials = ({
  project,
  boqData,
  isEng,
  isLogistics,
  isEngHead,
  isOpsAss,
  onAdvance,
  onUploadAdvance,
  onReject,
  renderDocumentLink,
  refreshProject,
}) => {
  // Reorder state
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderLoading, setReorderLoading]     = useState(false);
  const [reorderToast, setReorderToast]         = useState(null);

  // Inventory data for stock status
  const [inventory, setInventory] = useState([]);

  const { status } = project;

  // Fetch inventory data for stock status
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res  = await warehouseInventoryService.getAll({ per_page: 9999 });
        const rows = res.data?.data ?? res.data ?? [];
        setInventory(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    };
    fetchInventory();
  }, []);

  // Handle reorder request
  const handleReorderRequest = async ({ item, quantity_needed, notes }) => {
    setReorderLoading(true);
    try {
      await warehouseInventoryService.requestReorder({
        project_id:       project.id,
        project_name:     project.project_name,
        product_category: item.category,
        product_code:     item.code,
        quantity_needed,
        unit:             item.unit,
        unit_cost:        item.unitCost,
        total_cost:       quantity_needed * item.unitCost,
        notes:            notes || `Reorder request from project: ${project.project_name}`,
        requested_by:     'Logistics',
        status:           project.status,
      });

      setShowReorderModal(false);
      setReorderToast(`Reorder request sent for ${item.code} (${quantity_needed} ${item.unit})!`);
    } catch (err) {
      alert(`Failed to send reorder request: ${err.response?.data?.message || err.message}`);
    } finally {
      setReorderLoading(false);
    }
  };

  // Extract ALL BOQ items for reorder modal
  const getBoqItemsForReorder = () => {
    const rows = boqData?.finalBOQ || [];
    if (!rows || !Array.isArray(rows) || rows.length === 0) return [];

    return rows
      .filter(row => row.product_category && row.product_code)
      .map(row => {
        const invItem = inventory.find(i => i.product_code === row.product_code);
        return {
          category:     row.product_category || '—',
          code:         row.product_code     || '—',
          qty:          parseFloat(row.qty)  || 0,
          unit:         row.unit             || 'Pcs',
          unitCost:     parseFloat(row.unitCost) || 0,
          availability: invItem?.availability  || 'ON STOCK',
          currentStock: invItem?.current_stock || 0,
        };
      });
  };

  /* ── 1. Checking Delivery of Materials ── */
  if (status === 'Checking of Delivery of Materials' && (isEng || isLogistics || isOpsAss)) {
    return (
      <div className="pm-phase-wrapper">
        {reorderToast && (
          <ReorderToast message={reorderToast} onDismiss={() => setReorderToast(null)} />
        )}

        {project.rejection_notes && (
          <div className="pm-card-red">
            <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM LOGISTICS</h4>
            <p className="pm-text-muted" style={{ margin: 0 }}>"{project.rejection_notes}"</p>
          </div>
        )}

        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>📦 Material Verification</h3>
          </div>

          <div className="pm-card-body">
            <p className="pm-text-muted">
              Cross-reference the physically delivered materials against the approved Final BOQ below.
            </p>

            <div className="pm-card-gray" style={{ minWidth: 0, overflow: 'hidden' }}>
              <h4 className="pm-title-md" style={{ color: 'var(--pm-red)' }}>Reference: Final BOQ</h4>
              <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <PrimaryButton
                variant="red"
                onClick={() => onAdvance('Pending DR Verification')}
              >
                Submit for DR Verification
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── 2. Pending DR Verification ── */
  if (status === 'Pending DR Verification' && isLogistics) {
    const boqItems = getBoqItemsForReorder();

    return (
      <div className="pm-phase-wrapper">
        {reorderToast && (
          <ReorderToast message={reorderToast} onDismiss={() => setReorderToast(null)} />
        )}

        {showReorderModal && (
          <ReorderModal
            boqItems={boqItems}
            onConfirm={handleReorderRequest}
            onClose={() => setShowReorderModal(false)}
            loading={reorderLoading}
          />
        )}

        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🔍 Logistics Stock Verification</h3>
          </div>

          <div className="pm-card-body">
            <div className="pm-card-gray" style={{ minWidth: 0, overflow: 'hidden' }}>
              <h4 className="pm-title-md">Final BOQ — Stock Cross-Reference</h4>
              <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
            </div>

            <div className="pm-stock-legend">
              <span className="pm-stock-legend-title">STOCK LEGEND:</span>
              {[['#10B981', 'ON STOCK'], ['#F59E0B', 'LOW STOCK'], ['#EF4444', 'NO STOCK']].map(([color, label]) => (
                <span key={label} className="pm-stock-legend-item">
                  <span className="pm-stock-legend-dot" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>

            <div className="pm-grid-2">
              <button
                onClick={() => setShowReorderModal(true)}
                className="pm-btn-outline"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ShoppingCart size={16} />
                Request Reorder
              </button>
              <PrimaryButton variant="green" onClick={() => onAdvance('Bidding of Project')}>
                ✓ Stock Verified — Proceed
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhaseMaterials;