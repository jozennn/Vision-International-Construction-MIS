import React from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseBoqPlan = ({
  project,
  boqData,
  setBoqData,
  addBoqRow,
  removeBoqRow,
  handleBoqChange,
  onSubmitPlan,
  renderDocumentLink,
}) => (
  <div>
    {/* Floor plan reference */}
    {renderDocumentLink('Floor Plan Reference', project.floor_plan_image)}

    {/* Plan Measurement — compact row with sqm input + notes */}
    <div className="pm-card-gray" style={{ marginBottom: '16px' }}>
      <label className="pm-label" style={{ marginBottom: '6px', display: 'block' }}>
        Plan Measurement Notes
        <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--pm-text-muted)', fontWeight: 400 }}>sqm</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* sqm number input — small & compact */}
        <input
          type="number"
          min="0"
          step="0.01"
          value={boqData.planSqm || ''}
          onChange={e => setBoqData({ ...boqData, planSqm: e.target.value })}
          className="pm-input"
          style={{ margin: 0, width: '110px', flexShrink: 0 }}
          placeholder="0.00"
        />
        {/* Notes textarea — takes remaining space, shorter height */}
        <textarea
          value={boqData.planMeasurement || ''}
          onChange={e => setBoqData({ ...boqData, planMeasurement: e.target.value })}
          placeholder="Input measurement notes derived from the floor plan..."
          className="pm-textarea"
          rows={2}
          style={{ margin: 0, flex: 1, minHeight: '56px', resize: 'vertical', fontSize: '12px' }}
        />
      </div>
    </div>

    {/* Plan BOQ table — editable */}
    <BoqTable
      type="planBOQ"
      boqData={boqData}
      readOnly={false}
      onAdd={addBoqRow}
      onRemove={removeBoqRow}
      onChange={handleBoqChange}
    />

    <PrimaryButton variant="red" onClick={onSubmitPlan}>
      Save Plan Data & Proceed to Site Visit
    </PrimaryButton>
  </div>
);

export default PhaseBoqPlan;