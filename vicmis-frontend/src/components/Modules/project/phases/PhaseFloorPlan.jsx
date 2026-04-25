import React, { useState, useRef } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseFloorPlan = ({ project, onUploadAdvance }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const inputRef = useRef();

  return (
    <div className="pm-card-gray text-center">
      <h3 className="pm-title-lg">Step 1: Initial Project Document</h3>
      <p className="pm-text-muted">Upload the Floor Plan to begin the engineering measurement phase.</p>

      <label className="pm-label">Upload Floor Plan:</label>

      <label className={`pm-upload-zone ${uploadFile ? 'has-file' : ''}`}>
        <span className="pm-upload-zone-icon">{uploadFile ? '✅' : '📁'}</span>
        <span className="pm-upload-zone-name">
          {uploadFile ? uploadFile.name : 'Click to choose file or drag & drop'}
        </span>
        <span className="pm-upload-zone-hint">PDF, JPG, PNG accepted</span>
        <input
          type="file"
          ref={inputRef}
          accept="image/*,.pdf"
          onChange={e => setUploadFile(e.target.files[0] || null)}
          style={{ display: 'none' }}
        />
      </label>

      <PrimaryButton
        onClick={() => onUploadAdvance('Measurement based on Plan', 'floor_plan_image', uploadFile)}
        variant="red"
        disabled={!uploadFile}
      >
        Submit to Engineering
      </PrimaryButton>
    </div>
  );
};

export default PhaseFloorPlan;