import React, { useState, useEffect, useRef } from 'react';
import api from '@/api/axios';
import './css/Customer.css';

// ── Pipeline stages ───────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'To be Contacted',    label: 'To Be Contacted',  color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8', border: '#e2e8f0' },
  { key: 'Contacted',          label: 'Contacted',        color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6', border: '#bfdbfe' },
  { key: 'For Presentation',   label: 'For Presentation', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
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

// ── Utility: Format Date & Time ───────────────────────────────────────────────
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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

// ── Contract Upload Button (inline, compact) ──────────────────────────────────
const ContractUploadButton = ({ leadId, contractsMap, onUpload }) => {
  const inputRef = useRef(null);
  const contract = contractsMap[leadId];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(leadId, file);
    e.target.value = '';
  };

  if (contract) {
    return (
      <div className="contract-uploaded-badge" onClick={(e) => e.stopPropagation()}>
        <span className="contract-check-icon">✔</span>
        <span className="contract-uploaded-name" title={contract.name}>
          {contract.name.length > 18 ? contract.name.slice(0, 16) + '…' : contract.name}
        </span>
        <button
          type="button"
          className="contract-remove-btn"
          onClick={(ev) => { ev.stopPropagation(); onUpload(leadId, null); }}
          title="Remove contract"
        >✕</button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn-upload-contract"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        title="Upload contract document or image to unlock Create Project"
      >
        📎 Upload Contract
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
};

// ── Contract Popup Modal ──────────────────────────────────────────────────────
const ContractPopup = ({ contractUrl, contractName, onClose }) => {
  if (!contractUrl) return null;

  const fileString = (contractName || contractUrl || '').split('?')[0];
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileString);
  const isPdf   = /\.pdf$/i.test(fileString);
  const label   = contractName || contractUrl.split('/').pop() || 'Contract';

  return (
    <div className="contract-popup-overlay" onClick={onClose}>
      <div className="contract-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="contract-popup-header">
          <div className="contract-popup-title">
            <span>{isImage ? '🖼️' : isPdf ? '📄' : '📎'}</span>
            <span title={label}>{label.length > 40 ? label.slice(0, 38) + '…' : label}</span>
          </div>
          <div className="contract-popup-actions">
            <a
              href={contractUrl}
              download={label}
              className="btn-contract-download"
              onClick={(e) => e.stopPropagation()}
              title="Download file"
            >
              ⬇ Download
            </a>
            <button type="button" className="contract-popup-close" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="contract-popup-body">
          {isImage && (
            <img src={contractUrl} alt={label} className="contract-popup-img" />
          )}
          {isPdf && (
            <iframe
              src={contractUrl}
              title={label}
              className="contract-popup-iframe"
              frameBorder="0"
            />
          )}
          {!isImage && !isPdf && (
            <div className="contract-popup-unsupported">
              <div className="contract-popup-unsupported-icon">📎</div>
              <p>Preview not available for this file type.</p>
              <a
                href={contractUrl}
                download={label}
                className="btn-view-contract"
                style={{ marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}
              >
                ⬇ Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Contract Viewer Strip (card + triggers popup) ─────────────────────────────
const ContractViewer = ({ contractUrl, contractName, onView }) => {
  if (!contractUrl) return null;

  const fileString = (contractName || contractUrl || '').split('?')[0];
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileString);
  const isPdf   = /\.pdf$/i.test(fileString);
  const label   = contractName || contractUrl.split('/').pop() || 'Contract';
  const short   = label.length > 22 ? label.slice(0, 20) + '…' : label;

  return (
    <div className="contract-viewer-strip" onClick={(e) => e.stopPropagation()}>
      <div className="contract-viewer-left">
        <span className="contract-viewer-icon">
          {isImage ? '🖼️' : isPdf ? '📄' : '📎'}
        </span>
        <span className="contract-viewer-name" title={label}>{short}</span>
      </div>
      <button
        type="button"
        className="btn-view-contract"
        onClick={(e) => { e.stopPropagation(); onView(); }}
      >
        View Contract
      </button>
    </div>
  );
};

// ── Kanban Card ───────────────────────────────────────────────────────────────
const KanbanCard = ({ lead, onClick, onCreateProject, onContractUpload, contractsMap, userRole }) => {
  const isReady = lead.status === 'Ready for Creating Project';
  const hasContract = !!contractsMap[lead.id];

  return (
    <div className="kanban-card" onClick={() => onClick(lead)}>
      <div className="kanban-card-top" style={{ justifyContent: 'flex-end' }}>
        <span className="kanban-card-date" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
          {lead.created_at ? formatDateTime(lead.created_at) : ''}
        </span>
      </div>
      <div className="kanban-card-client">{lead.client_name}</div>
      <div className="kanban-card-project">{lead.project_name}</div>
      <div className="kanban-card-location">📍 {lead.location}</div>
      {isReady && userRole !== 'manager' && (
        <div className="kanban-contract-row" onClick={(e) => e.stopPropagation()}>
          <ContractUploadButton
            leadId={lead.id}
            contractsMap={contractsMap}
            onUpload={onContractUpload}
          />
          <button
            type="button"
            className={`btn-create-project kanban-create-btn${!hasContract ? ' disabled-locked' : ''}`}
            disabled={!hasContract}
            onClick={(e) => {
              e.stopPropagation();
              if (hasContract) onCreateProject(e, lead);
            }}
            title={!hasContract ? 'Upload a contract first to unlock' : 'Create project'}
          >
            {!hasContract ? '🔒 Create Project' : 'Create Project'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Kanban Column ─────────────────────────────────────────────────────────────
const KanbanColumn = ({ stage, leads, onClick, onCreateProject, onContractUpload, contractsMap, userRole }) => (
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
            onCreateProject={onCreateProject}
            onContractUpload={onContractUpload}
            contractsMap={contractsMap}
            userRole={userRole} />
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

  const [leads, setLeads]               = useState([]);
  const [trashedLeads, setTrashedLeads] = useState([]);
  const [projectsMap, setProjectsMap]   = useState({});
  const [isLoading, setIsLoading]       = useState(true);
  const [isExporting, setIsExporting]   = useState(false);

  // contractsMap: { [leadId]: File } — holds uploaded contract per lead (pre-creation)
  const [contractsMap, setContractsMap] = useState({});

  // savedContractsMap: { [leadId]: { objectUrl, name } } — persists contract for viewing
  const [savedContractsMap, setSavedContractsMap] = useState({});

  // contractPopup: { url, name } | null — controls the contract preview popup
  const [contractPopup, setContractPopup] = useState(null);

  const [searchQuery, setSearchQuery]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth]   = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [formData, setFormData] = useState({
    clientName: '', projectName: '', location: '', contactNo: '',
    notes: '', status: 'To be Contacted', salesRep: user?.name || ''
  });

  // ── Contract Upload Handler ──────────────────────────────────────────────────
  const handleContractUpload = (leadId, file) => {
    setContractsMap(prev => {
      const next = { ...prev };
      if (file === null) {
        delete next[leadId];
      } else {
        next[leadId] = file;
      }
      return next;
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setIsFilterOpen(false);
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
      
      res.data.forEach(p => {
        if (p.lead_id) {
          map[p.lead_id] = p;
        }
      });
      
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

  useEffect(() => { fetchLeads(); fetchProjects(); fetchTrashedLeads(); }, []);

  const activeLeads       = leads.filter(l => l.status !== 'Project Created');
  const completedProjects = leads.filter(l => l.status === 'Project Created');

  const applyFilters = (list) => {
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

  const displayedActive = applyFilters(activeLeads);

  const displayedConverted = completedProjects.filter(l => {
    let match = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      match = l.client_name?.toLowerCase().includes(q) ||
              l.project_name?.toLowerCase().includes(q) ||
              l.location?.toLowerCase().includes(q);
    }
    if (match && filterMonth !== 'all') {
      const date = new Date(l.created_at);
      if (!isNaN(date.getTime())) {
         match = date.getMonth().toString() === filterMonth;
      } else {
         match = false;
      }
    }
    return match;
  });

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
    setIsViewOnly(user?.role === 'manager' || activeTab === 'converted');
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

  // ── Create Project (now accepts contract file via FormData) ───────────────
  const handleCreateProject = async (e, lead) => {
  e.stopPropagation();
  const contractFile = contractsMap[lead.id];
  if (!contractFile) {
    alert('Please upload a contract document or image first.');
    return;
  }
  if (!window.confirm(`Create project for ${lead.project_name}?`)) return;
  try {
    // REMOVED: the premature objectUrl / setSavedContractsMap block

    const formPayload = new FormData();
    formPayload.append('lead_id',      lead.id);
    formPayload.append('project_name', lead.project_name);
    formPayload.append('client_name',  lead.client_name);
    formPayload.append('location',     lead.location);
    formPayload.append('project_type', 'Construction Project');
    formPayload.append('status',       'Ongoing');
    formPayload.append('contract',     contractFile);

    await api.post('/projects', formPayload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setContractsMap(prev => {
      const next = { ...prev };
      delete next[lead.id];
      return next;
    });

    alert('Project created!');
    fetchLeads();
    fetchProjects(); // ← this populates projectsMap with the real contract_url
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

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let tabLabel = activeTab === 'converted' ? 'Converted Projects Report' : 'Active Leads Report';
    if (activeTab === 'converted' && filterMonth !== 'all') {
      tabLabel = `Converted Projects Report — ${monthNames[parseInt(filterMonth)]}`;
    } else if (activeTab === 'converted') {
      tabLabel = `Converted Projects Report — All Months`;
    }

    const lastCol = activeTab === 'converted' ? 'Project Stage' : 'Contact No.';
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
        <td><strong>${lead.client_name}</strong></td>
        <td>${lead.project_name}</td>
        <td>${lead.location}</td>
        <td><span style="color:${statusColors[lead.status] || '#64748b'};font-weight:600;font-size:11px;">${lead.status}</span></td>
        <td>${sixth}</td>
        <td>${lead.created_at ? formatDateTime(lead.created_at) : '—'}</td>
      </tr>`;
    }).join('');

    const summaryChips = activeTab === 'active'
      ? PIPELINE_STAGES.map(s => `
          <div class="chip">
            <div class="chip-val">${data.filter(l => l.status === s.key).length}</div>
            <div class="chip-label">${s.label}</div>
          </div>`).join('')
      : `<div class="chip"><div class="chip-val">${displayedConverted.length}</div><div class="chip-label">Total Converted</div></div>
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
          <th>Client</th><th>Project</th><th>Location</th>
          <th>Lead Status</th><th>${lastCol}</th><th>Date Added</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8">No records found.</td></tr>`}</tbody>
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
            <button type="button" className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
              </svg>
              Grid
            </button>
            <button type="button" className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="3.5" height="13" rx="1" fill="currentColor"/>
                <rect x="5.75" y="1" width="3.5" height="9" rx="1" fill="currentColor"/>
                <rect x="10.5" y="1" width="3.5" height="11" rx="1" fill="currentColor"/>
              </svg>
              Kanban
            </button>
          </div>

          <button type="button" className="btn-export-report" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? '⏳ Generating...' : '📄 Export as Report'}
          </button>

          {user?.role !== 'manager' && (
            <>
              <button type="button" className="btn-trash-bin"
                onClick={() => { fetchTrashedLeads(); setIsTrashOpen(true); }}>
                🗑️ Trash Bin
              </button>
              <button type="button" className="btn-add-lead"
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
          <button type="button" className={`lead-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => { setActiveTab('active'); setFilterStatus('all'); setFilterMonth('all'); setSearchQuery(''); }}>
            Active Leads
            <span className="tab-count">{activeLeads.length}</span>
          </button>
          <button type="button" className={`lead-tab ${activeTab === 'converted' ? 'active' : ''}`}
            onClick={() => { setActiveTab('converted'); setFilterStatus('all'); setFilterMonth('all'); setSearchQuery(''); }}>
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
              <button type="button" className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {activeTab === 'active' && (
            <div className="filter-wrap" ref={filterRef}>
              <button type="button" className={`btn-filter ${filterStatus !== 'all' ? 'has-filter' : ''}`}
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
                      type="button"
                      className={`filter-option ${filterStatus === opt ? 'selected' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFilterStatus(opt);
                        setIsFilterOpen(false);
                      }}>
                      {opt === 'all' ? '📋 All Statuses' : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'converted' && (
            <div className="filter-wrap">
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--pm-border-soft, #e2e8f0)',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#64748b',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">📅 All Months</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* LOADING */}
      {isLoading && <div className="spinner-container"><div className="loading-circle" /></div>}

      {/* ACTIVE LEADS TAB — GRID */}
      {!isLoading && activeTab === 'active' && viewMode === 'grid' && (
        <div className="lead-grid">
          {displayedActive.length === 0 ? (
            <div className="no-leads-container">
              <div className="no-leads-icon">📋</div>
              <h3>{searchQuery || filterStatus !== 'all' ? 'No Matching Leads' : 'No Active Leads'}</h3>
              <p>{searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filter.' : 'Your pipeline is clear. Start by adding a new lead.'}</p>
            </div>
          ) : displayedActive.map(lead => {
            const isReady   = lead.status === 'Ready for Creating Project';
            const hasContract = !!contractsMap[lead.id];
            return (
              <div key={lead.id} className="lead-card" onClick={() => handleCardClick(lead)}>
                <div className="lead-card-header">
                  <span className={`status-badge ${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>
                    {lead.status}
                  </span>
                  <span className="lead-card-date" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                    {lead.created_at ? formatDateTime(lead.created_at) : ''}
                  </span>
                </div>
                <div className="lead-body">
                  <h3>{lead.client_name}</h3>
                  <p>{lead.project_name}</p>
                  <small>📍 {lead.location}</small>
                </div>
                <div style={{ padding: '0 18px' }}>
                  <PipelineProgress status={lead.status} />
                </div>

                {/* Contract upload section — only shown when Ready and not manager */}
                {isReady && user?.role !== 'manager' && (
                  <div
                    className="card-contract-section"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="contract-section-label">
                      <span className="contract-section-icon">📝</span>
                      <span>Contract Required</span>
                    </div>
                    <ContractUploadButton
                      leadId={lead.id}
                      contractsMap={contractsMap}
                      onUpload={handleContractUpload}
                    />
                  </div>
                )}

                <div className="lead-card-footer">
                  <div className="lead-click-hint">
                    Click to View{user?.role !== 'manager' ? ' / Edit' : ''}
                  </div>
                  {isReady && user?.role !== 'manager' && (
                    <button
                      type="button"
                      className={`btn-create-project${!hasContract ? ' disabled-locked' : ''}`}
                      disabled={!hasContract}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasContract) handleCreateProject(e, lead);
                      }}
                      title={!hasContract ? 'Upload a contract to unlock' : 'Create project'}
                    >
                      {!hasContract ? '🔒 Create Project' : 'Create Project'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVE LEADS TAB — KANBAN */}
      {!isLoading && activeTab === 'active' && viewMode === 'kanban' && (
        <div className="kanban-board">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn key={stage.key} stage={stage}
              leads={displayedActive.filter(l => l.status === stage.key)}
              onClick={handleCardClick}
              onCreateProject={handleCreateProject}
              onContractUpload={handleContractUpload}
              contractsMap={contractsMap}
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
              <p>{searchQuery || filterMonth !== 'all' ? 'Try adjusting your search or month filter.' : 'Projects created from leads will appear here.'}</p>
            </div>
          ) : displayedConverted.map(lead => {
            const proj  = projectsMap[lead.id];
            const stage = proj ? getProjectStage(proj.status) : null;
            return (
              <div key={lead.id} className="lead-card converted-card"
                onClick={() => handleCardClick(lead)}>
                <div className="lead-card-header">
                  <span className="status-badge project-created">Project Created</span>
                  <span className="lead-card-date" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                    {lead.created_at ? formatDateTime(lead.created_at) : ''}
                  </span>
                </div>
                <div className="lead-body">
                  <h3>{lead.client_name}</h3>
                  <p>{lead.project_name}</p>
                  <small>📍 {lead.location}</small>
                </div>
                <div className="project-status-strip"
                  style={{ background: stage ? stage.bg : '#f1f5f9' }}>
                  <span className="project-status-label">📦 Project Stage</span>
                  <span className="project-status-badge"
                    style={{
                      color:      stage ? stage.color : '#64748b',
                      background: stage ? stage.bg    : '#f1f5f9',
                      border:     `1px solid ${stage ? stage.color + '40' : '#e2e8f0'}`,
                    }}>
                    {proj ? (proj.status || 'Ongoing') : '—'}
                  </span>
                </div>

                {(() => {
                  const saved = savedContractsMap[lead.id];
                  const contractUrl  = proj?.contract_url || lead.contract_url || saved?.objectUrl;
                  const contractName = proj?.contract_name || lead.contract_name || saved?.name;
                  if (!contractUrl) return null;
                  return (
                    <ContractViewer
                      contractUrl={contractUrl}
                      contractName={contractName}
                      onView={() => setContractPopup({ url: contractUrl, name: contractName })}
                    />
                  );
                })()}

                <div className="lead-card-footer">
                  <div className="lead-click-hint">Click to View Details</div>
                  {proj?.created_at && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      📅 {new Date(proj.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                  <input type="text" value={formData.salesRep} readOnly className="locked-input-field" />
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

                {/* ── Contract Upload — shown inside modal when status is Ready ── */}
                {selectedLead?.status === 'Ready for Creating Project' && !isViewOnly && (
                  <div className="form-group-compact full-width">
                    <label>
                      Contract Document
                      <span className="contract-required-tag">Required to create project</span>
                    </label>
                    <div className="modal-contract-upload-area">
                      <ContractUploadButton
                        leadId={selectedLead.id}
                        contractsMap={contractsMap}
                        onUpload={handleContractUpload}
                      />
                      {!contractsMap[selectedLead.id] && (
                        <p className="contract-hint-text">
                          📎 Upload a signed contract (PDF, Word, or image) before creating the project.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Contract Viewer — shown inside modal for converted projects ── */}
                {(() => {
                  if (selectedLead?.status !== 'Project Created') return null;
                  const proj = projectsMap[selectedLead.id];
                  const saved = savedContractsMap[selectedLead.id];
                  const contractUrl = proj?.contract_url || selectedLead.contract_url || saved?.objectUrl;
                  const contractName = proj?.contract_name || selectedLead.contract_name || saved?.name;
                  
                  const fileString = (contractName || contractUrl || '').split('?')[0];
                  const isImage = contractUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(fileString);
                  
                  const label = contractName || (contractUrl ? contractUrl.split('/').pop() : null) || 'Contract';
                  return (
                    <div className="form-group-compact full-width">
                      <label>
                        Contract Document
                        {contractUrl
                          ? <span className="contract-available-tag">Attached</span>
                          : <span className="contract-required-tag">No contract on file</span>
                        }
                      </label>
                      {contractUrl ? (
                        <div className="modal-contract-view-area">
                          {isImage && (
                            <div className="contract-image-preview">
                              <img
                                src={contractUrl}
                                alt="Contract preview"
                                className="contract-preview-img"
                              />
                            </div>
                          )}
                          <div className="contract-modal-view-row">
                            <div className="contract-modal-file-info">
                              <span className="contract-viewer-icon">
                                {isImage ? '🖼️' : /\.pdf$/i.test(fileString) ? '📄' : '📎'}
                              </span>
                              <span className="contract-viewer-name" title={label}>
                                {label.length > 30 ? label.slice(0, 28) + '…' : label}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn-view-contract"
                              onClick={() => setContractPopup({ url: contractUrl, name: contractName })}
                            >
                              View Document
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="modal-contract-view-area" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                          <p className="contract-hint-text" style={{ color: '#94a3b8' }}>
                            No contract document was attached to this project.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                      <button type="button" className="btn-restore" onClick={() => handleRestore(lead.id)}>Restore</button>
                      <button type="button" className="btn-delete"
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
                <button type="button" className="btn-cancel" onClick={() => setIsTrashOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CONTRACT PREVIEW POPUP */}
      {contractPopup && (
        <ContractPopup
          contractUrl={contractPopup.url}
          contractName={contractPopup.name}
          onClose={() => setContractPopup(null)}
        />
      )}

    </div>
  );
};

export default Customer;