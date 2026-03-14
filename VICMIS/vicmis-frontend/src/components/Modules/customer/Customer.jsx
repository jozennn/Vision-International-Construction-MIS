import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/api/axios';
import './css/Customer.css';

const Customer = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    location: '',
    contactNo: '',
    notes: '',
    status: 'To be Contacted',
    salesRep: user?.name || ''
  });

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        clientName: selectedLead.client_name || '',
        projectName: selectedLead.project_name || '',
        location: selectedLead.location || '',
        contactNo: selectedLead.contact_no || '',
        notes: selectedLead.notes || '',
        status: selectedLead.status || 'To be Contacted',
        salesRep: selectedLead.sales_rep?.name || user?.name
      });
    } else {
      setFormData(prev => ({
        ...prev,
        clientName: '', projectName: '', location: '', contactNo: '', notes: '',
        status: 'To be Contacted',
        salesRep: user?.name || ''
      }));
    }
  }, [selectedLead, isModalOpen, user]);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setLeads(leads.map(l => l.id === selectedLead.id ? res.data : l));
        alert("Lead updated!");
      } else {
        const res = await api.post('/leads', payload);
        setLeads(prev => [res.data, ...prev]);
        alert("Lead created!");
      }
      handleCloseModal();
    } catch (err) {
      alert("Action failed. Check console.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this lead permanently?")) {
      try {
        await api.delete(`/leads/${selectedLead.id}`);
        setLeads(leads.filter(l => l.id !== selectedLead.id));
        handleCloseModal();
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  // --- NEW FUNCTION: Handle Project Creation ---
  const handleCreateProject = async (e, lead) => {
    e.stopPropagation(); // Prevents the edit modal from opening when clicking the button

    if (window.confirm(`Are you sure you want to create a construction project for ${lead.project_name}?`)) {
      try {
        // 1. Send data to your Projects table/endpoint
        // Adjust the payload fields based on what your backend expects for a "Project"
        const projectPayload = {
          lead_id: lead.id,
          project_name: lead.project_name,
          client_name: lead.client_name,
          location: lead.location,
          project_type: 'Construction Project', // Tagging it as requested
          status: 'Ongoing'
        };
        await api.post('/projects', projectPayload);

        // 2. Update the lead's status so the button disappears
        const updatedLeadPayload = { ...lead, status: 'Project Created' };
        await api.put(`/leads/${lead.id}`, updatedLeadPayload);

        // 3. Refresh the UI
        alert(`Project "${lead.project_name}" successfully created! You can now view it in the Project module.`);
        fetchLeads();

      } catch (err) {
        console.error("Project creation failed:", err);
        alert("Failed to create project. Please check your backend connections.");
      }
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l =>
      l.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  return (
    <div className="customer-container">
      <div className="customer-header">
        <h1>Client Management</h1>
        <div className="search-bar-wrapper">
          <input
            type="text"
            placeholder="Search leads..."
            className="search-input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-add-lead" onClick={() => setIsModalOpen(true)}>+ Add New Lead</button>
      </div>

      <div className="lead-grid">
        {isLoading ? (
          <div className="spinner-container"><div className="loading-circle"></div></div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="lead-card" onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }}>
              <div className="lead-card-header">
                <span className={`status-badge ${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>{lead.status}</span>
                <span className="lead-id">#{lead.id}</span>
              </div>
              <div className="lead-body">
                <h3>{lead.client_name}</h3>
                <p>{lead.project_name}</p>
                <small>📍 {lead.location}</small>
              </div>

              {/* Updated Footer Area to accommodate the new button */}
              <div className="lead-card-footer">
                <div className="lead-click-hint">Click to View/Edit</div>

                {/* --- NEW BUTTON: Only shows if status is Ready --- */}
                {lead.status === 'Ready for Creating Project' &&
                  (<button className="btn-create-project" onClick={(e) =>
                    handleCreateProject(e, lead)}> Create Project
                  </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content compact-modal">
            <div className="modal-header-compact">
              <h2>{selectedLead ? `Update Lead: ${formData.clientName}` : 'New Lead Entry'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="lead-form-compact">
              <div className="compact-grid">
                <div className="form-group-compact">
                  <label>Client Name</label>
                  <input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} required />
                </div>
                <div className="form-group-compact">
                  <label>Project Name</label>
                  <input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} required />
                </div>
                <div className="form-group-compact">
                  <label>Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} required />
                </div>
                <div className="form-group-compact">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      // Allow: digits, backspace, delete, tab, arrows, home/end
                      const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                      if (!/\d/.test(e.key) && !allowed.includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    maxLength="11"
                    minLength="11"
                    pattern="\d{11}"
                    title="Please enter exactly 11 digits"
                    placeholder="09XXXXXXXXX"
                    required
                  />        </div>
                <div className="form-group-compact">
                  <label>Sales Representative</label>
                  <input type="text" value={formData.salesRep} readOnly className="locked-input-field" />
                </div>
                <div className="form-group-compact">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="To be Contacted">To be Contacted</option>
                    <option value="Contacted">Contacted</option>
                    <option value="For Presentation">For Presentation</option>
                    <option value="Ready for Creating Project">Ready for Creating Project</option>
                    {/* Added a new status so you can mark it completed later */}
                    <option value="Project Created">Project Created</option>
                  </select>
                </div>
                <div className="form-group-compact full-width">
                  <label>Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange}></textarea>
                </div>
              </div>
              <div className="modal-footer-compact">
                {selectedLead && (
                  <button type="button" className="btn-delete" onClick={handleDelete}>Delete</button>
                )}
                <div className="footer-right">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn-save-lead">
                    {selectedLead ? 'Save Changes' : 'Save Lead'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer;