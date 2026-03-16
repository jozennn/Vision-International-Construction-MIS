import React from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import '../css/PhaseCompleted.css';

const PhaseCompleted = ({ project, onAdvance, renderDocumentLink, exportCOABoardToExcel }) => {
  const contractAmount = parseFloat(project.contract_amount || 0)
    .toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="pc-wrapper">

      {/* ══════════════════════════════════════════════
          HERO HEADER — Vision black + red
      ══════════════════════════════════════════════ */}
      <div className="pc-hero">
        <div className="pc-hero-inner">
          <div className="pc-hero-left">
            <p className="pc-hero-eyebrow">
              <span>✦</span> Vision International Construction OPC
            </p>
            <h2 className="pc-hero-title">
              Project Finalized <span>🏆</span>
            </h2>
            <p className="pc-hero-project">
              Project: <span>{project.project_name}</span>
            </p>
          </div>
          <div className="pc-status-pill">
            <span className="pc-status-dot" />
            Completed
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DIGITAL DOCUMENT VAULT
      ══════════════════════════════════════════════ */}
      <div className="pc-vault-card">

        {/* Toolbar */}
        <div className="pc-vault-toolbar">
          <div className="pc-vault-toolbar-left">
            <div className="pc-vault-icon">📁</div>
            <h4 className="pc-vault-title">Digital Document Vault</h4>
          </div>
          <div className="pc-vault-actions no-print">
            <button onClick={exportCOABoardToExcel} className="pc-btn-red">
              📊 Generate COA Board
            </button>
            <button onClick={() => window.print()} className="pc-btn-outline">
              🖨️ Export as PDF / Print
            </button>
          </div>
        </div>

        {/* Grid of document sections */}
        <div className="pc-vault-body">
          <div className="pc-vault-grid">

            {/* ── Technical & Site ── */}
            <div className="pc-vault-section section-technical">
              <div className="pc-vault-section-header">Technical &amp; Site</div>
              <div className="pc-vault-docs">
                {renderDocumentLink('Initial Floor Plan',  project.floor_plan_image)}
                {renderDocumentLink('Before Photo',        project.site_inspection_photo)}
                {renderDocumentLink('QA Passed Photo',     project.qa_photo)}
                {renderDocumentLink('Mobilization Photo',  project.mobilization_photo)}
              </div>
            </div>

            {/* ── Procurement & Bids ── */}
            <div className="pc-vault-section section-procurement">
              <div className="pc-vault-section-header">Procurement &amp; Bids</div>
              <div className="pc-vault-docs">
                {renderDocumentLink('Winning Bid Doc',    project.bidding_document)}
                {renderDocumentLink('Subcon Agreement',   project.subcontractor_agreement_document)}
                {renderDocumentLink('Purchase Order',     project.po_document)}
                {renderDocumentLink('Work Order',         project.work_order_document)}
              </div>
            </div>

            {/* ── Financial Records ── */}
            <div className="pc-vault-section section-financial">
              <div className="pc-vault-section-header">Financial Records</div>
              <div className="pc-vault-docs">
                {renderDocumentLink('Progress Invoice', project.billing_invoice_document)}
                {renderDocumentLink('Final Receipt',    project.final_invoice_document)}
              </div>
              <div className="pc-contract-block">
                <p className="pc-contract-label">Total Contract Amount</p>
                <p className="pc-contract-amount">₱{contractAmount}</p>
              </div>
            </div>

            {/* ── Turnover & Sign-off ── */}
            <div className="pc-vault-section section-turnover">
              <div className="pc-vault-section-header">Turnover &amp; Sign-off</div>
              <div className="pc-vault-docs">
                {renderDocumentLink('Client Sign-off',   project.client_walkthrough_doc)}
                {renderDocumentLink('Signed C.O.C.',     project.coc_document)}
                {renderDocumentLink('Delivery Receipt',  project.delivery_receipt_document)}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ARCHIVE — only shown if not yet archived
      ══════════════════════════════════════════════ */}
      {project.status !== 'Archived' && (
        <div className="pc-archive-card no-print">
          <h4 className="pc-archive-title">Final File Closure</h4>
          <p className="pc-archive-desc">
            Archiving hides this project from the active list. All documents remain
            accessible via the Master Database.
          </p>
          <PrimaryButton
            variant="navy"
            onClick={() => {
              if (window.confirm('Move this project to the permanent digital storage vault?')) {
                onAdvance('Archived');
              }
            }}>
            📁 Move to Storage Vault
          </PrimaryButton>
        </div>
      )}

    </div>
  );
};

export default PhaseCompleted;