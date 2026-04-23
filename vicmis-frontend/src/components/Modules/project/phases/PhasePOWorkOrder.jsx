import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

/* ─────────────────────────────────────────────────────────────
   DocumentViewer — fetches via /api/project-image/ proxy
   (same approach used by PhaseBOQReview's floor plan)
───────────────────────────────────────────────────────────── */
const DocumentViewer = ({ path, label, onClose }) => {
  const [src,     setSrc]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  React.useEffect(() => {
    if (!path) return;
    setLoading(true);
    setError(null);

    fetch(`/api/project-image/${encodeURIComponent(path)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data?.base64) {
          setSrc(data.base64);
        } else {
          throw new Error('No base64 data returned');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  const isPDF = src?.startsWith('data:application/pdf');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px',
          width: '100%', maxWidth: '860px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
        }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
            📄 {label}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {src && (
              <a
                href={src}
                download={label}
                style={{
                  fontSize: '12px', fontWeight: 600,
                  color: '#374151', textDecoration: 'none',
                  padding: '5px 12px', borderRadius: '6px',
                  border: '1px solid #d1d5db', background: '#fff',
                }}
              >
                ⬇ Download
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: '#6b7280', lineHeight: 1,
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{
          flex: 1, overflow: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', background: '#f3f4f6', minHeight: '300px',
        }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Loading document…</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', color: '#DC2626' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Failed to load: {error}</p>
            </div>
          )}

          {src && !loading && !error && (
            isPDF ? (
              <iframe
                src={src}
                title={label}
                style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '6px' }}
              />
            ) : (
              <img
                src={src}
                alt={label}
                style={{
                  maxWidth: '100%', maxHeight: '65vh',
                  objectFit: 'contain', borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ViewDocumentButton — replaces renderDocumentLink for PO/WO
───────────────────────────────────────────────────────────── */
const ViewDocumentButton = ({ label, path, icon = '📄' }) => {
  const [open, setOpen] = useState(false);

  if (!path) return (
    <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
      No document uploaded.
    </p>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', borderRadius: '7px', cursor: 'pointer',
          background: '#EFF6FF', border: '1.5px solid #BFDBFE',
          color: '#1D4ED8', fontWeight: 600, fontSize: '13px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
        onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
      >
        {icon} View {label}
      </button>

      {open && (
        <DocumentViewer
          path={path}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
const PhasePOWorkOrder = ({
  project,
  isSales,
  isSalesHead,
  isOpsAss,
  onUploadAdvance,
  onAdvance,
  onReject,
  renderDocumentLink,   // kept for any other doc links you may add
}) => {
  const [poFile,        setPoFile]        = useState(null);
  const [workOrderFile, setWorkOrderFile] = useState(null);
  const [uploading,     setUploading]     = useState(false);

  const poInputRef        = useRef();
  const workOrderInputRef = useRef();

  const { status } = project;

  const hasExistingPO        = !!project.po_document;
  const hasExistingWorkOrder = !!project.work_order_document;

  const poReady        = !!poFile        || hasExistingPO;
  const workOrderReady = !!workOrderFile || hasExistingWorkOrder;
  const canSubmit      = poReady && workOrderReady && !uploading;

  const handleSubmitBoth = async () => {
    if (!canSubmit) return;
    setUploading(true);
    try {
      await onUploadAdvance(
        'Pending Work Order Verification',
        poFile ? 'po_document' : null,
        poFile,
        {},
        workOrderFile,
      );
    } finally {
      setUploading(false);
    }
  };

  /* ── Sales: upload phase ──────────────────────────────────── */
  if (status === 'P.O & Work Order' && (isSales || isSalesHead || isOpsAss)) {
    return (
      <div>
        {project.rejection_notes && (
          <div className="pm-card-red">
            <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
            <p className="pm-text-muted" style={{ margin: 0 }}>"{project.rejection_notes}"</p>
          </div>
        )}

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

          <div className="pm-grid-2" style={{ gap: '24px', marginTop: '20px' }}>

            {/* P.O Uploader */}
            <div>
              <label className="pm-label">
                Purchase Order (P.O)
                {hasExistingPO && !poFile && (
                  <span style={{ marginLeft: '8px', color: 'var(--color-text-success)', fontSize: '12px' }}>
                    ✓ Already uploaded
                  </span>
                )}
              </label>

              {/* ← Use ViewDocumentButton instead of renderDocumentLink */}
              {hasExistingPO && (
                <div style={{ marginBottom: '10px' }}>
                  <ViewDocumentButton
                    label="Purchase Order"
                    path={project.po_document}
                    icon="📄"
                  />
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

            {/* Work Order Uploader */}
            <div>
              <label className="pm-label">
                Work Order
                {hasExistingWorkOrder && !workOrderFile && (
                  <span style={{ marginLeft: '8px', color: 'var(--color-text-success)', fontSize: '12px' }}>
                    ✓ Already uploaded
                  </span>
                )}
              </label>

              {/* ← Use ViewDocumentButton instead of renderDocumentLink */}
              {hasExistingWorkOrder && (
                <div style={{ marginBottom: '10px' }}>
                  <ViewDocumentButton
                    label="Work Order"
                    path={project.work_order_document}
                    icon="📋"
                  />
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

  /* ── Sales Head: verification phase ──────────────────────── */
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
            <div style={{
              padding: '16px',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: '8px',
              background: 'var(--color-background-secondary)',
            }}>
              <label className="pm-label" style={{ marginBottom: '10px', display: 'block' }}>
                📄 Purchase Order (P.O)
              </label>
              <ViewDocumentButton
                label="Purchase Order"
                path={project.po_document}
                icon="📄"
              />
            </div>

            {/* Work Order document */}
            <div style={{
              padding: '16px',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: '8px',
              background: 'var(--color-background-secondary)',
            }}>
              <label className="pm-label" style={{ marginBottom: '10px', display: 'block' }}>
                📋 Work Order
              </label>
              <ViewDocumentButton
                label="Work Order"
                path={project.work_order_document}
                icon="📋"
              />
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
            <PrimaryButton
              variant="green"
              onClick={() => onAdvance('Initial Site Inspection')}
            >
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