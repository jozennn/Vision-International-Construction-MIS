import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseBilling.css';

// ─── DocumentViewer Modal (same as PhaseMobilization) ─────────────────────────
const DocumentViewer = ({ path, label, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = `/api/project-image/${path}`;
  const isPDF = path?.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px',
          width: '100%', maxWidth: '900px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', flexShrink: 0,
          borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
        }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
            📄 {label}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href={src} target="_blank" rel="noreferrer"
              style={{
                fontSize: '12px', fontWeight: 600, color: '#374151',
                textDecoration: 'none', padding: '5px 12px', borderRadius: '6px',
                border: '1px solid #d1d5db', background: '#fff',
              }}
            >⬇ Open / Download</a>
            <button onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: '4px 8px',
              }}
            >✕</button>
          </div>
        </div>
        <div style={{
          flex: 1, overflow: 'auto', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', background: '#f3f4f6', minHeight: '320px',
        }}>
          {!loaded && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#6b7280',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: '#DC2626' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Could not display inline.{' '}
                <a href={src} target="_blank" rel="noreferrer" style={{ color: '#2563EB' }}>
                  Open / Download
                </a> directly.
              </p>
            </div>
          )}
          {isPDF ? (
            <iframe src={src} title={label}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                width: '100%', height: '68vh', border: 'none', borderRadius: '6px',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          ) : (
            <img src={src} alt={label}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{
                maxWidth: '100%', maxHeight: '68vh',
                objectFit: 'contain', borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: loaded && !error ? 'block' : 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ViewDocumentButton ───────────────────────────────────────────────────────
const ViewDocumentButton = ({ label, path, icon = '📄' }) => {
  const [open, setOpen] = useState(false);
  if (!path) return null;
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
      {open && <DocumentViewer path={path} label={label} onClose={() => setOpen(false)} />}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PhaseBilling = ({ project, latestLog, onUploadAdvance, isOpsAss }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef();

  const { status } = project;
  const isFinal = status === 'Request Final Billing';

  // For final billing, only Management (isOpsAss) can upload
  if (isFinal && !isOpsAss) {
    return (
      <div className="bill-wrapper">
        <div className="bill-header">
          <div className="bill-header-inner">
            <div className="bill-header-icon">💸</div>
            <div className="bill-header-text">
              <h3 className="bill-header-title">Final Billing</h3>
              <span className="bill-header-subtitle">Awaiting Management Action</span>
            </div>
          </div>
        </div>
        <div className="bill-body">
          <div className="bill-card text-center">
            <p>Only Management can upload the final invoice and close the project.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0] ?? null);
  };

  const handleSubmit = () => {
    onUploadAdvance(
      isFinal ? 'Completed' : 'Site Inspection & Project Monitoring',
      isFinal ? 'final_invoice_document' : 'billing_invoice_document',
      uploadFile
    );
  };

  return (
    <div className="bill-wrapper">

      {/* ── Header ── */}
      <div className="bill-header">
        <div className="bill-header-inner">
          <div className="bill-header-icon">{isFinal ? '💸' : '💰'}</div>
          <div className="bill-header-text">
            <h3 className="bill-header-title">
              {isFinal ? 'Final Billing' : 'Progress Billing'}
            </h3>
            <span className="bill-header-subtitle">
              {isFinal ? 'Project Closeout · Final Invoice' : 'Accounting · Payment Release'}
            </span>
          </div>
        </div>
      </div>

      <div className="bill-body">

        {/* ── Document / Image View Section ── */}
        <div className="bill-proof-card">
          {isFinal ? (
            <>
              <div className="bill-proof-title">Required Verification Documents</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                <ViewDocumentButton label="Signed C.O.C" path={project.coc_document} icon="📜" />
                <ViewDocumentButton label="Client Walkthrough Sign-off" path={project.client_walkthrough_doc} icon="📝" />
                <ViewDocumentButton label="Internal QA Photo" path={project.qa_photo} icon="📸" />
              </div>
            </>
          ) : (
            <>
              <div className="bill-proof-title">Latest Site Photo Proof</div>
              {latestLog?.photo_path ? (
                <ViewDocumentButton label="Site Photo" path={latestLog.photo_path} icon="📸" />
              ) : (
                <div className="bill-photo-empty">
                  <p className="bill-photo-empty-text">No photo uploaded by Engineering.</p>
                </div>
              )}
              {latestLog && (
                <span className="bill-photo-date">As of: {latestLog.log_date}</span>
              )}
            </>
          )}
        </div>

        {/* ── Upload Section ── */}
        <div className="bill-upload-section">
          <h4 className="bill-upload-title">
            {isFinal
              ? 'Upload Final Official Invoice / Receipt'
              : 'Upload Official Subcontractor Invoice'}
          </h4>
          <p className="bill-upload-desc">
            {isFinal
              ? 'All QA documents have been verified. Upload the final financial proof before permanently closing this project.'
              : 'You must attach the invoice document before authorizing the release of this payment.'}
          </p>

          <label className={`bill-upload-zone ${uploadFile ? 'has-file' : ''}`}>
            <span style={{ fontSize: 18 }}>{uploadFile ? '✅' : '📎'}</span>
            <span>{uploadFile ? uploadFile.name : 'Click to choose file — PDF or Image'}</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="bill-file-hidden"
            />
          </label>

          <PrimaryButton disabled={!uploadFile} variant="red" onClick={handleSubmit}>
            {uploadFile
              ? (isFinal
                  ? '✓ Process Final Bill & Close Project'
                  : '✓ Process Payment & Return to Monitoring')
              : 'Upload Invoice to Proceed'}
          </PrimaryButton>
        </div>

      </div>
    </div>
  );
};

export default PhaseBilling;