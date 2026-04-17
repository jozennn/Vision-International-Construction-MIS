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

const shortStatus = (status = '') => {
    const map = {
        'Site Inspection & Project Monitoring': 'Site Inspection & Project Monitoring',
        'Deployment and Orientation of Installers': 'Deployment',
        'Contract Signing for Installer': 'Contract Signing',
        'Checking of Delivery of Materials': 'DR Verification',
        'Measurement based on Plan': 'Plan Measurement',
        'Pending Work Order Verification': 'WO Verification',
        'Final Site Inspection with the Client': 'Client Walkthrough',
        'Site Inspection & Quality Checking': 'QA/QC',
        'P.O & Work Order': 'P.O & Work Order',
    };
    return map[status] || status;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

            if (viewMode === 'active' && variant === 'completed') return false;
            if (viewMode === 'completed' && variant !== 'completed') return false;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchName = proj.project_name?.toLowerCase().includes(query);
                const matchClient = proj.client_name?.toLowerCase().includes(query);
                const matchId = `proj-${String(proj.id).padStart(4, '0')}`.includes(query);
                if (!matchName && !matchClient && !matchId) return false;
            }

            if (filterStatus && variant !== filterStatus) return false;

            return true;
        });
    }, [projects, viewMode, searchQuery, filterStatus]);


    // ── Main Layout ──
    return (
        <div className="pm-page">

            {/* Dark Header - Now fixed and will never blink */}
            <div className="pm-page-header">
                <h1 className="pm-page-title">PROJECT MANAGEMENT</h1>
            </div>

            {/* Controls Bar - Now fixed and will never blink */}
            <div className="pm-controls-bar">
                {/* Tabs Container */}
                <div className="pm-tabs-container">
                    <button 
                        className={`pm-tab-btn ${viewMode === 'active' ? 'active' : ''}`}
                        onClick={() => { setViewMode('active'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Active Projects
                        <span className={`pm-tab-badge ${viewMode === 'active' ? 'active' : ''}`}>
                            {viewMode === 'active' ? displayedProjects.length : 0}
                        </span>
                    </button>
                    
                    <button 
                        className={`pm-tab-btn ${viewMode === 'completed' ? 'active' : ''}`}
                        onClick={() => { setViewMode('completed'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Converted Projects
                        <span className={`pm-tab-badge ${viewMode === 'completed' ? 'active' : ''}`}>
                            {viewMode === 'completed' ? displayedProjects.length : 0}
                        </span>
                    </button>

                    <button 
                        className={`pm-tab-btn ${viewMode === 'archived' ? 'active' : ''}`}
                        onClick={() => { setViewMode('archived'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Archived
                        <span className={`pm-tab-badge ${viewMode === 'archived' ? 'active' : ''}`}>
                            {viewMode === 'archived' ? displayedProjects.length : 0}
                        </span>
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="pm-filters-group">
                    <div className="pm-input-wrap">
                        <span className="pm-input-icon">🔍</span>
                        <input 
                            type="text"
                            placeholder="Search client, project, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pm-search-input"
                        />
                    </div>
                    
                    {viewMode === 'active' && (
                        <div className="pm-input-wrap">
                            <span className="pm-input-icon">⚡</span>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pm-filter-select"
                            >
                                <option value="">Filter By...</option>
                                <option value="pending">Pending</option>
                                <option value="active">Active (Monitoring)</option>
                                <option value="engineering">Engineering</option>
                                <option value="sales">Sales</option>
                                <option value="billing">Billing</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="pm-error">
                    ⚠️ {error}
                    <button 
                        onClick={() => { setError(null); setViewMode('active'); fetchProjects(); }}
                        style={{ marginLeft: '12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                    >
                        Reload
                    </button>
                </div>
            )}

            {/* Content Area - Loading OR Grid */}
            {loading ? (
                <div className="pm-loading">
                    <div className="pm-spinner"></div>
                    <span className="pm-loading-text">Loading projects…</span>
                </div>
            ) : (
                <div className="pm-project-grid">
                    {displayedProjects.length === 0 ? (
                        <div className="pm-empty">
                            <h3>No projects found</h3>
                            <p>Try adjusting your search or filter terms.</p>
                        </div>
                    ) : (
                        displayedProjects.map((proj) => {
                            const isArchived = viewMode === 'archived';
                            
                            return (
                                <div
                                    key={proj.id}
                                    className={`pm-proj-card ${isArchived ? 'archived' : ''}`}
                                    onClick={() => !isArchived && onSelectProject(proj)}
                                >
                                    {/* Top Header Row */}
                                    <div className="pm-card-top-row">
                                        <span className="pm-card-created-tag">
                                            PROJECT CREATED
                                        </span>
                                        <span className="pm-card-date-top">
                                            {formatDate(proj.created_at)}
                                        </span>
                                    </div>

                                    {/* Main Body Info */}
                                    <div className="pm-card-main-info">
                                        <h3 className="pm-card-proj-title">{proj.project_name}</h3>
                                        <div className="pm-card-client-name">
                                            {proj.client_name || 'No Client Assigned'}
                                        </div>
                                        <div className="pm-card-location-text">
                                            <span style={{ color: '#ef4444' }}>📍</span> {proj.location || 'Location not specified'}
                                        </div>
                                    </div>

                                    {/* Project Stage Strip */}
                                    <div className="pm-card-stage-strip">
                                        <span className="pm-stage-label">
                                            📦 PROJECT STAGE
                                        </span>
                                        <span className="pm-stage-value">
                                            {shortStatus(proj.status) || 'ONGOING'}
                                        </span>
                                    </div>

                                    {/* Footer Row */}
                                    <div className="pm-card-footer-row">
                                        {isArchived ? (
                                            <div className="pm-action-buttons">
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
                                                    ✕ Delete
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="pm-footer-hint">Click to View Details</span>
                                                <span className="pm-footer-date">
                                                    📅 {formatShortDate(proj.created_at)}
                                                    <button 
                                                        className="pm-archive-icon-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleArchiveProject(proj.id, proj.project_name); }}
                                                        title="Archive Project"
                                                    >
                                                        🗑️
                                                    </button>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectManagement;