import React, { useState, useRef, useEffect } from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseMaterials.css';
import api from '@/api/axios';

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
    return (
      <div className="pm-phase-wrapper">
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
              <button onClick={() => onReject('Checking of Delivery of Materials')} className="pm-btn-outline">
                ❌ Reject — Insufficient Stock
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