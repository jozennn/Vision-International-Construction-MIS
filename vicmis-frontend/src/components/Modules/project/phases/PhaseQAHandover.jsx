import React, { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

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
const PhaseQAHandover = ({ project, isEng, isEngHead, onAdvance, onUploadAdvance, onReject }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const { status } = project;

  // ── 1. Internal QA (Engineering uploads photo) ──
  if (status === 'Site Inspection & Quality Checking' && isEng) {
    return (
      <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pm-card-navy">
          <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🔎 Internal Technical QA/QC</h3>
        </div>
        <div style={{ padding: '30px' }}>
          <div className="pm-card-gray text-center">
            <label className="pm-title-lg">📸 Upload Internal QA Passed Photo *</label>
            <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files[0])} className="pm-file-input" />
            <PrimaryButton variant="red" onClick={() => onUploadAdvance('Pending QA Verification', 'qa_photo', uploadFile)}>
              Submit QA to Head for Verification
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. QA Verification (Engineering Head approves/rejects) ──
  if (status === 'Pending QA Verification' && isEngHead) {
    return (
      <div>
        <div className="pm-card-gray text-center">
          <h3 className="pm-title-lg" style={{ borderBottom: '2px solid var(--pm-border-soft)', paddingBottom: '20px' }}>
            Verify Internal QA
          </h3>
          <p className="pm-text-muted mt-4">Review the uploaded QA photo. Approve if ready, or reject to send back.</p>
          <div className="pm-card mt-4">
            {project.qa_photo ? (
              <ViewDocumentButton label="QA Photo" path={project.qa_photo} icon="📸" />
            ) : (
              <div style={{ width: '100%', padding: '40px', background: '#f1f5f9', borderRadius: '12px', border: '2px dashed var(--pm-border-soft)' }}>
                <p className="pm-text-muted" style={{ margin: 0 }}>No QA photo found.</p>
              </div>
            )}
          </div>
        </div>
        <div className="pm-grid-2 mt-4">
          <button onClick={() => onReject('Site Inspection & Quality Checking')} className="pm-btn pm-btn-outline"
            style={{ color: 'var(--pm-red)', borderColor: 'var(--pm-red)' }}>
            ❌ Reject & Return to Staff
          </button>
          <PrimaryButton variant="green" onClick={() => onAdvance('Final Site Inspection with the Client')}>
            ✓ Approve QA & Schedule Client Walkthrough
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // ── 3. Client Walkthrough (Engineering uploads sign-off) ──
  if (status === 'Final Site Inspection with the Client' && isEng) {
    return (
      <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pm-card-navy">
          <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>🤝 Final Client Walkthrough</h3>
        </div>
        <div className="pm-grid-2" style={{ padding: '30px' }}>
          <div>
            {project.qa_photo && (
              <ViewDocumentButton label="Internal QA Photo Ref" path={project.qa_photo} icon="📸" />
            )}
          </div>
          <div className="pm-card-cream text-center" style={{ marginBottom: 0 }}>
            <h4 className="pm-title-lg" style={{ color: '#854d0e' }}>📄 Upload Client Sign-off Sheet *</h4>
            <p className="pm-text-muted">Attach the physical document signed by the client confirming approval.</p>
            <input type="file" accept="image/*,.pdf" onChange={e => setUploadFile(e.target.files[0])} className="pm-file-input" />
            <PrimaryButton variant="navy" onClick={() => onUploadAdvance('Signing of COC', 'client_walkthrough_doc', uploadFile)}>
              Client Approved Project
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Signing of COC (Engineering uploads certificate) ──
  if (status === 'Signing of COC' && isEng) {
    return (
      <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pm-card-navy">
          <h3 className="pm-title-md" style={{ color: 'white', margin: 0 }}>📜 Certificate of Completion (C.O.C.)</h3>
        </div>
        <div style={{ padding: '30px' }}>
          <div className="pm-card-gray text-center">
            <span style={{ fontSize: '60px', display: 'block', marginBottom: '20px' }}>🏆</span>
            <h4 className="pm-title-lg">Upload Signed C.O.C.</h4>
            <p className="pm-text-muted">The final legal document handing the project over officially.</p>
            <input type="file" accept="image/*,.pdf" onChange={e => setUploadFile(e.target.files[0])} className="pm-file-input" />
            <PrimaryButton variant="navy" onClick={() => onUploadAdvance('Request Final Billing', 'coc_document', uploadFile)}>
              Upload COC & Trigger Final Bill
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhaseQAHandover;