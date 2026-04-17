import React, { useState, useEffect, useMemo } from "react";
import api from "@/api/axios";
import "../css/ProjectManagement.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getStatusVariant = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('billing') || s.includes('completed') && s !== 'completed') return 'billing';
    if (s === 'completed' || s === 'archived')                                  return 'completed';
    if (s.includes('pending') || s.includes('request'))                        return 'pending';
    if (s.includes('monitoring') || s.includes('inspection') || s.includes('quality')) return 'active';
    if (s.includes('measurement') || s.includes('boq') || s.includes('floor')) return 'engineering';
    return 'sales';
};

const STRIP_CLASS = {
    active:      'strip-active',
    pending:     'strip-pending',
    billing:     'strip-billing',
    completed:   'strip-completed',
    engineering: 'strip-engineering',
    sales:       'strip-sales',
};

const CHIP_CLASS = {
    active:      'chip-active',
    pending:     'chip-pending',
    billing:     'chip-billing',
    completed:   'chip-completed',
    engineering: 'chip-engineering',
    sales:       'chip-engineering',
};

const shortStatus = (status = '') => {
    const map = {
        'Site Inspection & Project Monitoring': 'Monitoring',
        'Deployment and Orientation of Installers': 'Deployment',
        'Contract Signing for Installer': 'Contract Signing',
        'Checking of Delivery of Materials': 'DR Verification',
        'Measurement based on Plan': 'Plan Measurement',
        'Pending Work Order Verification': 'WO Verification',
        'Final Site Inspection with the Client': 'Client Walkthrough',
        'Site Inspection & Quality Checking': 'QA/QC',
        'P.O & Work Order': 'P.O & W.O.',
    };
    return map[status] || status;
};

// ── Component ─────────────────────────────────────────────────────────────────
const ProjectManagement = ({
    onSelectProject,
    currentUserId,
    currentUserDept,
    currentUserRole,
    isDeptHeadAny,
}) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'completed' | 'archived'
    
    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // ── Fetch active projects ────────────────────────────────────────────────
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await api.get("/projects");
            const data = res.data;
            setProjects(Array.isArray(data) ? data : (data.projects ?? []));
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? null;
            setError(msg
                ? `Server error: ${msg}`
                : "Could not load projects. Please check your backend connection."
            );
        } finally {
            setLoading(false);
        }
    };

    // ── Fetch archived projects ───────────────────────────────────────────────
    const fetchArchivedProjects = async () => {
        try {
            setLoading(true);
            const res = await api.get("/projects/trashed");
            setProjects(res.data);
        } catch (err) {
            setError('Failed to load archived projects.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Both Active and Completed use the main /projects endpoint
        if (viewMode === 'active' || viewMode === 'completed') {
            fetchProjects();
        } else {
            fetchArchivedProjects();
        }
    }, [viewMode]);

    // ── Archive project ───────────────────────────────────────────────────────
    const handleArchiveProject = async (projectId, projectName) => {
        if (!window.confirm(`Archive "${projectName}"?\n\nIt will be moved to the archive and can be restored later.`)) return;
        try {
            await api.delete(`/projects/${projectId}`);
            fetchProjects();
        } catch (err) {
            alert('Failed to archive project.');
        }
    };

    // ── Restore project ───────────────────────────────────────────────────────
    const handleRestoreProject = async (projectId, projectName) => {
        if (!window.confirm(`Restore "${projectName}" from archive?`)) return;
        try {
            await api.post(`/projects/${projectId}/restore`);
            fetchArchivedProjects();
        } catch (err) {
            alert('Failed to restore project.');
        }
    };

    // ── Permanently delete project ────────────────────────────────────────────
    const handlePermanentDelete = async (projectId, projectName) => {
        if (!window.confirm(`PERMANENTLY DELETE "${projectName}"?\n\nThis CANNOT be undone! All project data will be lost forever.`)) return;
        try {
            await api.delete(`/projects/${projectId}/force`);
            fetchArchivedProjects();
        } catch (err) {
            alert('Failed to delete project.');
        }
    };

    // ── Filter & Search Logic ─────────────────────────────────────────────────
    const displayedProjects = useMemo(() => {
        return projects.filter((proj) => {
            const variant = getStatusVariant(proj.status);

            // 1. View Mode logic
            if (viewMode === 'active' && variant === 'completed') return false;
            if (viewMode === 'completed' && variant !== 'completed') return false;
            // Archive mode bypasses variant check since it's an isolated API call

            // 2. Search logic (ID, Project Name, Client Name)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchName = proj.project_name?.toLowerCase().includes(query);
                const matchClient = proj.client_name?.toLowerCase().includes(query);
                const matchId = `proj-${String(proj.id).padStart(4, '0')}`.includes(query);
                
                if (!matchName && !matchClient && !matchId) return false;
            }

            // 3. Status Filter logic
            if (filterStatus && variant !== filterStatus) return false;

            return true;
        });
    }, [projects, viewMode, searchQuery, filterStatus]);


    // ── Loading ──
    if (loading) {
        return (
            <div className="pm-page">
                <div className="pm-page-header">
                    <div className="pm-page-header-left">
                        <span className="pm-page-eyebrow">Vision International Construction</span>
                        <h1 className="pm-page-title">Project <span>Management</span></h1>
                    </div>
                </div>
                <div className="pm-loading">
                    <div className="pm-spinner"></div>
                    <span className="pm-loading-text">Loading projects…</span>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="pm-page">
                <div className="pm-page-header">
                    <div className="pm-page-header-left">
                        <span className="pm-page-eyebrow">Vision International Construction</span>
                        <h1 className="pm-page-title">Project <span>Management</span></h1>
                    </div>
                    <button 
                        className="pm-back-btn"
                        onClick={() => {
                            setError(null);
                            setViewMode('active');
                            fetchProjects();
                        }}
                    >
                        ← Back to Active Projects
                    </button>
                </div>
                <div className="pm-error">⚠️ {error}</div>
            </div>
        );
    }

    // ── Main ──
    return (
        <div className="pm-page">

            {/* Header */}
            <div className="pm-page-header">
                <div className="pm-page-header-left">
                    <span className="pm-page-eyebrow">Vision International Construction OPC</span>
                    <h1 className="pm-page-title">Project <span>Management</span></h1>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    
                    {/* View toggles & count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                                className={`pm-view-toggle ${viewMode === 'active' ? 'active' : ''}`}
                                onClick={() => { setViewMode('active'); setFilterStatus(""); setSearchQuery(""); }}
                            >
                                🏗️ Active
                            </button>
                            <button 
                                className={`pm-view-toggle ${viewMode === 'completed' ? 'active' : ''}`}
                                onClick={() => { setViewMode('completed'); setFilterStatus(""); setSearchQuery(""); }}
                            >
                                ✅ Completed
                            </button>
                            <button 
                                className={`pm-view-toggle ${viewMode === 'archived' ? 'active' : ''}`}
                                onClick={() => { setViewMode('archived'); setFilterStatus(""); setSearchQuery(""); }}
                            >
                                📦 Archive
                            </button>
                        </div>
                        <div className="pm-page-count">
                            <strong>{displayedProjects.length}</strong>
                            {displayedProjects.length === 1 ? ' project' : ' projects'} 
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
                        <input 
                            type="text"
                            placeholder="Search by ID, Name or Client..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: '1px solid #d1d5db',
                                outline: 'none',
                                fontSize: '14px',
                                minWidth: '240px'
                            }}
                        />
                        
                        {/* Only show category filter when looking at active projects */}
                        {viewMode === 'active' && (
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid #d1d5db',
                                    outline: 'none',
                                    fontSize: '14px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">All Categories</option>
                                <option value="pending">Pending</option>
                                <option value="active">Active (Monitoring)</option>
                                <option value="engineering">Engineering</option>
                                <option value="sales">Sales</option>
                                <option value="billing">Billing</option>
                            </select>
                        )}
                    </div>

                </div>
            </div>

            {/* Grid */}
            <div className="pm-project-grid">
                {displayedProjects.length === 0 ? (
                    <div className="pm-empty">
                        <div className="pm-empty-icon">
                            {viewMode === 'active' ? '🏗️' : viewMode === 'completed' ? '✅' : '📦'}
                        </div>
                        <h3 className="pm-empty-title">
                            {viewMode === 'active' ? 'No active projects found' 
                                : viewMode === 'completed' ? 'No completed projects found' 
                                : 'No archived projects found'}
                        </h3>
                        <p className="pm-empty-sub">
                            {searchQuery || filterStatus
                                ? 'Try adjusting your search or filter terms.'
                                : viewMode === 'active' 
                                    ? 'Create a project from the Customer module to get started.'
                                    : 'Completed or archived projects will appear here.'}
                        </p>
                    </div>
                ) : (
                    displayedProjects.map((proj) => {
                        const variant = getStatusVariant(proj.status);
                        const engineers = Array.isArray(proj.assigned_engineers)
                            ? proj.assigned_engineers
                                .map(e => typeof e === 'string' ? e : e?.name)
                                .filter(Boolean)
                                .join(', ')
                            : (proj.assigned_engineers ?? '');
                        
                        const isArchived = viewMode === 'archived';

                        return (
                            <div
                                key={proj.id}
                                className={`pm-proj-card ${isArchived ? 'archived' : ''}`}
                                onClick={() => !isArchived && onSelectProject(proj)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && !isArchived && onSelectProject(proj)}
                                aria-label={`Open ${proj.project_name}`}
                                style={{ cursor: isArchived ? 'default' : 'pointer' }}
                            >
                                {/* Color strip */}
                                <div className={`pm-card-strip ${STRIP_CLASS[variant]}`} />

                                {/* Card head */}
                                <div className="pm-card-head">
                                    <span className="pm-card-id">PROJ-{String(proj.id).padStart(4, '0')}</span>
                                    <span className={`pm-status-chip ${CHIP_CLASS[variant]}`}>
                                        <span className="pm-status-dot" />
                                        {shortStatus(proj.status) || 'ONGOING'}
                                    </span>
                                </div>

                                {/* Card body */}
                                <div className="pm-card-body">
                                    <h3 className="pm-card-project-name">{proj.project_name}</h3>

                                    <div className="pm-card-meta">
                                        <div className="pm-card-meta-row">
                                            <span className="pm-card-meta-key">Client</span>
                                            <span className="pm-card-meta-val">{proj.client_name}</span>
                                        </div>
                                        <div className="pm-card-meta-row">
                                            <span className="pm-card-meta-key">Location</span>
                                            <span className="pm-card-meta-val">{proj.location || '—'}</span>
                                        </div>
                                        {proj.created_by_name && (
                                            <div className="pm-card-meta-row">
                                                <span className="pm-card-meta-key">Sales</span>
                                                <span className="pm-card-meta-val">{proj.created_by_name}</span>
                                            </div>
                                        )}
                                        {engineers && (
                                            <div className="pm-card-meta-row">
                                                <span className="pm-card-meta-key">Engineer</span>
                                                <span className="pm-card-meta-val">{engineers}</span>
                                            </div>
                                        )}
                                        {isArchived && proj.deleted_at && (
                                            <div className="pm-card-meta-row">
                                                <span className="pm-card-meta-key">Archived</span>
                                                <span className="pm-card-meta-val">
                                                    {new Date(proj.deleted_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div className="pm-card-foot">
                                    {isArchived ? (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <button 
                                                className="pm-restore-btn"
                                                onClick={(e) => { e.stopPropagation(); handleRestoreProject(proj.id, proj.project_name); }}
                                            >
                                                ↩ Restore
                                            </button>
                                            <button 
                                                className="pm-delete-btn"
                                                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(proj.id, proj.project_name); }}
                                            >
                                                ✕ Delete Permanently
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="pm-open-label">
                                                Open Workflow →
                                            </span>
                                            <button 
                                                className="pm-archive-btn"
                                                onClick={(e) => { e.stopPropagation(); handleArchiveProject(proj.id, proj.project_name); }}
                                                title="Archive Project"
                                            >
                                                Archive
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ProjectManagement;