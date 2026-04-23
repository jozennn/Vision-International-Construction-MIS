import React, { useState, useRef } from 'react';
import api from '@/api/axios';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseBiddingAwardingContract.css';

/* ─────────────────────────────────────────────────────────────
   DocumentViewer
───────────────────────────────────────────────────────────── */
const DocumentViewer = ({ path, label, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const src   = `/api/project-image/${path}`;
  const isPDF = path?.toLowerCase().endsWith('.pdf');

  return (
    <div className="pm-bac-modal-overlay" onClick={onClose}>
      <div className="pm-bac-modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-bac-modal-header">
          <span className="pm-bac-modal-title">📄 {label}</span>
          <div className="pm-bac-modal-actions">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="pm-bac-modal-open-btn"
            >
              ⬇ Open / Download
            </a>
            <button className="pm-bac-modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="pm-bac-modal-body">
          {!loaded && !error && (
            <div className="pm-bac-modal-spinner">
              <span className="pm-bac-modal-spinner-icon">⏳</span>
              <p className="pm-bac-modal-spinner-text">Loading document…</p>
            </div>
          )}

          {error && (
            <div className="pm-bac-modal-error">
              <span className="pm-bac-modal-error-icon">⚠️</span>
              <p>
                Could not display inline.{' '}
                <a href={src} target="_blank" rel="noreferrer">Open / Download</a>{' '}
                it directly.
              </p>
            </div>
          )}

          {isPDF ? (
            <iframe
              src={src}
              title={label}
              className="pm-bac-modal-iframe"
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{ display: loaded && !error ? 'block' : 'none' }}
            />
          ) : (
            <img
              src={src}
              alt={label}
              className="pm-bac-modal-img"
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              style={{ display: loaded && !error ? 'block' : 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ViewDocumentButton
───────────────────────────────────────────────────────────── */
const ViewDocumentButton = ({ label, path, icon = '📄' }) => {
  const [open, setOpen] = useState(false);

  if (!path) return (
    <p className="pm-bac-no-doc">No document uploaded.</p>
  );

  return (
    <>
      <button
        type="button"
        className="pm-bac-view-btn"
        onClick={() => setOpen(true)}
      >
        {icon} View {label}
      </button>
      {open && (
        <DocumentViewer path={path} label={label} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   UploadZone
───────────────────────────────────────────────────────────── */
const UploadZone = ({ file, existingPath, onFileChange, accept = 'image/*,.pdf', disabled }) => {
  const inputRef = useRef();
  const hasExisting = !!existingPath;

  const zoneClass = [
    'pm-bac-upload-zone',
    file                   ? 'has-file'     : '',
    hasExisting && !file   ? 'has-existing'  : '',
    disabled               ? 'disabled'      : '',
  ].filter(Boolean).join(' ');

  return (
    <div>
      <label className={zoneClass}>
        <span className="pm-bac-upload-icon">
          {file ? '✅' : hasExisting ? '🔵' : '📎'}
        </span>
        <span className="pm-bac-upload-name">
          {file
            ? file.name
            : hasExisting
              ? 'Already uploaded — click to replace'
              : 'Click to choose file'}
        </span>
        <span className="pm-bac-upload-hint">PDF, JPG, PNG accepted</span>
        <input
          type="file"
          className="pm-bac-upload-input"
          ref={inputRef}
          accept={accept}
          disabled={disabled}
          onChange={e => onFileChange(e.target.files[0] || null)}
        />
      </label>
      {file && (
        <button
          className="pm-bac-remove-btn"
          onClick={() => {
            onFileChange(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          ✕ Remove
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   StepCard
───────────────────────────────────────────────────────────── */
const StepCard = ({ stepNumber, title, icon, isActive, isCompleted, children }) => {
  const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';

  return (
    <div className={`pm-bac-step-card ${state}`}>
      <div className={`pm-bac-step-header ${state}`}>
        <div className="pm-bac-step-number">
          {isCompleted ? '✓' : stepNumber}
        </div>
        <span className="pm-bac-step-title">{icon} {title}</span>
        {isCompleted && (
          <span className="pm-bac-step-badge">✓ Completed</span>
        )}
        {!isActive && !isCompleted && (
          <span className="pm-bac-step-badge">🔒 Locked</span>
        )}
      </div>

      {(isActive || isCompleted) && (
        <div className="pm-bac-step-body">
          {children}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
const PhaseBiddingAwardingContract = ({
  project,
  isOpsAss,
  isEng,
  isEngHead,
  onAdvance,
}) => {
  const [biddingFile,  setBiddingFile]  = useState(null);
  const [awardingFile, setAwardingFile] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // Existing uploads on the project
  const existingBidding  = project?.bidding_document;
  const existingAwarding = project?.awarding_document;
  const existingContract = project?.subcontractor_agreement_document;

  // Step completion flags
  const step1Done = !!(biddingFile  || existingBidding);
  const step2Done = !!(awardingFile || existingAwarding);
  const step3Done = !!(contractFile || existingContract);

  // Unlock logic
  const step2Active = step1Done;
  const step3Active = step1Done && step2Done;
  const canAdvance  = step1Done && step2Done && step3Done;

  // Active step index (for progress bar colouring)
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : null;

  const steps = [
    { label: 'Bidding',  done: step1Done },
    { label: 'Awarding', done: step2Done },
    { label: 'Contract', done: step3Done },
  ];

  // Submit all files and advance
  const handleSubmit = async () => {
    if (!canAdvance) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('new_status', 'Deployment and Orientation of Installers');
      if (biddingFile)  formData.append('bidding_document',                 biddingFile);
      if (awardingFile) formData.append('awarding_document',                awardingFile);
      if (contractFile) formData.append('subcontractor_agreement_document', contractFile);

      await api.post(
        `/projects/${project.id}/bidding-awarding-contract`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      onAdvance('Deployment and Orientation of Installers');
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-bac-wrapper">

      {/* ── Page Header ── */}
      <div className="pm-bac-page-header">
        <span className="pm-bac-page-header-icon">📋</span>
        <div className="pm-bac-page-header-body">
          <p className="pm-bac-page-header-eyebrow">Management — Internal Process</p>
          <h3 className="pm-bac-page-header-title">
            Bidding, Awarding & Contract Signing
          </h3>
          <p className="pm-bac-page-header-sub">
            Complete all three steps in sequence before advancing to Site Mobilization.
          </p>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="pm-bac-progress-bar">
        {steps.map((s, i) => {
          const isDone   = s.done;
          const isActive = !isDone && (i + 1 === activeStep);
          const dotState = isDone ? 'done' : isActive ? 'active' : 'locked';

          return (
            <React.Fragment key={s.label}>
              <div className="pm-bac-progress-step">
                <div className={`pm-bac-progress-dot ${dotState}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`pm-bac-progress-label ${dotState}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`pm-bac-progress-connector ${isDone ? 'done' : 'pending'}`} />
              )}
            </React.Fragment>
          );
        })}
        <span className={`pm-bac-progress-count ${canAdvance ? 'complete' : 'partial'}`}>
          {steps.filter(s => s.done).length}/3 Complete
        </span>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="pm-bac-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* ── Step 1: Bidding of Project ── */}
      <StepCard
        stepNumber={1}
        title="Bidding of Project"
        icon="🏗️"
        isActive={!step1Done}
        isCompleted={step1Done}
      >
        <p className="pm-bac-step-desc">
          Upload the internal bidding documentation and contractor evaluation records.
        </p>
        {existingBidding && (
          <div className="pm-bac-view-btn-row">
            <ViewDocumentButton label="Bidding Document" path={existingBidding} icon="🏗️" />
          </div>
        )}
        <UploadZone
          file={biddingFile}
          existingPath={existingBidding}
          onFileChange={setBiddingFile}
          disabled={false}
        />
      </StepCard>

      {/* ── Step 2: Awarding of Project ── */}
      <StepCard
        stepNumber={2}
        title="Awarding of Project"
        icon="🏆"
        isActive={step2Active && !step2Done}
        isCompleted={step2Done}
      >
        <p className="pm-bac-step-desc">
          Upload the contractor awarding documentation and final selection records.
        </p>
        {existingAwarding && (
          <div className="pm-bac-view-btn-row">
            <ViewDocumentButton label="Awarding Document" path={existingAwarding} icon="🏆" />
          </div>
        )}
        <UploadZone
          file={awardingFile}
          existingPath={existingAwarding}
          onFileChange={setAwardingFile}
          disabled={!step1Done}
        />
      </StepCard>

      {/* ── Step 3: Contract Signing for Installer ── */}
      <StepCard
        stepNumber={3}
        title="Contract Signing for Installer"
        icon="✍️"
        isActive={step3Active && !step3Done}
        isCompleted={step3Done}
      >
        <p className="pm-bac-step-desc">
          Upload the signed subcontractor agreement / installer contract document.
        </p>
        {existingContract && (
          <div className="pm-bac-view-btn-row">
            <ViewDocumentButton label="Subcontractor Agreement" path={existingContract} icon="✍️" />
          </div>
        )}
        <UploadZone
          file={contractFile}
          existingPath={existingContract}
          onFileChange={setContractFile}
          disabled={!step1Done || !step2Done}
        />
      </StepCard>

      {/* ── Advance Panel ── */}
      <div className={`pm-bac-advance-panel ${canAdvance ? 'ready' : ''}`}>
        {!canAdvance && (
          <div className="pm-bac-warn-blurb">
            <span>⚠️</span>
            <p>
              {!step1Done
                ? 'Upload the Bidding document to unlock the next steps.'
                : !step2Done
                  ? 'Upload the Awarding document to unlock Contract Signing.'
                  : 'Upload the Contract document to enable the advance button.'}
            </p>
          </div>
        )}
        <button
          className={`pm-bac-advance-btn ${canAdvance ? 'ready' : 'locked-btn'}`}
          disabled={!canAdvance || loading}
          onClick={handleSubmit}
        >
          {loading
            ? '⏳ Saving & Advancing…'
            : canAdvance
              ? '🚀 Advance to Deployment and Orientation of Installers →'
              : '🔒 Complete All Steps to Advance'}
        </button>
      </div>

    </div>
  );
};

export default PhaseBiddingAwardingContract;