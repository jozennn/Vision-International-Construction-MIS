import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhasePOWorkOrder = ({
  project,
  isSales,
  isSalesHead,
  isOpsAss,
  onUploadAdvance,
  onAdvance,
  onReject,
  renderDocumentLink,
}) => {
  const [poFile,        setPoFile]        = useState(null);
  const [workOrderFile, setWorkOrderFile] = useState(null);
  const [uploading,     setUploading]     = useState(false);

  const poInputRef        = useRef();
  const workOrderInputRef = useRef();

  const { status } = project;

  const hasExistingPO        = !!project.po_document;
  const hasExistingWorkOrder = !!project.work_order_document;

  // Both files are satisfied if either a new file is selected OR one already exists
  const poReady        = !!poFile        || hasExistingPO;
  const workOrderReady = !!workOrderFile || hasExistingWorkOrder;
  const canSubmit      = poReady && workOrderReady && !uploading;

  // ── Upload helper: handles uploading both files together ──────────────────
  const handleSubmitBoth = async () => {
    if (!canSubmit) return;
    setUploading(true);
    try {
      // Build a FormData with both files if newly selected
      const fd = new FormData();
      fd.append('status', 'Pending Work Order Verification');
      if (poFile)        fd.append('po_document',        poFile);
      if (workOrderFile) fd.append('work_order_document', workOrderFile);
      fd.append('_method', 'PATCH');

      // Use the raw uploadAndAdvance logic via onUploadAdvance
      // We pass null for fileKey/file since we're handling FormData manually,
      // so call it with the first file as primary and piggyback the second.
      // If your onUploadAdvance supports multiple files via FormData, use it directly.
      // Otherwise fall back to the pattern below which mirrors useProjectActions exactly.
      await onUploadAdvance('Pending Work Order Verification', poFile ? 'po_document' : null, poFile, {}, workOrderFile);
    } finally {
      setUploading(false);
    }
  };

  // ── Sales: P.O & Work Order upload phase ─────────────────────────────────
  if (status === 'P.O & Work Order' && (isSales || isSalesHead || isOpsAss)) {
    return (
      <div>

        {/* Rejection banner */}
        {project.rejection_notes && (
          <div className="pm-card-red">
            <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
            <p className="pm-text-muted" style={{ margin: 0 }}>"{project.rejection_notes}"</p>
          </div>
        )}

        {/* Step header */}
        <div className="pm-step-header">
          <span className="pm-step-header-icon">📋</span>
          <div>
            <span className="pm-step-header-eyebrow">Step 5</span>
            <h3 className="pm-step-header-title">Purchase Order & Work Order Preparation</h3>
          </div>
        </div>

        <div className="pm-card-below-header">

          <div className="pm-info-blurb">
            <span className="pm-info-blurb-icon">ℹ️</span>
            <p>
              Upload both the <strong>Purchase Order (P.O)</strong> and the{' '}
              <strong>Work Order</strong> documents. Both are required before submitting
              to the Sales Head for verification.
            </p>
          </div>

          {/* Two-column upload layout */}
          <div className="pm-grid-2" style={{ gap: '24px', marginTop: '20px' }}>

            {/* ── P.O Uploader ── */}
            <div>
              <label className="pm-label">
                Purchase Order (P.O)
                {hasExistingPO && !poFile && (
                  <span style={{ marginLeft: '8px', color: 'var(--color-text-success)', fontSize: '12px' }}>
                    ✓ Already uploaded
                  </span>
                )}
              </label>

              {/* Show existing file link if one is already saved */}
              {hasExistingPO && (
                <div style={{ marginBottom: '8px' }}>
                  {renderDocumentLink('View Current P.O', project.po_document)}
                </div>
              )}

              <label className={`pm-upload-zone ${poFile ? 'has-file' : ''}`}>
                <span className="pm-upload-zone-icon">{poFile ? '✅' : '📄'}</span>
                <span className="pm-upload-zone-name">
                  {poFile
                    ? poFile.name
                    : hasExistingPO
                      ? 'Click to replace P.O file'
                      : 'Click to choose P.O file or drag & drop'}
                </span>
                <span className="pm-upload-zone-hint">PDF, JPG, PNG accepted</span>
                <input
                  type="file"
                  ref={poInputRef}
                  accept="image/*,.pdf"
                  onChange={e => setPoFile(e.target.files[0] || null)}
                  style={{ display: 'none' }}
                />
              </label>

              {poFile && (
                <button
                  className="pm-btn-link"
                  style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-text-danger)' }}
                  onClick={() => { setPoFile(null); if (poInputRef.current) poInputRef.current.value = ''; }}
                >
                  ✕ Remove
                </button>
              )}
            </div>

            {/* ── Work Order Uploader ── */}
            <div>
              <label className="pm-label">
                Work Order
                {hasExistingWorkOrder && !workOrderFile && (
                  <span style={{ marginLeft: '8px', color: 'var(--color-text-success)', fontSize: '12px' }}>
                    ✓ Already uploaded
                  </span>
                )}
              </label>

              {/* Show existing file link if one is already saved */}
              {hasExistingWorkOrder && (
                <div style={{ marginBottom: '8px' }}>
                  {renderDocumentLink('View Current Work Order', project.work_order_document)}
                </div>
              )}

              <label className={`pm-upload-zone ${workOrderFile ? 'has-file' : ''}`}>
                <span className="pm-upload-zone-icon">{workOrderFile ? '✅' : '📋'}</span>
                <span className="pm-upload-zone-name">
                  {workOrderFile
                    ? workOrderFile.name
                    : hasExistingWorkOrder
                      ? 'Click to replace Work Order file'
                      : 'Click to choose Work Order file or drag & drop'}
                </span>
                <span className="pm-upload-zone-hint">PDF, JPG, PNG accepted</span>
                <input
                  type="file"
                  ref={workOrderInputRef}
                  accept="image/*,.pdf"
                  onChange={e => setWorkOrderFile(e.target.files[0] || null)}
                  style={{ display: 'none' }}
                />
              </label>

              {workOrderFile && (
                <button
                  className="pm-btn-link"
                  style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-text-danger)' }}
                  onClick={() => { setWorkOrderFile(null); if (workOrderInputRef.current) workOrderInputRef.current.value = ''; }}
                >
                  ✕ Remove
                </button>
              )}
            </div>

          </div>

          {/* Validation hint */}
          {(!poReady || !workOrderReady) && (
            <div className="pm-info-blurb" style={{ marginTop: '16px', borderColor: 'var(--color-border-warning)' }}>
              <span className="pm-info-blurb-icon">⚠️</span>
              <p style={{ color: 'var(--color-text-warning)', margin: 0 }}>
                {!poReady && !workOrderReady
                  ? 'Both the P.O and Work Order documents are required.'
                  : !poReady
                    ? 'Please upload the Purchase Order document.'
                    : 'Please upload the Work Order document.'}
              </p>
            </div>
          )}

          <hr className="pm-divider-dashed" style={{ marginTop: '24px' }} />

          <PrimaryButton
            onClick={handleSubmitBoth}
            variant="red"
            disabled={!canSubmit}
            style={{ marginTop: '8px' }}
          >
            {uploading ? '⏳ Uploading…' : 'Submit P.O & Work Order for Verification →'}
          </PrimaryButton>

        </div>
      </div>
    );
  }

  // ── Sales Head: verification phase ───────────────────────────────────────
  if (status === 'Pending Work Order Verification' && (isSalesHead || isOpsAss)) {
    return (
      <div>
        <div className="pm-step-header">
          <span className="pm-step-header-icon">🔍</span>
          <div>
            <span className="pm-step-header-eyebrow">Review</span>
            <h3 className="pm-step-header-title">P.O & Work Order Verification</h3>
          </div>
        </div>

        <div className="pm-card-below-header">
          <p className="pm-text-muted" style={{ marginBottom: '20px' }}>
            Review both documents carefully before approving or returning to Sales for corrections.
          </p>

          <div className="pm-grid-2" style={{ gap: '24px', marginBottom: '24px' }}>

            {/* P.O document */}
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '8px',
                background: 'var(--color-background-secondary)',
              }}
            >
              <label className="pm-label" style={{ marginBottom: '8px', display: 'block' }}>
                📄 Purchase Order (P.O)
              </label>
              {project.po_document
                ? renderDocumentLink('View P.O Document', project.po_document)
                : <p className="pm-text-muted" style={{ margin: 0, fontSize: '13px' }}>No P.O document uploaded.</p>
              }
            </div>

            {/* Work Order document */}
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '8px',
                background: 'var(--color-background-secondary)',
              }}
            >
              <label className="pm-label" style={{ marginBottom: '8px', display: 'block' }}>
                📋 Work Order
              </label>
              {project.work_order_document
                ? renderDocumentLink('View Work Order Document', project.work_order_document)
                : <p className="pm-text-muted" style={{ margin: 0, fontSize: '13px' }}>No Work Order document uploaded.</p>
              }
            </div>

          </div>

          <div className="pm-verdict-strip">
            <span className="pm-verdict-strip-icon">⚖️</span>
            <p>
              <strong>Approve</strong> to forward to Engineering for site inspection, or{' '}
              <strong>Reject</strong> to return to Sales staff for corrections.
            </p>
          </div>

          <div className="pm-grid-2" style={{ marginTop: '16px' }}>
            <button
              onClick={() => onReject('P.O & Work Order')}
              className="pm-btn pm-btn-outline pm-btn-outline-red"
            >
              ❌ Reject & Return to Sales
            </button>
            <PrimaryButton variant="green" onClick={() => onApprovePO()}>
              ✓ Approve & Forward to Engineering
            </PrimaryButton>
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default PhasePOWorkOrder;