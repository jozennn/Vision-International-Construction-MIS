import React, { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseFloorPlan = ({ project, onUploadAdvance }) => {
  const [uploadFile, setUploadFile] = useState(null);
  return (
    <div className="pm-card-gray text-center">
      <h3 className="pm-title-lg">Step 1: Initial Project Document</h3>
      <p className="pm-text-muted">Upload the Floor Plan to begin the engineering measurement phase.</p>
      <label className="pm-label">Upload Floor Plan:</label>
      <input type="file" onChange={e => setUploadFile(e.target.files[0])} className="pm-file-input" />
      <PrimaryButton onClick={() => onUploadAdvance('Measurement based on Plan', 'floor_plan_image', uploadFile)} variant="red">
        Submit to Engineering
      </PrimaryButton>
    </div>
  );
};

export default PhaseFloorPlan;
