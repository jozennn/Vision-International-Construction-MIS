import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhasePOWorkOrder = ({ project, isSales, isSalesHead, onUploadAdvance, onAdvance, onReject, renderDocumentLink }) => {
  const [workOrderFile, setWorkOrderFile] = useState(null);
  const workOrderInputRef = useRef();

  const { status } = project;

  // ── Sales uploads Work Order ────────────────────────────────
  if (status === 'P.O & Work Order' && isSales) {
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
            <h3 className="pm-step-header-title">Work Order Preparation</h3>
          </div>
        </div>

        <div className="pm-card-below-header">
          <label className="pm-label">Reference Document</label>
          {renderDocumentLink('Verified First P.O.', project.po_document)}

          <hr className="pm-divider-dashed" />

          <div className="pm-info-blurb">
            <span className="pm-info-blurb-icon">ℹ️</span>
            <p>
              Upload the <strong>Work Order document</strong> corresponding to the Purchase Order above.
              This will be sent to the Sales Head for verification.
            </p>
          </div>

          <label className="pm-label">Work Order Document</label>
          <label className={`pm-upload-zone ${workOrderFile ? 'has-file' : ''}`}>
            <span className="pm-upload-zone-icon">{workOrderFile ? '✅' : '📁'}</span>
            <span className="pm-upload-zone-name">
              {workOrderFile ? workOrderFile.name : 'Click to choose file or drag & drop'}
            </span>
            <span className="pm-upload-zone-hint">PDF, JPG, PNG accepted</span>
            <input
              type="file"
              ref={workOrderInputRef}
              accept="image/*,.pdf"
              onChange={e => setWorkOrderFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>

          <PrimaryButton
            onClick={() => onUploadAdvance('Pending Work Order Verification', 'work_order_document', workOrderFile)}
            variant="red"
            disabled={!workOrderFile}
          >
            Upload Work Order & Submit →
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // ── Sales Head verifies Work Order ──────────────────────────
  if (status === 'Pending Work Order Verification' && isSalesHead) {
    return (
      <div>
        <div className="pm-step-header">
          <span className="pm-step-header-icon">🔍</span>
          <div>
            <span className="pm-step-header-eyebrow">Review</span>
            <h3 className="pm-step-header-title">Work Order Verification</h3>
          </div>
        </div>

        <div className="pm-card-below-header">
          <p className="pm-text-muted mb-4">
            Verify that the <strong>Work Order</strong> matches the <strong>Purchase Order</strong> before
            forwarding to Engineering for site inspection.
          </p>

          <div className="pm-grid-2 mb-4">
            <div>
              <label className="pm-label">Purchase Order</label>
              {renderDocumentLink('Purchase Order', project.po_document)}
            </div>
            <div>
              <label className="pm-label">Work Order</label>
              {renderDocumentLink('Work Order', project.work_order_document)}
            </div>
          </div>

          <div className="pm-verdict-strip">
            <span className="pm-verdict-strip-icon">⚖️</span>
            <p>
              Review both documents carefully. <strong>Approve</strong> to send to Engineering,
              or <strong>Reject</strong> to return to the Sales staff for corrections.
            </p>
          </div>

          <div className="pm-grid-2">
            <button
              onClick={() => onReject('P.O & Work Order')}
              className="pm-btn pm-btn-outline pm-btn-outline-red"
            >
              ❌ Reject & Return to Staff
            </button>
            <PrimaryButton variant="green" onClick={() => onAdvance('Initial Site Inspection')}>
              ✓ Approve Work Order
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhasePOWorkOrder;