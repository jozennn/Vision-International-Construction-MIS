import React, { useState, useRef } from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseMaterials.css';

const PhaseMaterials = ({ project, boqData, isEng, isLogistics, isEngHead, isOpsAss, onAdvance, onUploadAdvance, onReject, renderDocumentLink }) => {
  // ── Separate file state + ref per phase so they never bleed into each other ──
  const [drFile,        setDrFile]        = useState(null);
  const [biddingFile,   setBiddingFile]   = useState(null);
  const [awardFile,     setAwardFile]     = useState(null);
  const [awardDetails,  setAwardDetails]  = useState({ name: '', amount: '' });

  const drInputRef      = useRef();
  const biddingInputRef = useRef();
  const awardInputRef   = useRef();

  const { status } = project;
  const isAwardValid = awardFile && awardDetails.name.trim() !== '' && awardDetails.amount.trim() !== '';

  // Helper — resets all OTHER file inputs when one is picked
  const resetOthers = (except) => {
    if (except !== 'dr'      && drInputRef.current)      { drInputRef.current.value      = ''; setDrFile(null); }
    if (except !== 'bidding' && biddingInputRef.current) { biddingInputRef.current.value = ''; setBiddingFile(null); }
    if (except !== 'award'   && awardInputRef.current)   { awardInputRef.current.value   = ''; setAwardFile(null); }
  };

  /* ── 1. Checking Delivery of Materials ── */
  if (status === 'Checking of Delivery of Materials' && (isEng || isLogistics || isOpsAss)) {
    return (
      <div className="pm-phase-wrapper">

        {project.rejection_notes && (
          <div className="pm-card-red">
            <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM HEAD</h4>
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

            <div className="pm-card-gray">
              <h4 className="pm-title-md" style={{ color: 'var(--pm-red)' }}>Reference: Final BOQ</h4>
              <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
            </div>

            <div className="pm-card-cream">
              <h4 className="pm-title-lg">Upload Delivery Receipt (DR)</h4>
              <input
                type="file"
                ref={drInputRef}
                accept="image/*,.pdf"
                onChange={e => { setDrFile(e.target.files[0]); resetOthers('dr'); }}
                className="pm-file-input"
              />
              <PrimaryButton
                variant="red"
                disabled={!drFile}
                onClick={() => onUploadAdvance('Pending DR Verification', 'delivery_receipt_document', drFile)}
              >
                Upload DR &amp; Submit to Head
              </PrimaryButton>
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ── 2. Pending DR Verification (Engineering Head) ── */
  if (status === 'Pending DR Verification' && isEngHead) {
    return (
      <div className="pm-phase-wrapper">

        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🔍 Verify Delivery Receipt</h3>
          </div>

          <div className="pm-card-body">
            <p className="pm-text-muted">Review the uploaded Delivery Receipt against the Final BOQ.</p>

            <div className="pm-card-gray">
              <h4 className="pm-title-md">Uploaded Document</h4>
              {renderDocumentLink('Delivery Receipt (DR)', project.delivery_receipt_document)}
            </div>

            <div className="pm-card-gray">
              <h4 className="pm-title-md">Reference: Final BOQ</h4>
              <div style={{ opacity: 0.9, pointerEvents: 'none' }}>
                <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                  onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
              </div>
            </div>

            <div className="pm-grid-2">
              <button
                onClick={() => onReject('Checking of Delivery of Materials')}
                className="pm-btn-outline">
                ❌ Reject &amp; Return to Staff
              </button>
              <PrimaryButton variant="green" onClick={() => onAdvance('Bidding of Project')}>
                ✓ Approve DR &amp; Proceed
              </PrimaryButton>
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ── 3. Bidding of Project (Management) ── */
  if (status === 'Bidding of Project' && isOpsAss) {
    return (
      <div className="pm-phase-wrapper">

        <div className="pm-card">
          <div className="pm-card-navy">
            <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>⚖️ Procurement &amp; Bidding</h3>
          </div>

          <div className="pm-card-body">
            <div className="pm-card-gray">
              <h4 className="pm-title-md">Internal Budget Reference</h4>
              <div style={{ opacity: 0.9, pointerEvents: 'none' }}>
                <BoqTable type="finalBOQ" boqData={boqData} readOnly={true}
                  onAdd={() => {}} onRemove={() => {}} onChange={() => {}} />
              </div>
            </div>

            <div className="pm-card-cream">
              <h4 className="pm-title-lg">Upload Winning Subcontractor Bid</h4>
              <input
                type="file"
                ref={biddingInputRef}
                accept="image/*,.pdf"
                onChange={e => { setBiddingFile(e.target.files[0]); resetOthers('bidding'); }}
                className="pm-file-input"
              />
              <PrimaryButton
                variant="red"
                disabled={!biddingFile}
                onClick={() => onUploadAdvance('Awarding of Project', 'bidding_document', biddingFile)}
              >
                Upload Winning Bid &amp; Proceed
              </PrimaryButton>
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ── 4. Awarding of Project (Management) ── */
  if (status === 'Awarding of Project' && isOpsAss) {
    return (
      <div className="pm-phase-wrapper">

        <div className="pm-card">
          <div className="pm-card-navy">
            <div className="pm-award-header-inner">
              <div>
                <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🤝 Contract Formalization</h3>
                <p className="pm-award-subtitle">Finalize and award the project to the winning subcontractor</p>
              </div>
              <div className="pm-award-step-badge">Step 3 of 3</div>
            </div>
          </div>

          <div className="pm-card-body">
            <div className="pm-award-grid">

              {/* LEFT — Approved bid doc + checklist */}
              <div className="pm-award-left">
                <div className="pm-award-section-label">
                  <span className="pm-award-step-dot pm-dot-blue" />
                  Approved Bid Document
                </div>
                <div className="pm-award-doc-block">
                  {renderDocumentLink('Winning Subcontractor Quote', project.bidding_document)}
                  <p className="pm-text-muted" style={{ marginTop: 12 }}>
                    Review the winning bid before proceeding with contract formalization.
                  </p>
                </div>

                <div className="pm-award-checklist">
                  <div className={`pm-check-item ${awardDetails.name.trim() ? 'pm-check-done' : ''}`}>
                    <span className="pm-check-icon">{awardDetails.name.trim() ? '✓' : '○'}</span>
                    Subcontractor name filled
                  </div>
                  <div className={`pm-check-item ${awardDetails.amount.trim() ? 'pm-check-done' : ''}`}>
                    <span className="pm-check-icon">{awardDetails.amount.trim() ? '✓' : '○'}</span>
                    Awarded amount entered
                  </div>
                  <div className={`pm-check-item ${awardFile ? 'pm-check-done' : ''}`}>
                    <span className="pm-check-icon">{awardFile ? '✓' : '○'}</span>
                    Signed agreement uploaded
                  </div>
                </div>
              </div>

              {/* RIGHT — Award form */}
              <div className="pm-award-right">
                <div className="pm-award-section-label">
                  <span className="pm-award-step-dot pm-dot-red" />
                  Award Summary
                </div>

                <div className="pm-award-form-block">
                  <div className="pm-award-form-row">
                    <div className="pm-award-form-field">
                      <label className="pm-label">Subcontractor Name <span style={{ color: 'var(--pm-red)' }}>*</span></label>
                      <input
                        type="text"
                        value={awardDetails.name}
                        onChange={e => setAwardDetails({ ...awardDetails, name: e.target.value })}
                        className="pm-input"
                        placeholder="e.g. ABC Construction Corp."
                      />
                    </div>
                    <div className="pm-award-form-field">
                      <label className="pm-label">Final Awarded Amount (₱) <span style={{ color: 'var(--pm-red)' }}>*</span></label>
                      <input
                        type="number"
                        value={awardDetails.amount}
                        onChange={e => setAwardDetails({ ...awardDetails, amount: e.target.value })}
                        className="pm-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="pm-award-upload-zone">
                    <label className="pm-label" style={{ marginBottom: 10 }}>
                      Upload Signed Agreement <span style={{ color: 'var(--pm-red)' }}>*</span>
                    </label>
                    <label className="pm-upload-label">
                      <span className="pm-upload-icon">📎</span>
                      <span className="pm-upload-text">
                        {awardFile ? awardFile.name : 'Click to choose file — PDF or Image'}
                      </span>
                      <input
                        type="file"
                        ref={awardInputRef}
                        accept="image/*,.pdf"
                        onChange={e => { setAwardFile(e.target.files[0]); resetOthers('award'); }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <PrimaryButton
                    disabled={!isAwardValid}
                    variant="navy"
                    onClick={() => onUploadAdvance(
                      'Contract Signing for Installer',
                      'subcontractor_agreement_document',
                      awardFile,
                      awardDetails
                    )}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    {isAwardValid ? '🏆 Upload Agreement & Award Project' : 'Complete all fields to proceed'}
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