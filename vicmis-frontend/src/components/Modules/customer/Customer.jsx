import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './css/Customer.css';

// ── Pipeline stages definition ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'To be Contacted',            label: 'To Be Contacted',   color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8', border: '#e2e8f0' },
  { key: 'Contacted',                  label: 'Contacted',          color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6', border: '#bfdbfe' },
  { key: 'For Presentation',           label: 'For Presentation',   color: '#d97706', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
  { key: 'Ready for Creating Project', label: 'Ready for Project',  color: '#059669', bg: '#ecfdf5', dot: '#10b981', border: '#6ee7b7' },
];

const getStage = (status) =>
  PIPELINE_STAGES.find(s => s.key === status) || PIPELINE_STAGES[0];

const getStageIndex = (status) =>
  PIPELINE_STAGES.findIndex(s => s.key === status);

// ── Pipeline Progress Bar ─────────────────────────────────────────────────────
const PipelineProgress = ({ status }) => {
  const idx = getStageIndex(status);
  const pct = idx < 0 ? 100 : (idx / (PIPELINE_STAGES.length - 1)) * 100;

  return (
    <div className="pipeline-progress-wrap">
      <div className="pipeline-progress-track">
        <div className="pipeline-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pipeline-progress-dots">
        {PIPELINE_STAGES.map((s, i) => (
          <div
            key={s.key}
            className={`pipeline-dot ${i <= idx ? 'active' : ''}`}
            title={s.label}
            style={{ '--dot-color': s.dot }}
          />
        ))}
      </div>
    </div>
  );
};

// ── Kanban Card ───────────────────────────────────────────────────────────────
const KanbanCard = ({ lead, onClick, onCreateProject, userRole }) => (
  <div className="kanban-card" onClick={() => onClick(lead)}>
    <div className="kanban-card-top">
      <span className="lead-id">#{lead.id}</span>
      <span className="kanban-card-date">
        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
      </span>
    </div>
    <div className="kanban-card-client">{lead.client_name}</div>
    <div className="kanban-card-project">{lead.project_name}</div>
    <div className="kanban-card-location">📍 {lead.location}</div>

    {lead.status === 'Ready for Creating Project' && userRole !== 'manager' && (
      <button
        className="btn-create-project kanban-create-btn"
        onClick={(e) => { e.stopPropagation(); onCreateProject(e, lead); }}
      >
        Create Project
      </button>
    )}
  </div>
);

// ── Kanban Column ─────────────────────────────────────────────────────────────
const KanbanColumn = ({ stage, leads, onClick, onCreateProject, userRole }) => (
  <div className="kanban-column" style={{ '--col-dot': stage.dot, '--col-border': stage.border, '--col-bg': stage.bg }}>
    <div className="kanban-col-header">
      <div className="kanban-col-dot" />
      <span className="kanban-col-label">{stage.label}</span>
      <span className="kanban-col-count">{leads.length}</span>
    </div>
    <div className="kanban-col-body">
      {leads.length === 0 ? (
        <div className="kanban-col-empty">No leads here</div>
      ) : (
        leads.map(lead => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onClick={onClick}
            onCreateProject={onCreateProject}
            userRole={userRole}
          />
        ))
      )}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Customer = ({ user }) => {
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isHistoryOpen, setIsHistoryOpen]   = useState(false);
  const [isTrashOpen, setIsTrashOpen]       = useState(false);
  const [isViewOnly, setIsViewOnly]         = useState(false);
  const [selectedLead, setSelectedLead]     = useState(null);
  const [viewMode, setViewMode]             = useState('grid'); // 'grid' | 'kanban'

  const [leads, setLeads]               = useState([]);
  const [trashedLeads, setTrashedLeads] = useState([]);
  const [isLoading, setIsLoading]       = useState(true);

  const [formData, setFormData] = useState({
    clientName: '', projectName: '', location: '', contactNo: '',
    notes: '', status: 'To be Contacted', salesRep: user?.name || ''
  });

  useEffect(() => {
    if (isModalOpen || isHistoryOpen || isTrashOpen) {
      document.body.classList.add('hide-hamburger');
    } else {
      document.body.classList.remove('hide-hamburger');
    }
    return () => document.body.classList.remove('hide-hamburger');
  }, [isModalOpen, isHistoryOpen, isTrashOpen]);

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        clientName:  selectedLead.client_name || '',
        projectName: selectedLead.project_name || '',
        location:    selectedLead.location || '',
        contactNo:   selectedLead.contact_no || '',
        notes:       selectedLead.notes || '',
        status:      selectedLead.status || 'To be Contacted',
        salesRep:    selectedLead.sales_rep?.name || user?.name || ''
      });
    } else {
      setFormData({
        clientName: '', projectName: '', location: '', contactNo: '',
        notes: '', status: 'To be Contacted', salesRep: user?.name || ''
      });
    }
  }, [selectedLead, isModalOpen, user]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrashedLeads = async () => {
    try {
      const res = await api.get('/leads/trash/all');
      setTrashedLeads(res.data);
    } catch (err) {
      console.error('Trash fetch error:', err);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNo') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 11) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
    setIsViewOnly(false);
  };

  const handleCardClick = (lead) => {
    setSelectedLead(lead);
    setIsViewOnly(user?.role === 'manager');
    setIsModalOpen(true);
  };

  const handleViewHistoryDetails = (proj) => {
    setSelectedLead(proj);
    setIsViewOnly(true);
    setIsHistoryOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewOnly) return;

    const payload = {
      client_name:  formData.clientName,
      project_name: formData.projectName,
      location:     formData.location,
      contact_no:   formData.contactNo,
      notes:        formData.notes,
      status:       formData.status
    };

    try {
      if (selectedLead) {
        const res = await api.put(`/leads/${selectedLead.id}`, payload);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? res.data : l));
        alert('Lead updated!');
      } else {
        const res = await api.post('/leads', payload);
        setLeads(prev => [res.data, ...prev]);
        alert('Lead created!');
      }
      handleCloseModal();
    } catch (err) {
      console.error('Submit error:', err);
      alert('Action failed.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Move this lead to the trash bin?')) return;
    try {
      await api.delete(`/leads/${selectedLead.id}`);
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      handleCloseModal();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/leads/${id}/restore`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      fetchLeads();
      alert('Lead restored!');
    } catch (err) {
      alert('Failed to restore.');
    }
  };

  const handleForceDelete = async (id) => {
    if (!window.confirm('Delete permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/leads/${id}/force`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      alert('Deleted forever.');
    } catch (err) {
      alert('Permanent delete failed.');
    }
  };

  const handleCreateProject = async (e, lead) => {
    e.stopPropagation();
    if (!window.confirm(`Create project for ${lead.project_name}?`)) return;
    try {
      const projectPayload = {
        lead_id:      lead.id,
        project_name: lead.project_name,
        client_name:  lead.client_name,
        location:     lead.location,
        project_type: 'Construction Project',
        status:       'Ongoing'
      };
      await api.post('/projects', projectPayload);
      await api.put(`/leads/${lead.id}`, { ...lead, status: 'Project Created' });
      alert('Project created!');
      fetchLeads();
    } catch (err) {
      alert('Failed to create project.');
    }
  };

  const activeLeads       = leads.filter(l => l.status !== 'Project Created');
  const completedProjects = leads.filter(l => l.status === 'Project Created');

  return (
    <div className="customer-container">

      {/* ── HEADER ── */}
      <div className="customer-header">
        <h1>Client Management</h1>
        <div className="header-actions">

          {/* View Toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              </svg>
              Grid
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="3.5" height="13" rx="1" fill="currentColor"/>
                <rect x="5.75" y="1" width="3.5" height="9" rx="1" fill="currentColor"/>
                <rect x="10.5" y="1" width="3.5" height="11" rx="1" fill="currentColor"/>
              </svg>
              Kanban
            </button>
          </div>

          {user?.role !== 'manager' && (
            <>
              <button
                className="btn-trash-bin"
                onClick={() => { fetchTrashedLeads(); setIsTrashOpen(true); }}
              >
                🗑️ Trash Bin
              </button>
              <button
                className="btn-add-lead"
                onClick={() => { setIsViewOnly(false); setIsModalOpen(true); }}
              >
                + Add New Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stat-chip">
          <div className="stat-chip-icon blue">📋</div>
          <div className="stat-chip-info">
            <span className="stat-chip-value">{activeLeads.length}</span>
            <span className="stat-chip-label">Active Leads</span>
          </div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-icon green">✅</div>
          <div className="stat-chip-info">
            <span className="stat-chip-value">{completedProjects.length}</span>
            <span className="stat-chip-label">Converted</span>
          </div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-icon red">🗑️</div>
          <div className="stat-chip-info">
            <span className="stat-chip-value">{trashedLeads.length}</span>
            <span className="stat-chip-label">Trashed</span>
          </div>
        </div>
        {/* Pipeline stage mini-counts */}
        {PIPELINE_STAGES.map(stage => {
          const count = activeLeads.filter(l => l.status === stage.key).length;
          return (
            <div className="stat-chip stage-chip" key={stage.key} style={{ '--stage-dot': stage.dot }}>
              <div className="stage-chip-dot" />
              <div className="stat-chip-info">
                <span className="stat-chip-value">{count}</span>
                <span className="stat-chip-label">{stage.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="spinner-container">
          <div className="loading-circle" />
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!isLoading && viewMode === 'grid' && (
        <div className="lead-grid">
          {activeLeads.length === 0 ? (
            <div className="no-leads-container">
              <div className="no-leads-icon">📋</div>
              <h3>No Active Leads</h3>
              <p>Your pipeline is clear. Start by adding a new lead.</p>
            </div>
          ) : (
            activeLeads.map((lead) => (
              <div
                key={lead.id}
                className="lead-card"
                onClick={() => handleCardClick(lead)}
              >
                <div className="lead-card-header">
                  <span className={`status-badge ${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>
                    {lead.status}
                  </span>
                  <span className="lead-id">#{lead.id}</span>
                </div>

                <div className="lead-body">
                  <h3>{lead.client_name}</h3>
                  <p>{lead.project_name}</p>
                  <small>📍 {lead.location}</small>
                </div>

                {/* Pipeline Progress Bar */}
                <div style={{ padding: '0 18px' }}>
                  <PipelineProgress status={lead.status} />
                </div>

                <div className="lead-card-footer">
                  <div className="lead-click-hint">
                    Click to View{user?.role !== 'manager' ? ' / Edit' : ''}
                  </div>
                  {lead.status === 'Ready for Creating Project' && user?.role !== 'manager' && (
                    <button
                      className="btn-create-project"
                      onClick={(e) => handleCreateProject(e, lead)}
                    >
                      Create Project
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {!isLoading && viewMode === 'kanban' && (
        <div className="kanban-board">
          {activeLeads.length === 0 ? (
            <div className="no-leads-container" style={{ width: '100%' }}>
              <div className="no-leads-icon">📋</div>
              <h3>No Active Leads</h3>
              <p>Your pipeline is clear. Start by adding a new lead.</p>
            </div>
          ) : (
            PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={activeLeads.filter(l => l.status === stage.key)}
                onClick={handleCardClick}
                onCreateProject={handleCreateProject}
                userRole={user?.role}
              />
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MAIN MODAL — Add / Edit / View
      ══════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="compact-modal">
            <div className="modal-header-compact">
              <h2>
                {isViewOnly
                  ? '📄 Lead Details'
                  : selectedLead
                    ? '✏️ Update Lead'
                    : '+ New Lead Entry'}
              </h2>
              {selectedLead && (
                <div className="modal-pipeline-progress">
                  <PipelineProgress status={selectedLead.status} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="lead-form-compact">
              <div className="compact-grid">
                <div className="form-group-compact">
                  <label>Client Name</label>
                  <input
                    type="text" name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required disabled={isViewOnly}
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </div>

                <div className="form-group-compact">
                  <label>Project Name</label>
                  <input
                    type="text" name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    required disabled={isViewOnly}
                    placeholder="e.g. Residential Building"
                  />
                </div>

                <div className="form-group-compact">
                  <label>Location</label>
                  <input
                    type="text" name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required disabled={isViewOnly}
                    placeholder="e.g. Quezon City"
                  />
                </div>

                <div className="form-group-compact">
                  <label>Contact Number</label>
                  <input
                    type="text" name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    maxLength="11" required disabled={isViewOnly}
                    placeholder="09XXXXXXXXX"
                  />
                </div>

                <div className="form-group-compact">
                  <label>Sales Rep</label>
                  <input
                    type="text"
                    value={formData.salesRep}
                    readOnly
                    className="locked-input-field"
                  />
                </div>

                <div className="form-group-compact">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={isViewOnly}
                  >
                    <option value="To be Contacted">To be Contacted</option>
                    <option value="Contacted">Contacted</option>
                    <option value="For Presentation">For Presentation</option>
                    <option value="Ready for Creating Project">Ready for Creating Project</option>
                    {formData.status === 'Project Created' && (
                      <option value="Project Created">Project Created</option>
                    )}
                  </select>
                </div>

                <div className="form-group-compact full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    disabled={isViewOnly}
                    placeholder="Add any relevant notes..."
                  />
                </div>
              </div>

              <div className="modal-footer-compact">
                {!isViewOnly && selectedLead && (
                  <button type="button" className="btn-delete" onClick={handleDelete}>
                    Move to Trash
                  </button>
                )}
                <div className="footer-right">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                    {isViewOnly ? 'Close' : 'Cancel'}
                  </button>
                  {!isViewOnly && (
                    <button type="submit" className="btn-save-lead">
                      {selectedLead ? 'Update' : 'Save Lead'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TRASH BIN MODAL
      ══════════════════════════════════════════ */}
      {isTrashOpen && (
        <div className="modal-overlay">
          <div className="compact-modal" style={{ maxWidth: '680px' }}>
            <div className="modal-header-compact">
              <h2>🗑️ Trash Bin</h2>
            </div>
            <div className="history-modal-body">
              <div className="history-list">
                {trashedLeads.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    Trash is empty.
                  </p>
                ) : (
                  trashedLeads.map(lead => (
                    <div key={lead.id} className="history-item" style={{ cursor: 'default' }}>
                      <div className="history-item-content">
                        <div className="history-item-title">{lead.project_name}</div>
                        <div className="history-item-client">Client: {lead.client_name}</div>
                      </div>
                      <div className="trash-item-actions">
                        <button className="btn-restore" onClick={() => handleRestore(lead.id)}>
                          Restore
                        </button>
                        <button
                          className="btn-delete"
                          style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                          onClick={() => handleForceDelete(lead.id)}
                        >
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="lead-form-compact" style={{ paddingTop: 0 }}>
              <div className="modal-footer-compact" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn-cancel" onClick={() => setIsTrashOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HISTORY MODAL — Created Projects
      ══════════════════════════════════════════ */}
      {isHistoryOpen && (
        <div className="modal-overlay">
          <div className="compact-modal">
            <div className="modal-header-compact">
              <h2>📂 Created Projects History</h2>
            </div>
            <div className="history-modal-body">
              <div className="history-list">
                {completedProjects.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    No history found.
                  </p>
                ) : (
                  completedProjects.map(proj => (
                    <div key={proj.id} className="history-item" onClick={() => handleViewHistoryDetails(proj)}>
                      <div className="history-item-content">
                        <div className="history-item-title">{proj.project_name}</div>
                        <div className="history-item-client">Client: {proj.client_name}</div>
                        <div className="history-item-location">📍 {proj.location}</div>
                      </div>
                      <span style={{ color: '#cbd5e1', fontSize: '1rem' }}>›</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="lead-form-compact" style={{ paddingTop: 0 }}>
              <div className="modal-footer-compact" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn-cancel" onClick={() => setIsHistoryOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING HISTORY BUTTON ── */}
      <div className="floating-history-btn" onClick={() => setIsHistoryOpen(true)}>
        <span>📂</span>
        Created Projects
        <span className="pill-count">{completedProjects.length}</span>
      </div>
    </div>
  );
};

export default Customer;