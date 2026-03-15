import React, { useState } from 'react';

const RejectModal = ({ targetPhase, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="pm-modal-overlay">
      <div className="pm-modal-content">
        <h3 className="pm-title-lg" style={{ color: 'var(--pm-red)' }}>⚠️ Reject & Send Back</h3>
        <p className="pm-text-muted">Please provide specific notes on what needs to be fixed.</p>
        <textarea
          className="pm-textarea"
          placeholder="e.g. Missing 50 bags of cement..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="pm-grid-2">
          <button className="pm-btn pm-btn-outline" onClick={onCancel}>Cancel</button>
          <button className="pm-btn pm-btn-red" onClick={() => onConfirm(targetPhase, reason)}>
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
