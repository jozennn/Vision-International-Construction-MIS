import React, { useState, useEffect, useRef } from 'react';
import api from '@/api/axios';
import './css/Customer.css';

// ── Pipeline stages ───────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'To be Contacted',      label: 'To Be Contacted',  color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8', border: '#e2e8f0' },
  { key: 'Contacted',            label: 'Contacted',        color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6', border: '#bfdbfe' },
  { key: 'For Presentation',     label: 'For Presentation', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
  { key: 'Ready for Creating Project', label: 'Ready for Project', color: '#059669', bg: '#ecfdf5', dot: '#10b981', border: '#6ee7b7' },
];

const PROJECT_STAGES = [
  { key: 'boq',             label: 'BOQ',             color: '#6366f1', bg: '#eef2ff' },
  { key: 'site_inspection', label: 'Site Inspection', color: '#0891b2', bg: '#ecfeff' },
  { key: 'mobilization',    label: 'Mobilization',    color: '#d97706', bg: '#fffbeb' },
  { key: 'procurement',     label: 'Procurement',     color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'construction',    label: 'Construction',    color: '#059669', bg: '#ecfdf5' },
  { key: 'completed',       label: 'Completed',       color: '#16a34a', bg: '#dcfce7' },
  { key: 'Ongoing',         label: 'Ongoing',         color: '#2563eb', bg: '#eff6ff' },
];

const getProjectStage = (status) =>
  PROJECT_STAGES.find(s =>
    s.key === status?.toLowerCase() || s.key === status
  ) || { label: status || 'Ongoing', color: '#2563eb', bg: '#eff6ff' };

const getStageIndex = (status) =>
  PIPELINE_STAGES.findIndex(s => s.key === status);

// ── Pipeline Progress Bar ─────────────────────────────────────────────────────
const PipelineProgress = ({ status, inModal = false }) => {
  const idx = getStageIndex(status);
  const pct = idx < 0 ? 100 : (idx / (PIPELINE_STAGES.length - 1)) * 100;
  return (
    <div className={`pipeline-progress-wrap${inModal ? ' in-modal' : ''}`}>
      <div className="pipeline-progress-track">
        <div className="pipeline-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pipeline-progress-dots">
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s.key}
            className={`pipeline-dot${i <= idx ? ' active' : ''}`}
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
        {lead.created_at
          ? new Date(lead.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
          : ''}
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
  <div className="kanban-column"
    style={{ '--col-dot': stage.dot, '--col-border': stage.border, '--col-bg': stage.bg }}>
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
          <KanbanCard key={lead.id} lead={lead} onClick={onClick}
            onCreateProject={onCreateProject} userRole={userRole} />
        ))
      )}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Customer = ({ user }) => {
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isTrashOpen, setIsTrashOpen]   = useState(false);
  const [isViewOnly, setIsViewOnly]     = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode]         = useState('grid');
  const [activeTab, setActiveTab]       = useState('active');

  const [leads, setLeads]             = useState([]);
  const [trashedLeads, setTrashedLeads] = useState([]);
  const [projectsMap, setProjectsMap] = useState({});
  const [isLoading, setIsLoading]     = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [searchQuery, setSearchQuery]   = useState('');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [filterMonth, setFilterMonth] = useState('all');
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
  const monthFilterRef = useRef(null);

  const [formData, setFormData] = useState({
    clientName: '', projectName: '', location: '', contactNo: '',
    notes: '', status: 'To be Contacted', salesRep: user?.name || ''
  });

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setIsFilterOpen(false);
      if (monthFilterRef.current && !monthFilterRef.current.contains(e.target))
        setIsMonthFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isModalOpen || isTrashOpen) {
      document.body.classList.add('hide-hamburger');
    } else {
      document.body.classList.remove('hide-hamburger');
    }
    return () => document.body.classList.remove('hide-hamburger');
  }, [isModalOpen, isTrashOpen]);

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

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      const map = {};
      res.data.forEach(p => { if (p.lead_id) map[p.lead_id] = p; });
      setProjectsMap(map);
    } catch (err) {
      console.error('Projects fetch error:', err);
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

  useEffect(() => { fetchLeads(); fetchProjects(); }, []);

  const activeLeads       = leads.filter(l => l.status !== 'Project Created');
  const completedProjects = leads.filter(l => l.status === 'Project Created');

  // Dynamically get unique months from the converted projects
  const availableMonths = [...new Set(completedProjects.map(l => {
    if (!l.created_at) return null;
    return new Date(l.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));

  const applyActiveFilters = (list) => {
    let r = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(l =>
        l.client_name?.toLowerCase().includes(q) ||
        l.project_name?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') r = r.filter(l => l.status === filterStatus);
    return r;
  };

  const applyConvertedFilters = (list) => {
    return list.filter(l => {
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        matchesSearch = l.client_name?.toLowerCase().includes(q) ||
                        l.project_name?.toLowerCase().includes(q) ||
                        l.location?.toLowerCase().includes(q);
      }
      
      let matchesMonth = true;
      if (filterMonth !== 'all' && l.created_at) {
        const m = new Date(l.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        matchesMonth = m === filterMonth;
      }

      return matchesSearch && matchesMonth;
    });
  };

  const displayedActive = applyActiveFilters(activeLeads);
  const displayedConverted = applyConvertedFilters(completedProjects);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNo') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 11) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedLead(null); setIsViewOnly(false); };

  const handleCardClick = (lead) => {
    setSelectedLead(lead);
    // Force View Only if user is a manager OR if the lead is already converted to a project
    setIsViewOnly(user?.role === 'manager' || lead.status === 'Project Created');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewOnly) return;
    const payload = {
      client_name:  formData.clientName, project_name: formData.projectName,
      location:     formData.location,   contact_no:   formData.contactNo,
      notes:        formData.notes,      status:       formData.status
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
    } catch { alert('Action failed.'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Move this lead to the trash bin?')) return;
    try {
      await api.delete(`/leads/${selectedLead.id}`);
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      handleCloseModal();
    } catch { alert('Delete failed.'); }
  };

  const handleRestore = async (id) => {
    // Added restore alert logic
    if (!window.confirm('Want to restore?')) return;
    try {
      await api.put(`/leads/${id}/restore`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      fetchLeads();
      alert('Lead restored!');
    } catch { alert('Failed to restore.'); }
  };

  const handleForceDelete = async (id) => {
    if (!window.confirm('Delete permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/leads/${id}/force`);
      setTrashedLeads(prev => prev.filter(l => l.id !== id));
      alert('Deleted forever.');
    } catch { alert('Permanent delete failed.'); }
  };

  const handleCreateProject = async (e, lead) => {
    e.stopPropagation();
    if (!window.confirm(`Create project for ${lead.project_name}?`)) return;
    try {
      await api.post('/projects', {
        lead_id: lead.id, project_name: lead.project_name,
        client_name: lead.client_name, location: lead.location,
        project_type: 'Construction Project', status: 'Ongoing'
      });
      await api.put(`/leads/${lead.id}`, { ...lead, status: 'Project Created' });
      alert('Project created!');
      fetchLeads();
      fetchProjects();
      setActiveTab('converted');
    } catch { alert('Failed to create project.'); }
  };

  // ── PDF Export as Report ──────────────────────────────────────────────────
  const handleExportPDF = () => {
    setIsExporting(true);
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    const data    = activeTab === 'converted' ? displayedConverted : displayedActive;
    const tabLabel = activeTab === 'converted' ? 'Converted Projects Report' : 'Active Leads Report';
    const lastCol  = activeTab === 'converted' ? 'Project Stage' : 'Contact No.';

    const statusColors = {
      'To be Contacted':            '#64748b',
      'Contacted':                  '#2563eb',
      'For Presentation':           '#d97706',
      'Ready for Creating Project': '#059669',
      'Project Created':            '#7c3aed',
    };

    const rows = data.map(lead => {
      const proj  = projectsMap[lead.id];
      const ps    = proj ? getProjectStage(proj.status) : null;
      const sixth = activeTab === 'converted'
        ? (proj
            ? `<span style="background:${ps.bg};color:${ps.color};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${proj.status || 'Ongoing'}</span>`
            : '<span style="color:#94a3b8">—</span>')
        : (lead.contact_no || '—');
      return `<tr>
        <td>#${lead.id}</td>
        <td><strong>${lead.client_name}</strong></td>
        <td>${lead.project_name}</td>
        <td>${lead.location}</td>
        <td><span style="color:${statusColors[lead.status] || '#64748b'};font-weight:600;font-size:11px;">${lead.status}</span></td>
        <td>${sixth}</td>
        <td>${lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PH') : '—'}</td>
      </tr>`;
    }).join('');

    const summaryChips = activeTab === 'active'
      ? PIPELINE_STAGES.map(s => `
          <div class="chip">
            <div class="chip-val">${data.filter(l => l.status === s.key).length}</div>
            <div class="chip-label">${s.label}</div>
          </div>`).join('')
      : `<div class="chip"><div class="chip-val">${completedProjects.length}</div><div class="chip-label">Total Converted</div></div>
         <div class="chip"><div class="chip-val">${activeLeads.length}</div><div class="chip-label">Still Active</div></div>
         <div class="chip"><div class="chip-val">${leads.length}</div><div class="chip-label">Total Leads</div></div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>VICMIS — ${tabLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#221F1F;padding:40px;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #FF1817}
        .co-name{font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
        .co-sub{font-size:11px;color:#64748b;margin-top:3px}
        .rep-title{font-size:15px;font-weight:700;color:#FF1817;text-align:right}
        .rep-date{font-size:11px;color:#64748b;margin-top:4px;text-align:right}
        .chips{display:flex;gap:14px;margin-bottom:24px}
        .chip{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px}
        .chip-val{font-size:22px;font-weight:800;color:#221F1F}
        .chip-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-top:2px}
        .sec-title{font-size:11px;font-weight:700;color:#221F1F;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
        .sec-title::after{content:'';flex:1;height:1px;background:#e2e8f0}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#221F1F;color:#fff;padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
        th:first-child{border-radius:8px 0 0 0}th:last-child{border-radius:0 8px 0 0}
        td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:nth-child(even) td{background:#f8fafc}
        .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="co-name">Vision International Construction OPC</div>
          <div class="co-sub">VICMIS — Management Information System</div>
        </div>
        <div>
          <div class="rep-title">${tabLabel}</div>
          <div class="rep-date">Generated: ${dateStr} at ${timeStr}</div>
          <div class="rep-date">By: ${user?.name || 'System'} · ${user?.department || ''}</div>
        </div>
      </div>
      <div class="chips">
        <div class="chip"><div class="chip-val">${data.length}</div><div class="chip-label">Total Records</div></div>
        ${summaryChips}
      </div>
      <div class="sec-title">${tabLabel}</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Client</th><th>Project</th><th>Location</th>
          <th>Lead Status</th><th>${lastCol}</th><th>Date Added</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8">No records found.</td></tr>`}</tbody>
      </table>
      <div class="footer">
        <span>VICMIS — Confidential · Do not distribute</span>
        <span>${tabLabel} · ${dateStr}</span>
      </div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=960,height=720');
    if (win) { win.document.write(html); win.document.close(); }
    setIsExporting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="customer-container">

      {/* HEADER */}
      <div className="customer-header">
        <h1>Client Management</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              </svg>
              Grid
            </button>
            <button className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="3.5" height="13" rx="1" fill="currentColor"/>
                <rect x="5.75" y="1" width="3.5" height="9" rx="1" fill="currentColor"/>
                <rect x="10.5" y="1" width="3.5" height="11" rx="1" fill="currentColor"/>
              </svg>
              Kanban
            </button>
          </div>

          <button className="btn-export-report" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? '⏳ Generating...' : '📄 Export as Report'}
          </button>

          {user?.role !== 'manager' && (
            <>
              <button className="btn-trash-bin"
                onClick={() => { fetchTrashedLeads(); setIsTrashOpen(true); }}>
                🗑️ Trash Bin
              </button>
              <button className="btn-add-lead"
                onClick={() => { setIsViewOnly(false); setIsModalOpen(true); }}>
                + Add New Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* STATS BAR */}
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
        {PIPELINE_STAGES.map(stage => (
          <div className="stat-chip stage-chip" key={stage.key} style={{ '--stage-dot': stage.dot }}>
            <div className="stage-chip-dot" />
            <div className="stat-chip-info">
              <span className="stat-chip-value">{activeLeads.filter(l => l.status === stage.key).length}</span>
              <span className="stat-chip-label">{stage.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TAB + SEARCH ROW */}
      <div className="tab-search-row">
        <div className="lead-tabs">
          <button className={`lead-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => { 
              setActiveTab('active'); 
              setFilterStatus('all'); 
              setFilterMonth('all'); 
              setSearchQuery(''); 
            }}>
            Active Leads
            <span className="tab-count">{activeLeads.length}</span>
          </button>
          <button className={`lead-tab ${activeTab === 'converted' ? 'active' : ''}`}
            onClick={() => { 
              setActiveTab('converted'); 
              setFilterStatus('all'); 
              setFilterMonth('all'); 
              setSearchQuery(''); 
            }}>
            Converted Projects
            <span className="tab-count converted">{completedProjects.length}</span>
          </button>
        </div>

        <div className="search-filter-row">
          <div className="search-input-wrap">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#94a3b8" strokeWidth="2"/>
              <path d="m15 15 3.5 3.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input type="text" className="search-input"
              placeholder="Search client, project, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {/* Active Lead Status Filter */}
          {activeTab === 'active' && (
            <div className="filter-wrap" ref={filterRef}>
              <button className={`btn-filter ${filterStatus !== 'all' ? 'has-filter' : ''}`}
                onClick={() => setIsFilterOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {filterStatus === 'all' ? 'Filter' : filterStatus}
                {filterStatus !== 'all' && <span className="filter-active-dot" />}
              </button>
              {isFilterOpen && (
                <div className="filter-dropdown">
                  <div className="filter-dropdown-title">Filter by Status</div>
                  {['all', ...PIPELINE_STAGES.map(s => s.key)].map(opt => (
                    <button key={opt}
                      className={`filter-option ${filterStatus === opt ? 'selected' : ''}`}
                      onClick={() => { setFilterStatus(opt); setIsFilterOpen(false); }}>
                      {opt === 'all' ? '📋 All Statuses' : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Converted Projects Month Filter */}
          {activeTab === 'converted' && availableMonths.length > 0 && (
            <div className="filter-wrap" ref={monthFilterRef}>
              <button className={`btn-filter ${filterMonth !== 'all' ? 'has-filter' : ''}`}
                onClick={() => setIsMonthFilterOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {filterMonth === 'all' ? 'Month' : filterMonth}
                {filterMonth !== 'all' && <span className="filter-active-dot" />}
              </button>
              {isMonthFilterOpen && (
                <div className="filter-dropdown">
                  <div className="filter-dropdown-title">Filter by Month</div>
                  {['all', ...availableMonths].map(opt => (
                    <button key={opt}
                      className={`filter-option ${filterMonth === opt ? 'selected' : ''}`}
                      onClick={() => { setFilterMonth(opt); setIsMonthFilterOpen(false); }}>
                      {opt === 'all' ? '📅 All Months' : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LOADING */}
      {isLoading && <div className="spinner-container"><div className="loading-circle" /></div>}

      {/* ACTIVE LEADS TAB */}
      {!isLoading && activeTab === 'active' && viewMode === 'grid' && (
        <div className="lead-grid">
          {displayedActive.length === 0 ? (
            <div className="no-leads-container">
              <div className="no-leads-icon">📋</div>
              <h3>{searchQuery || filterStatus !== 'all' ? 'No Matching Leads' : 'No Active Leads'}</h3>
              <p>{searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filter.' : 'Your pipeline is clear. Start by adding a new lead.'}</p>
            </div>
          ) : displayedActive.map(lead => (
            <div key={lead.id} className="lead-card" onClick={() => handleCardClick(lead)}>
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
              <div style={{ padding: '0 18px' }}>
                <PipelineProgress status={lead.status} />
              </div>
              <div className="lead-card-footer">
                <div className="lead-click-hint">
                  Click to View{user?.role !== 'manager' ? ' / Edit' : ''}
                </div>
                {lead.status === 'Ready for Creating Project' && user?.role !== 'manager' && (
                  <button className="btn-create-project"
                    onClick={(e) => handleCreateProject(e, lead)}>
                    Create Project
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && activeTab === 'active' && viewMode === 'kanban' && (
        <div className="kanban-board">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn key={stage.key} stage={stage}
              leads={displayedActive.filter(l => l.status === stage.key)}
              onClick={handleCardClick} onCreateProject={handleCreateProject}
              userRole={user?.role} />
          ))}
        </div>
      )}

      {/* CONVERTED PROJECTS TAB */}
      {!isLoading && activeTab === 'converted' && (
        <div className="lead-grid">
          {displayedConverted.length === 0 ? (
            <div className="no-leads-container">
              <div className="no-leads-icon">📂</div>
              <h3>{searchQuery || filterMonth !== 'all' ? 'No Matching Projects' : 'No Converted Projects Yet'}</h3>
              <p>{searchQuery || filterMonth !== 'all' ? 'Try adjusting your search or filter.' : 'Projects created from leads will appear here.'}</p>
            </div>
          ) : displayedConverted.map(lead => {
            const proj  = projectsMap[lead.id];
            const stage = proj ? getProjectStage(proj.status) : null;
            return (
              <div key={lead.id} className="lead-card converted-card"
                onClick={() => handleCardClick(lead)}>
                <div className="lead-card-header">
                  <span className="status-badge project-created">Project Created</span>
                  <span className="lead-id">#{lead.id}</span>
                </div>
                <div className="lead-body">
                  <h3>{lead.client_name}</h3>
                  <p>{lead.project_name}</p>
                  <small>📍 {lead.location}</small>
                </div>
                {/* Live Project Stage */}
                <div className="project-status-strip"
                  style={{ background: stage ? stage.bg : '#f1f5f9' }}>
                  <span className="project-status-label">📦 Project Stage</span>
                  <span className="project-status-badge"
                    style={{
                      color:       stage ? stage.color : '#64748b',
                      background:  stage ? stage.bg    : '#f1f5f9',
                      border:      `1px solid ${stage ? stage.color + '40' : '#e2e8f0'}`,
                    }}>
                    {proj ? (proj.status || 'Ongoing') : '—'}
                  </span>
                </div>
                <div className="lead-card-footer">
                  <div className="lead-click-hint">Click to View Details</div>
                  {/* Updated: Created Date & Time using lead.created_at */}
                  {lead.created_at && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      📅 Created: {new Date(lead.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MAIN MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="compact-modal">
            <div className="modal-header-compact">
              <h2>
                {isViewOnly ? '📄 Lead Details' : selectedLead ? '✏️ Update Lead' : '+ New Lead Entry'}
              </h2>
              {selectedLead && (
                <div className="modal-pipeline-progress">
                  <PipelineProgress status={selectedLead.status} inModal />
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="lead-form-compact">
              <div className="compact-grid">
                <div className="form-group-compact">
                  <label>Client Name</label>
                  <input type="text" name="clientName" value={formData.clientName}
                    onChange={handleInputChange} required disabled={isViewOnly}
                    placeholder="e.g. Juan Dela Cruz" />
                </div>
                <div className="form-group-compact">
                  <label>Project Name</label>
                  <input type="text" name="projectName" value={formData.projectName}
                    onChange={handleInputChange} required disabled={isViewOnly}
                    placeholder="e.g. Residential Building" />
                </div>
                <div className="form-group-compact">
                  <label>Location</label>
                  <input type="text" name="location" value={formData.location}
                    onChange={handleInputChange} required disabled={isViewOnly}
                    placeholder="e.g. Quezon City" />
                </div>
                <div className="form-group-compact">
                  <label>Contact Number</label>
                  <input type="text" name="contactNo" value={formData.contactNo}
                    onChange={handleInputChange} maxLength="11" required disabled={isViewOnly}
                    placeholder="09XXXXXXXXX" />
                </div>
                <div className="form-group-compact">
                  <label>Sales Rep</label>
                  <input type="text" value={formData.salesRep} readOnly className="locked-input-field" disabled={isViewOnly} />
                </div>
                <div className="form-group-compact">
                  <label>Status</label>
                  <select name="status" value={formData.status}
                    onChange={handleInputChange} disabled={isViewOnly}>
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
                  <textarea name="notes" value={formData.notes}
                    onChange={handleInputChange} disabled={isViewOnly}
                    placeholder="Add any relevant notes..." />
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

      {/* TRASH BIN MODAL */}
      {isTrashOpen && (
        <div className="modal-overlay">
          <div className="compact-modal" style={{ maxWidth: '680px' }}>
            <div className="modal-header-compact"><h2>🗑️ Trash Bin</h2></div>
            <div className="history-modal-body">
              <div className="history-list">
                {trashedLeads.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Trash is empty.</p>
                ) : trashedLeads.map(lead => (
                  <div key={lead.id} className="history-item" style={{ cursor: 'default' }}>
                    <div className="history-item-content">
                      <div className="history-item-title">{lead.project_name}</div>
                      <div className="history-item-client">Client: {lead.client_name}</div>
                    </div>
                    <div className="trash-item-actions">
                      <button className="btn-restore" onClick={() => handleRestore(lead.id)}>Restore</button>
                      <button className="btn-delete"
                        style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleForceDelete(lead.id)}>
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};

export default Customer;