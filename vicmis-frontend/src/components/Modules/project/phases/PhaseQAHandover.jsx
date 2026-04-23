import React, { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseQAHandover = ({ project, isEng, isEngHead, onAdvance, onUploadAdvance, onReject, renderDocumentLink }) => {
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
              <img src={`/storage/${project.qa_photo}`} alt="QA Proof"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--pm-border-soft)' }} />
            ) : (
              <div style={{ width: '100%', height: '200px', background: '#f1f5f9', borderRadius: '12px', border: '2px dashed var(--pm-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            {renderDocumentLink('Internal QA Photo Ref', project.qa_photo)}
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