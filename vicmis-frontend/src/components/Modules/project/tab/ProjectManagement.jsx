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

            // 1. View Mode logic
            if (viewMode === 'active' && variant === 'completed') return false;
            if (viewMode === 'completed' && variant !== 'completed') return false;

            // 2. Search logic
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
            <div className="pm-page" style={{ padding: '24px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
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
            <div className="pm-page" style={{ padding: '24px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
                <button onClick={() => { setError(null); setViewMode('active'); fetchProjects(); }}>
                    ← Back to Active Projects
                </button>
                <div className="pm-error">⚠️ {error}</div>
            </div>
        );
    }

    // ── Component Styles ──
    const tabContainerStyle = {
        display: 'flex',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    };

    const getTabStyle = (isActive) => ({
        padding: '10px 20px',
        fontWeight: '600',
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        background: isActive ? '#1a1a1a' : '#ffffff',
        color: isActive ? '#ffffff' : '#6b7280',
    });

    const getBadgeStyle = (isActive) => ({
        background: isActive ? '#8b5cf6' : '#ef4444',
        color: '#ffffff',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    });

    // ── Main ──
    return (
        <div className="pm-page" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '30px' }}>

            {/* Dark Header */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '8px',
                borderBottom: '4px solid #ef4444',
                padding: '24px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', letterSpacing: '1.5px', margin: 0 }}>
                    PROJECT MANAGEMENT
                </h1>
                
                {/* Optional Header Buttons to match the visual weight of the reference image */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{ background: '#ffffff', color: '#1a1a1a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        📊 Generate Report
                    </button>
                    <button style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        + Add New Project
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* Tabs */}
                <div style={tabContainerStyle}>
                    <button 
                        style={getTabStyle(viewMode === 'active')}
                        onClick={() => { setViewMode('active'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Active Projects
                        <span style={getBadgeStyle(viewMode === 'active')}>{viewMode === 'active' ? displayedProjects.length : 0}</span>
                    </button>
                    
                    <button 
                        style={getTabStyle(viewMode === 'completed')}
                        onClick={() => { setViewMode('completed'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Converted Projects
                        <span style={getBadgeStyle(viewMode === 'completed')}>{viewMode === 'completed' ? displayedProjects.length : 0}</span>
                    </button>

                    <button 
                        style={getTabStyle(viewMode === 'archived')}
                        onClick={() => { setViewMode('archived'); setFilterStatus(""); setSearchQuery(""); }}
                    >
                        Archived
                        <span style={getBadgeStyle(viewMode === 'archived')}>{viewMode === 'archived' ? displayedProjects.length : 0}</span>
                    </button>
                </div>

                {/* Search & Filter */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '16px' }}>🔍</span>
                        <input 
                            type="text"
                            placeholder="Search client, project, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '10px 16px 10px 38px',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                fontSize: '14px',
                                minWidth: '280px',
                                background: '#ffffff',
                                color: '#374151'
                            }}
                        />
                    </div>
                    
                    {viewMode === 'active' && (
                        <div style={{ position: 'relative' }}>
                             <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '16px', pointerEvents: 'none' }}>⚡</span>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    padding: '10px 16px 10px 38px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    outline: 'none',
                                    fontSize: '14px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    color: '#4b5563',
                                    appearance: 'none',
                                    minWidth: '160px'
                                }}
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

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '24px'
            }}>
                {displayedProjects.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '8px' }}>
                        <h3 style={{ color: '#374151', margin: '0 0 8px 0' }}>No projects found</h3>
                        <p style={{ color: '#6b7280', margin: 0 }}>Try adjusting your search or filter terms.</p>
                    </div>
                ) : (
                    displayedProjects.map((proj) => {
                        const isArchived = viewMode === 'archived';
                        
                        return (
                            <div
                                key={proj.id}
                                onClick={() => !isArchived && onSelectProject(proj)}
                                style={{ 
                                    background: '#ffffff',
                                    borderRadius: '8px',
                                    borderTop: '4px solid #8b5cf6', // Purple top accent
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: isArchived ? 'default' : 'pointer',
                                    transition: 'transform 0.2s',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => { if (!isArchived) e.currentTarget.style.transform = 'translateY(-2px)' }}
                                onMouseLeave={(e) => { if (!isArchived) e.currentTarget.style.transform = 'translateY(0)' }}
                            >
                                {/* Top Header Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                                    <span style={{ 
                                        fontSize: '10px', 
                                        fontWeight: '800', 
                                        color: '#6d28d9', 
                                        backgroundColor: '#f3e8ff', 
                                        padding: '4px 10px', 
                                        borderRadius: '4px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        PROJECT CREATED
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                                        {formatDate(proj.created_at)}
                                    </span>
                                </div>

                                {/* Main Body Info */}
                                <div style={{ padding: '0 20px 20px 20px', flex: 1 }}>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#111827', fontWeight: 'bold' }}>
                                        {proj.project_name}
                                    </h3>
                                    <div style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '12px', fontWeight: '500' }}>
                                        {proj.client_name || 'No Client Assigned'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#ef4444' }}>📍</span> {proj.location || 'Location not specified'}
                                    </div>
                                </div>

                                {/* Project Stage Strip */}
                                <div style={{ 
                                    background: '#f8fafc', 
                                    padding: '12px 20px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    borderTop: '1px solid #f1f5f9',
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📦 PROJECT STAGE
                                    </span>
                                    <span style={{ 
                                        fontSize: '12px', 
                                        color: '#2563eb', 
                                        border: '1px solid #bfdbfe', 
                                        backgroundColor: '#eff6ff', 
                                        padding: '4px 12px', 
                                        borderRadius: '16px',
                                        fontWeight: '600'
                                    }}>
                                        {shortStatus(proj.status) || 'ONGOING'}
                                    </span>
                                </div>

                                {/* Footer Row */}
                                <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                                    {isArchived ? (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRestoreProject(proj.id, proj.project_name); }}
                                                style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                ↩ Restore
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(proj.id, proj.project_name); }}
                                                style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                ✕ Delete
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#9ca3af' }}>
                                                Click to View Details
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                📅 {formatShortDate(proj.created_at)}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleArchiveProject(proj.id, proj.project_name); }}
                                                    style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
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
        </div>
    );
};

export default ProjectManagement;