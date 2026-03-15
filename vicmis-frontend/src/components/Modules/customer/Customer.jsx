import React, { useState, useEffect } from 'react';
import api from '@/api/axios'; 
import './css/Customer.css';

const Customer = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [leads, setLeads] = useState([]);
  const [trashedLeads, setTrashedLeads] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    location: '',
    contactNo: '',
    notes: '',
    status: 'To be Contacted',
    salesRep: user?.name || ''
  });

  // Hide Hamburger Menu when any Modal is open
  useEffect(() => {
    if (isModalOpen || isHistoryOpen || isTrashOpen) {
      document.body.classList.add('hide-hamburger');
    } else {
      document.body.classList.remove('hide-hamburger');
    }
    return () => document.body.classList.remove('hide-hamburger');
  }, [isModalOpen, isHistoryOpen, isTrashOpen]);

  // Sync form data
  useEffect(() => {
    if (selectedLead) {
      setFormData({
        clientName: selectedLead.client_name || '',
        projectName: selectedLead.project_name || '',
        location: selectedLead.location || '',
        contactNo: selectedLead.contact_no || '',
        notes: selectedLead.notes || '',
        status: selectedLead.status || 'To be Contacted',
        salesRep: selectedLead.sales_rep?.name || user?.name || ''
      });
    } else {
      setFormData({
        clientName: '', projectName: '', location: '', contactNo: '', notes: '', status: 'To be Contacted', salesRep: user?.name || ''
      });
    }
  }, [selectedLead, isModalOpen, user]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrashedLeads = async () => {
    try {
      const res = await api.get('/leads/trash/all');
      setTrashedLeads(res.data);
    } catch (err) {
      console.error("Error fetching trash:", err);
    }
  };

  useEffect(() => { 
    fetchLeads(); 
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNo') {
      const onlyNumbers = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: onlyNumbers.slice(0, 11) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
    setIsViewOnly(false);
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
      client_name: formData.clientName,
      project_name: formData.projectName,
      location: formData.location,
      contact_no: formData.contactNo,
      notes: formData.notes,
      status: formData.status
    };

    try {
      if (selectedLead) {
        const res = await api.put(`/leads/${selectedLead.id}`, payload);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? res.data : l));
        alert("Lead updated!");
      } else {
        const res = await api.post('/leads', payload);
        setLeads(prev => [res.data, ...prev]);
        alert("Lead created!");
      }
      handleCloseModal();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Action failed.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Move this lead to the trash bin?")) return;
    try {
      await api.delete(`/leads/${selectedLead.id}`);
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      handleCloseModal();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed.");
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/leads/${id}/restore`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      fetchLeads();
      alert("Lead restored!");
    } catch (err) {
      console.error("Restore error:", err);
      alert("Failed to restore.");
    }
  };

  const handleForceDelete = async (id) => {
    if (!window.confirm("Delete permanently? This cannot be undone.")) return;
    try {
      await api.delete(`/leads/${id}/force`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      alert("Deleted forever.");
    } catch (err) {
      console.error("Force delete error:", err);
      alert("Permanent delete failed.");
    }
  };

  const handleCreateProject = async (e, lead) => {
    e.stopPropagation(); 
    if (window.confirm(`Create project for ${lead.project_name}?`)) {
      try {
        const projectPayload = {
          lead_id: lead.id,
          project_name: lead.project_name,
          client_name: lead.client_name,
          location: lead.location,
          project_type: 'Construction Project',
          status: 'Ongoing' 
        };
        await api.post('/projects', projectPayload); 
        await api.put(`/leads/${lead.id}`, { ...lead, status: 'Project Created' });
        alert(`Project created!`);
        fetchLeads(); 
      } catch (err) {
        console.error("Project error:", err);
        alert("Failed to create project.");
      }
    }
  };

  const activeLeads = leads.filter(l => l.status !== 'Project Created');
  const completedProjects = leads.filter(l => l.status === 'Project Created');

  return (
    <div className="customer-container">
      <div className="customer-header">
        <h1>Client Management</h1>
        <div className="header-actions">
          {/* 👇 HIDDEN FOR MANAGERS */}
          {user?.role !== 'manager' && (
            <>
              <button className="btn-cancel" onClick={() => { fetchTrashedLeads(); setIsTrashOpen(true); }}>
                🗑️ Trash Bin
              </button>
              <button className="btn-add-lead" onClick={() => { setIsViewOnly(false); setIsModalOpen(true); }}>
                + Add New Lead
              </button>
            </>
          )}
        </div>
      </div>

      <div className="lead-grid">
        {isLoading ? (
          <div className="spinner-container"><div className="loading-circle"></div></div>
        ) : activeLeads.length === 0 ? (
          <div className="no-leads-container">
            <div className="no-leads-icon">📋</div>
            <h3>No Active Leads</h3>
            <p>Your pipeline is clear. Start by adding a new lead.</p>
          </div>
        ) : (
          activeLeads.map((lead) => (
            <div key={lead.id} className="lead-card" 
                 /* 👇 FORCES VIEW ONLY IF MANAGER */
                 onClick={() => { setSelectedLead(lead); setIsViewOnly(user?.role === 'manager'); setIsModalOpen(true); }}>
              <div className="lead-card-header">
                <span className={`status-badge ${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>{lead.status}</span>
                <span className="lead-id">#{lead.id}</span>
              </div>
              <div className="lead-body">
                <h3>{lead.client_name}</h3>
                <p>{lead.project_name}</p>
                <small>📍 {lead.location}</small>
              </div>
              <div className="lead-card-footer">
                <div className="lead-click-hint">Click to View{user?.role !== 'manager' ? '/Edit' : ''}</div>
                {/* 👇 HIDDEN FOR MANAGERS */}
                {lead.status === 'Ready for Creating Project' && user?.role !== 'manager' && (
                  <button className="btn-create-project" onClick={(e) => handleCreateProject(e, lead)}> 
                    Create Project 
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MAIN MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content compact-modal">
            <div className="modal-header-compact">
              <h2>{isViewOnly ? `Project Details` : selectedLead ? `Update Lead` : 'New Lead Entry'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="lead-form-compact">
              <div className="compact-grid">
                <div className="form-group-compact"><label>Client Name</label><input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} required disabled={isViewOnly} /></div>
                <div className="form-group-compact"><label>Project Name</label><input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} required disabled={isViewOnly} /></div>
                <div className="form-group-compact"><label>Location</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} required disabled={isViewOnly} /></div>
                <div className="form-group-compact"><label>Contact Number</label><input type="text" name="contactNo" value={formData.contactNo} onChange={handleInputChange} maxLength="11" required disabled={isViewOnly} /></div>
                <div className="form-group-compact"><label>Sales Rep</label><input type="text" value={formData.salesRep} readOnly className="locked-input-field" /></div>
                <div className="form-group-compact">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} disabled={isViewOnly}>
                    <option value="To be Contacted">To be Contacted</option>
                    <option value="Contacted">Contacted</option>
                    <option value="For Presentation">For Presentation</option>
                    <option value="Ready for Creating Project">Ready for Creating Project</option>
                    {formData.status === 'Project Created' && <option value="Project Created">Project Created</option>}
                  </select>
                </div>
                <div className="form-group-compact full-width"><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} disabled={isViewOnly}></textarea></div>
              </div>
              <div className="modal-footer-compact">
                {!isViewOnly && selectedLead && <button type="button" className="btn-delete" onClick={handleDelete}>Move to Trash</button>}
                <div className="footer-right">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>{isViewOnly ? 'Close' : 'Cancel'}</button>
                  {!isViewOnly && <button type="submit" className="btn-save-lead">Save</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TRASH BIN MODAL --- */}
      {isTrashOpen && (
        <div className="modal-overlay">
          <div className="compact-modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header-compact"><h2>🗑️ Trash Bin</h2></div>
            <div className="history-list">
              {trashedLeads.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Trash is empty.</p>
              ) : (
                trashedLeads.map(lead => (
                  <div key={lead.id} className="history-item">
                    <div className="history-item-content">
                      <div className="history-item-title">{lead.project_name}</div>
                      <div className="history-item-client">Client: {lead.client_name}</div>
                    </div>
                    <div className="trash-item-actions">
                      <button className="btn-restore" onClick={() => handleRestore(lead.id)}>Restore</button>
                      <button className="btn-delete" style={{ padding: '8px 12px' }} onClick={() => handleForceDelete(lead.id)}>Delete Forever</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer-compact" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setIsTrashOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {isHistoryOpen && (
        <div className="modal-overlay">
          <div className="compact-modal">
            <div className="modal-header-compact"><h2>Created Projects History</h2></div>
            <div className="history-list">
              {completedProjects.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No history found.</p>
              ) : (
                completedProjects.map(proj => (
                  <div key={proj.id} className="history-item" onClick={() => handleViewHistoryDetails(proj)}>
                    <div className="history-item-content">
                        <div className="history-item-title">{proj.project_name}</div>
                        <div className="history-item-client">Client: {proj.client_name}</div>
                        <div className="history-item-location">📍 {proj.location}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer-compact" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setIsHistoryOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="floating-history-btn" onClick={() => setIsHistoryOpen(true)}>
        <span>📂</span> Created Projects ({completedProjects.length})
      </div>
    </div>
  );
};

export default Customer;