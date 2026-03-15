import React from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';

const PhaseCompleted = ({ project, onAdvance, renderDocumentLink, exportCOABoardToExcel }) => (
  <div>
    <div className="pm-card-green">
      <h3 className="pm-title-lg" style={{ color: 'white', fontSize: '36px' }}>Project Finalized 🏆</h3>
      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Project Name: {project.project_name}</p>
    </div>

    <div className="pm-card">
      <div className="pm-flex-between mb-4 no-print">
        <h4 className="pm-title-lg" style={{ margin: 0 }}>📁 Digital Document Vault</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCOABoardToExcel} className="pm-btn-outline"
            style={{ background: '#ea580c', color: 'white', borderColor: '#ea580c' }}>
            📊 Generate COA Board
          </button>
          <button onClick={() => window.print()} className="pm-btn-outline">
            🖨️ Export as PDF / Print
          </button>
        </div>
      </div>

      <div className="pm-vault-grid">
        <div className="pm-vault-section">
          <p className="pm-vault-header">Technical & Site</p>
          {renderDocumentLink('Initial Floor Plan', project.floor_plan_image)}
          {renderDocumentLink('Before Photo', project.site_inspection_photo)}
          {renderDocumentLink('QA Passed Photo', project.qa_photo)}
          {renderDocumentLink('Mobilization Photo', project.mobilization_photo)}
        </div>
        <div className="pm-vault-section">
          <p className="pm-vault-header" style={{ color: '#ea580c' }}>Procurement & Bids</p>
          {renderDocumentLink('Winning Bid Doc', project.bidding_document)}
          {renderDocumentLink('Subcon Agreement', project.subcontractor_agreement_document)}
          {renderDocumentLink('Purchase Order', project.po_document)}
          {renderDocumentLink('Work Order', project.work_order_document)}
        </div>
        <div className="pm-vault-section">
          <p className="pm-vault-header" style={{ color: '#16a34a' }}>Financial Records</p>
          {renderDocumentLink('Progress Invoice', project.billing_invoice_document)}
          {renderDocumentLink('Final Receipt', project.final_invoice_document)}
          <div style={{ borderTop: '1px dashed var(--pm-border-soft)', marginTop: '15px', paddingTop: '15px' }}>
            <p className="pm-label">Total Contract Amount:</p>
            <p className="pm-title-md">
              ₱{parseFloat(project.contract_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="pm-vault-section">
          <p className="pm-vault-header" style={{ color: 'var(--pm-red)' }}>Turnover & Sign-off</p>
          {renderDocumentLink('Client Sign-off', project.client_walkthrough_doc)}
          {renderDocumentLink('Signed C.O.C.', project.coc_document)}
          {renderDocumentLink('Delivery Receipt', project.delivery_receipt_document)}
        </div>
      </div>
    </div>

    {project.status !== 'Archived' && (
      <div className="pm-card-gray text-center no-print">
        <h4 className="pm-title-lg">Final File Closure</h4>
        <p className="pm-text-muted">
          Archiving hides this project from the active list. Documents remain accessible via the Master Database.
        </p>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <PrimaryButton variant="navy" onClick={() => {
            if (window.confirm('Move this project to the permanent digital storage vault?')) onAdvance('Archived');
          }}>
            📁 Move to Storage Vault
          </PrimaryButton>
        </div>
      </div>
    )}
  </div>
);

export default PhaseCompleted;
