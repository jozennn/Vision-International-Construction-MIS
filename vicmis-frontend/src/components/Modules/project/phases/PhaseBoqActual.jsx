import React, { useEffect } from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseBoqActual = ({
  project,
  boqData,
  setBoqData,
  addBoqRow,
  removeBoqRow,
  handleBoqChange,
  onSubmitActual,
  renderDocumentLink,
}) => {

  // Auto-populate finalBOQ from planBOQ when component mounts
  // (only if finalBOQ is empty to avoid overwriting user edits)
  useEffect(() => {
    const planRows = boqData.planBOQ || [];
    const finalRows = boqData.finalBOQ || [];

    if (planRows.length > 0 && finalRows.length === 0) {
      // Deep-clone planBOQ rows into finalBOQ so user can edit independently
      const cloned = planRows.map(row => ({ ...row }));
      setBoqData(prev => ({ ...prev, finalBOQ: cloned }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Rejection notes */}
      {project.rejection_notes && (
        <div className="pm-card-red">
          <h4 className="pm-title-md pm-label-red">🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
          <p className="pm-text-muted" style={{ margin: 0 }}>"{project.rejection_notes}"</p>
        </div>
      )}

      {/* Floor plan reference */}
      {renderDocumentLink('Floor Plan Reference', project.floor_plan_image)}

      {/* Read-only Plan BOQ */}
      <div style={{ opacity: 0.8, pointerEvents: 'none' }}>
        <BoqTable
          type="planBOQ"
          boqData={boqData}
          readOnly={true}
          onAdd={() => {}}
          onRemove={() => {}}
          onChange={() => {}}
        />
      </div>

      <hr style={{ border: '2px dashed var(--pm-border-soft)', margin: '30px 0' }} />

      {/* ── Side-by-side measurement comparison ── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>

        {/* Plan Measurement (sqm) — read-only display */}
        <div className="pm-card-gray" style={{ flex: 1, margin: 0 }}>
          <label className="pm-label" style={{ marginBottom: '6px', display: 'block' }}>
            Measurement Based on Plan
            <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--pm-text-muted)', fontWeight: 400 }}>sqm</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={boqData.planSqm || ''}
              readOnly
              className="pm-input"
              style={{ margin: 0, width: '110px', background: 'var(--pm-bg-muted, #f3f4f6)', cursor: 'not-allowed', flexShrink: 0 }}
              placeholder="0.00"
            />
            <span style={{ fontSize: '12px', color: 'var(--pm-text-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
              {boqData.planMeasurement || 'No plan notes entered.'}
            </span>
          </div>
        </div>

        {/* Actual Measurement (sqm) — editable */}
        <div className="pm-card-cream" style={{ flex: 1, margin: 0 }}>
          <label className="pm-label" style={{ marginBottom: '6px', display: 'block' }}>
            Actual Site Measurement
            <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--pm-text-muted)', fontWeight: 400 }}>sqm</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={boqData.actualSqm || ''}
              onChange={e => setBoqData({ ...boqData, actualSqm: e.target.value })}
              className="pm-input"
              style={{ margin: 0, width: '110px', flexShrink: 0 }}
              placeholder="0.00"
            />
            <textarea
              value={boqData.actualMeasurement || ''}
              onChange={e => setBoqData({ ...boqData, actualMeasurement: e.target.value })}
              placeholder="Input physical site constraints and adjustments..."
              className="pm-textarea"
              rows={2}
              style={{ margin: 0, flex: 1, minHeight: '56px', resize: 'vertical', fontSize: '12px' }}
            />
          </div>
        </div>

      </div>

      {/* Final BOQ — editable, pre-filled from planBOQ */}
      <BoqTable
        type="finalBOQ"
        boqData={boqData}
        readOnly={false}
        onAdd={addBoqRow}
        onRemove={removeBoqRow}
        onChange={handleBoqChange}
      />

      <PrimaryButton variant="red" onClick={onSubmitActual}>
        Submit Final BOQ for Approval
      </PrimaryButton>
    </div>
  );
};

export default PhaseBoqActual;