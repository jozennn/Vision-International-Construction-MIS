import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseBilling.css';

const PhaseBilling = ({ project, latestLog, onUploadAdvance, renderDocumentLink }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef();

  const { status } = project;
  const isFinal       = status === 'Request Final Billing';
  const totalContract = parseFloat(project.contract_amount) || 0;
  const percent       = latestLog ? parseFloat(latestLog.accomplishment_percent) || 0 : 0;
  const payableAmount = totalContract * (percent / 100);

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
          <div className="bill-header-icon">
            {isFinal ? '💸' : '💰'}
          </div>
          <div className="bill-header-text">
            <h3 className="bill-header-title">
              {isFinal ? 'Final Accounting Clearance' : 'Progress Billing'}
            </h3>
            <span className="bill-header-subtitle">
              {isFinal ? 'Project Closeout · Final Invoice' : 'Accounting · Payment Release'}
            </span>
          </div>
        </div>
      </div>

      <div className="bill-body">

        {/* ── Two-column content ── */}
        <div className="bill-grid">

          {/* LEFT — Statement of Work */}
          <div className="bill-statement">
            <div className="bill-statement-title">
              {isFinal ? 'Final Statement of Work' : 'Statement of Work Accomplished'}
            </div>

            <div className="bill-statement-row">
              <span className="bill-statement-label">Total Contract Amount</span>
              <span className="bill-statement-value">
                ₱{totalContract.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bill-statement-row">
              <span className="bill-statement-label">
                {isFinal ? 'Final Accomplishment' : 'Current Accomplishment'}
              </span>
              <span className={`bill-percent-badge ${isFinal ? 'final' : 'progress'}`}>
                {isFinal ? '100% COMPLETE' : `${percent}%`}
              </span>
            </div>

            {!isFinal && (
              <div className="bill-payable-row">
                <span className="bill-payable-label">Amount Payable</span>
                <span className="bill-payable-amount">
                  ₱{payableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT — Photo proof or verification docs */}
          <div className="bill-proof-card">
            {isFinal ? (
              <>
                <div className="bill-proof-title">Required Verification Documents</div>
                {renderDocumentLink('Signed C.O.C', project.coc_document)}
                {renderDocumentLink('Client Walkthrough Sign-off', project.client_walkthrough_doc)}
              </>
            ) : (
              <>
                <div className="bill-proof-title">Latest Site Photo Proof</div>
                {latestLog?.photo_path ? (
                  <img
                    src={`/storage/${latestLog.photo_path}`}
                    alt="Site Progress"
                    className="bill-site-photo"
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                    }} />
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
        </div>

        {/* ── Upload section ── */}
        <div className="bill-upload-section">
          <h4 className="bill-upload-title">
            {isFinal
              ? 'Upload Final Official Invoice / Receipt'
              : 'Upload Official Subcontractor Invoice'}
          </h4>
          <p className="bill-upload-desc">
            {isFinal
              ? 'Upload the final financial proof before permanently closing this project.'
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
              className="bill-file-hidden" />
          </label>

          <PrimaryButton
            disabled={!uploadFile}
            variant="red"
            onClick={handleSubmit}>
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