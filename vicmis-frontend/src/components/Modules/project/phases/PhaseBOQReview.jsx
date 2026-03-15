import React from 'react';
import BoqTable from '../components/BoqTable.jsx';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseBOQReview = ({ project, boqData, onAdvance, onReject, renderDocumentLink }) => (
  <div>
    <div className="pm-card-gray">
      <h3 className="pm-title-lg">Review Engineering Final BOQ</h3>
      {renderDocumentLink('Floor Plan Reference', project.floor_plan_image)}

      {/* ── Side-by-side measurement comparison ── */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>

        {/* Measurement Based on Plan */}
        <div className="pm-card" style={{ flex: 1, margin: 0, borderLeft: '4px solid var(--pm-blue, #3B82F6)' }}>
          <label className="pm-label" style={{ color: 'var(--pm-blue, #3B82F6)', marginBottom: '8px', display: 'block' }}>
            📐 Measurement Based on Plan
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '22px', fontWeight: '700', color: 'var(--pm-text-dark)',
              background: 'var(--pm-bg-muted, #EFF6FF)', padding: '4px 12px', borderRadius: '6px',
              letterSpacing: '0.5px'
            }}>
              {boqData.planSqm ? `${parseFloat(boqData.planSqm).toLocaleString()} sqm` : '—'}
            </span>
          </div>
          <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--pm-text-muted)', margin: 0 }}>
            {boqData.planMeasurement || 'No plan notes provided.'}
          </p>
        </div>

        {/* Actual Site Measurement */}
        <div className="pm-card" style={{ flex: 1, margin: 0, borderLeft: '4px solid var(--pm-green, #10B981)' }}>
          <label className="pm-label" style={{ color: 'var(--pm-green, #10B981)', marginBottom: '8px', display: 'block' }}>
            📏 Actual Site Measurement
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '22px', fontWeight: '700', color: 'var(--pm-text-dark)',
              background: 'var(--pm-bg-muted, #F0FDF4)', padding: '4px 12px', borderRadius: '6px',
              letterSpacing: '0.5px'
            }}>
              {boqData.actualSqm ? `${parseFloat(boqData.actualSqm).toLocaleString()} sqm` : '—'}
            </span>
            {/* Variance indicator */}
            {boqData.planSqm && boqData.actualSqm && (() => {
              const diff = parseFloat(boqData.actualSqm) - parseFloat(boqData.planSqm);
              const pct  = ((diff / parseFloat(boqData.planSqm)) * 100).toFixed(1);
              const isOver = diff > 0;
              const isExact = diff === 0;
              return !isExact ? (
                <span style={{
                  fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                  background: isOver ? '#FEF2F2' : '#F0FDF4',
                  color: isOver ? '#DC2626' : '#16A34A'
                }}>
                  {isOver ? '▲' : '▼'} {Math.abs(diff).toLocaleString()} sqm ({isOver ? '+' : ''}{pct}%)
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--pm-text-muted)' }}>✓ Exact match</span>
              );
            })()}
          </div>
          <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--pm-text-muted)', margin: 0 }}>
            {boqData.actualMeasurement || 'No site notes provided.'}
          </p>
        </div>

      </div>
    </div>

    {/* Final BOQ table — read-only */}
    <BoqTable
      type="finalBOQ"
      boqData={boqData}
      readOnly={true}
      onAdd={() => {}}
      onRemove={() => {}}
      onChange={() => {}}
    />

    <div className="pm-grid-2 mt-4">
      <button
        onClick={() => onReject('Actual Measurement')}
        className="pm-btn pm-btn-outline"
        style={{ color: 'var(--pm-red)', borderColor: 'var(--pm-red)' }}
      >
        ❌ Reject & Return to Staff
      </button>
      <PrimaryButton variant="green" onClick={() => onAdvance('Purchase Order')}>
        ✓ Approve BOQ & Return to Sales
      </PrimaryButton>
    </div>
  </div>
);

export default PhaseBOQReview;