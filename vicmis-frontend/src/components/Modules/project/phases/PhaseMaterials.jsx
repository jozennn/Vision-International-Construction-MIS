import React, { useState, useRef, useEffect } from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseMaterials.css';
import api from '@/api/axios';
import warehouseInventoryService from '@/api/warehouseInventoryService';
import { X, Loader2, RotateCcw, PackageCheck, AlertTriangle } from 'lucide-react';

// Reorder Modal Component
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

  return (
    <div className="pm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal pm-reorder-modal">
        <div className="pm-modal-header">
          <div className="pm-modal-title-wrap">
            <AlertTriangle size={20} className="pm-modal-icon-warning" />
            <h3 className="pm-modal-title">Request Reorder</h3>
          </div>
          <button className="pm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-form-group">
            <label>Select Item to Reorder <span className="pm-required">*</span></label>
            <select 
              className="pm-select"
              value={selectedItem?.code || ''}
              onChange={(e) => {
                const item = boqItems.find(i => i.code === e.target.value);
                setSelectedItem(item);
              }}
            >
              <option value="">— Select Item —</option>
              {boqItems.map((item, idx) => (
                <option key={idx} value={item.code}>
                  {item.category} - {item.code} (Qty: {item.qty} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <>
              <div className="pm-reorder-details">
                <div className="pm-detail-row">
                  <span className="pm-detail-label">Category:</span>
                  <span className="pm-detail-value">{selectedItem.category}</span>
                </div>
                <div className="pm-detail-row">
                  <span className="pm-detail-label">Code:</span>
                  <span className="pm-detail-value">{selectedItem.code}</span>
                </div>
                <div className="pm-detail-row">
                  <span className="pm-detail-label">Required Qty:</span>
                  <span className="pm-detail-value">{selectedItem.qty} {selectedItem.unit}</span>
                </div>
                <div className="pm-detail-row">
                  <span className="pm-detail-label">Unit Cost:</span>
                  <span className="pm-detail-value">₱{selectedItem.unitCost?.toLocaleString() || '0.00'}</span>
                </div>
              </div>

              <div className="pm-form-group">
                <label>Quantity Needed <span className="pm-required">*</span></label>
                <div className="pm-input-with-unit">
                  <input
                    type="number"
                    min="1"
                    className="pm-input"
                    placeholder="Enter quantity"
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(e.target.value)}
                  />
                  <span className="pm-unit-label">{selectedItem.unit}</span>
                </div>
                {quantityNeeded && selectedItem.unitCost && (
                  <p className="pm-hint-text" style={{ color: '#059669', marginTop: '6px' }}>
                    Estimated cost: ₱{(quantityNeeded * selectedItem.unitCost).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="pm-form-group">
                <label>Notes for Procurement <span className="pm-optional">(optional)</span></label>
                <textarea
                  className="pm-textarea"
                  rows={3}
                  placeholder="e.g. Urgent - needed for project timeline..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="pm-modal-footer">
          <button className="pm-btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="pm-btn pm-btn-warning"
            onClick={handleConfirm}
            disabled={loading || !selectedItem || !quantityNeeded}
          >
            {loading ? (
              <><Loader2 size={16} className="pm-spinner" /> Sending Request...</>
            ) : (
              <><RotateCcw size={16} /> Send Reorder Request</>
            )}
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
    <div className="pm-toast pm-toast-success">
      <PackageCheck size={16} />
      <span>{message}</span>
      <button className="pm-toast-close" onClick={onDismiss}><X size={14} /></button>
    </div>
  );
};

const PhaseMaterials = ({ project, boqData, isEng, isLogistics, isEngHead, isOpsAss, onAdvance, onUploadAdvance, onReject, renderDocumentLink, refreshProject}) => {
  // Initialize award details from saved project data
  const [awardDetails, setAwardDetails] = useState({
    name: project.subcontractor_name || '',
    amount: project.contract_amount || ''
  });

  const [biddingFile, setBiddingFile] = useState(null);
  const [awardFile, setAwardFile] = useState(null);
  
  const [uploadingBidding, setUploadingBidding] = useState(false);
  const [uploadingAward, setUploadingAward] = useState(false);

  // Local upload success flags — so button enables immediately after upload
  const [biddingUploaded, setBiddingUploaded] = useState(false);
  const [awardUploaded, setAwardUploaded] = useState(false);

  const biddingInputRef = useRef();
  const awardInputRef = useRef();

  // Reorder state
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderToast, setReorderToast] = useState(null);

  const { status } = project;

  // Sync award details from project prop when it changes
  useEffect(() => {
    if (project.subcontractor_name || project.contract_amount) {
      setAwardDetails({
        name: project.subcontractor_name || '',
        amount: project.contract_amount || ''
      });
    }
  }, [project.subcontractor_name, project.contract_amount]);

  // Upload file immediately when selected (without changing status)
  const uploadFileImmediately = async (file, fileKey) => {
    if (!file) return false;

    const setUploading = 
      fileKey === 'bidding_document' ? setUploadingBidding :
      setUploadingAward;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('status', project.status);
      fd.append(fileKey, file);
      fd.append('_method', 'PATCH');
      
      await api.post(`/projects/${project.id}/status`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return true;
    } catch (err) {
      alert(`File upload failed: ${err.response?.data?.message ?? err.message}`);
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Handle reorder request using warehouseInventoryService
  const handleReorderRequest = async ({ item, quantity_needed, notes }) => {
    setReorderLoading(true);
    try {
      await warehouseInventoryService.requestReorder({
        project_id: project.id,
        project_name: project.project_name,
        product_category: item.category,
        product_code: item.code,
        quantity_needed: quantity_needed,
        unit: item.unit,
        unit_cost: item.unitCost,
        total_cost: quantity_needed * item.unitCost,
        notes: notes,
        requested_by: 'Logistics',
        status: project.status
      });
      
      setShowReorderModal(false);
      setReorderToast(`Reorder request sent for ${item.code} (${quantity_needed} ${item.unit})!`);
    } catch (err) {
      alert(`Failed to send reorder request: ${err.response?.data?.message || err.message}`);
    } finally {
      setReorderLoading(false);
    }
  };

  // Extract BOQ items for reorder modal
  const getBoqItemsForReorder = () => {
    if (!boqData?.finalBOQ) return [];
    
    return boqData.finalBOQ.map(item => ({
      category: item.category || item.CATEGORY || 'N/A',
      code: item.code || item.CODE || 'N/A',
      qty: item.qty || item.QTY || 0,
      unit: item.unit || item.UNIT || 'Pcs',
      unitCost: item.unitCost || item['UNIT COST (₱)'] || 0,
      stock: item.stock || item.STOCK || 'ON STOCK'
    }));
  };

  // Validation for award section
  const isAwardValid =
    (project.subcontractor_agreement_document || awardUploaded) &&
    awardDetails.name.trim() !== '' &&
    awardDetails.amount.trim() !== '';

  const resetOthers = (except) => {
    if (except !== 'bidding') {
      if (biddingInputRef.current) biddingInputRef.current.value = '';
      setBiddingFile(null);
    }
    if (except !== 'award') {
      if (awardInputRef.current) awardInputRef.current.value = '';
      setAwardFile(null);
    }
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
                className="pm-btn-outline pm-btn-warning-outline"
              >
                <RotateCcw size={16} style={{ marginRight: '6px' }} />
                Reorder Supplies
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

  /* ── 3. Bidding of Project ── */
  if (status === 'Bidding of Project' && isOpsAss) {
    return (
      <div className="pm-phase-wrapper">
        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>⚖️ Procurement &amp; Bidding</h3>
          </div>

          <div className="pm-card-body">
            <div className="pm-card-gray" style={{ minWidth: 0, overflow: 'hidden' }}>
              <h4 className="pm-title-md">Internal Budget Reference</h4>
              <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                  onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
            </div>

            <div className="pm-card-cream">
              <h4 className="pm-title-lg">Upload Winning Subcontractor Bid</h4>

              {(project.bidding_document || biddingUploaded) ? (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#E8F5E9', borderLeft: '3px solid #4CAF50' }}>
                  <strong style={{ color: '#2E7D32' }}>✅ File uploaded:</strong>
                  {project.bidding_document ? (
                    <div style={{ marginTop: '8px' }}>
                      {renderDocumentLink('Winning Bid', project.bidding_document)}
                    </div>
                  ) : (
                    <span style={{ marginLeft: '0.5rem', color: '#2E7D32' }}>File uploaded successfully</span>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    ref={biddingInputRef}
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      setBiddingFile(file);
                      resetOthers('bidding');
                      if (file) {
                        const success = await uploadFileImmediately(file, 'bidding_document');
                        if (success) {
                          setBiddingUploaded(true);
                          await refreshProject?.();
                        }
                      }
                    }}
                    className="pm-file-input"
                    disabled={uploadingBidding}
                  />

                  {uploadingBidding && <p style={{ color: '#F59E0B', margin: '0.5rem 0' }}>⏳ Uploading file...</p>}
                </>
              )}

              <PrimaryButton
                variant="red"
                disabled={!project.bidding_document && !biddingUploaded}
                onClick={() => onAdvance('Awarding of Project')}
              >
                Proceed to Awarding
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── 4. Awarding of Project ── */
  if (status === 'Awarding of Project' && isOpsAss) {
    return (
      <div className="pm-phase-wrapper">
        <div className="pm-card">
          <div className="pm-card-navy">
            <div className="pm-award-header-inner">
              <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🤝 Contract Formalization</h3>
              <div className="pm-award-step-badge">Step 3 of 3</div>
            </div>
          </div>

          <div className="pm-card-body">
            <div className="pm-award-grid">
              <div className="pm-award-left">
                <div className="pm-award-section-label">
                  <span className="pm-award-step-dot pm-dot-blue" /> Approved Bid
                </div>
                <div className="pm-award-doc-block">
                  {project.bidding_document && renderDocumentLink('Winning Subcontractor Quote', project.bidding_document)}
                </div>
              </div>

              <div className="pm-award-right">
                <div className="pm-award-section-label">
                  <span className="pm-award-step-dot pm-dot-red" /> Award Summary
                </div>

                {(project.subcontractor_name || project.contract_amount || project.subcontractor_agreement_document) && (
                  <div style={{ 
                    padding: '0.5rem', 
                    marginBottom: '1rem', 
                    background: '#E8F5E9', 
                    borderLeft: '3px solid #4CAF50',
                    fontSize: '0.85rem',
                    color: '#2E7D32'
                  }}>
                    ✅ <strong>Previously saved data loaded</strong>
                  </div>
                )}
                
                <div className="pm-award-form-block">
                  <div className="pm-award-form-field">
                    <label className="pm-label">Subcontractor Name *</label>
                    <input
                      type="text"
                      value={awardDetails.name}
                      onChange={e => setAwardDetails({ ...awardDetails, name: e.target.value })}
                      onBlur={async () => {
                        if (awardDetails.name.trim()) {
                          try {
                            await api.patch(`/projects/${project.id}/status`, {
                              status: project.status,
                              subcontractor_name: awardDetails.name
                            });
                          } catch (err) {
                            console.error('Failed to save subcontractor name:', err);
                          }
                        }
                      }}
                      className="pm-input"
                      placeholder="e.g. ABC Construction"
                    />
                  </div>

                  <div className="pm-award-form-field">
                    <label className="pm-label">Awarded Amount (₱) *</label>
                    <input
                      type="number"
                      value={awardDetails.amount}
                      onChange={e => setAwardDetails({ ...awardDetails, amount: e.target.value })}
                      onBlur={async () => {
                        if (awardDetails.amount.trim()) {
                          try {
                            await api.patch(`/projects/${project.id}/status`, {
                              status: project.status,
                              contract_amount: awardDetails.amount
                            });
                          } catch (err) {
                            console.error('Failed to save contract amount:', err);
                          }
                        }
                      }}
                      className="pm-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="pm-award-upload-zone">
                    <label className="pm-upload-label">
                      <span className="pm-upload-text">
                        {(project.subcontractor_agreement_document || awardUploaded)
                          ? '✅ Agreement Uploaded (click to replace)'
                          : uploadingAward
                            ? '⏳ Uploading...'
                            : 'Upload Signed Agreement'
                        }
                      </span>
                      <input
                        type="file"
                        ref={awardInputRef}
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          setAwardFile(file);
                          resetOthers('award');
                          if (file) {
                            const success = await uploadFileImmediately(file, 'subcontractor_agreement_document');
                            if (success) {
                              setAwardUploaded(true);
                              await refreshProject?.();
                            }
                          }
                        }}
                        style={{ display: 'none' }}
                        disabled={uploadingAward}
                      />
                    </label>
                  </div>

                  {(project.subcontractor_agreement_document || awardUploaded) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      {project.subcontractor_agreement_document ? (
                        renderDocumentLink('Current Agreement', project.subcontractor_agreement_document)
                      ) : (
                        <span style={{ color: '#2E7D32' }}>✅ Agreement uploaded successfully</span>
                      )}
                    </div>
                  )}

                  <PrimaryButton
                    disabled={!isAwardValid}
                    variant="navy"
                    style={{ width: '100%' }}
                    onClick={() => onAdvance('Contract Signing for Installer')}
                  >
                    🏆 Award Project
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhaseMaterials;