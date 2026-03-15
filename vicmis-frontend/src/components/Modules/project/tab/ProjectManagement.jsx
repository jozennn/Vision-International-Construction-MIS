import React, { useState, useEffect } from "react";
import api from "@/api/axios";
import "../css/ProjectManagement.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Maps a status string to a color variant for the strip + badge
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

// Shorten long status strings for the badge
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
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const res  = await api.get("/projects");
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
        fetch();
    }, []);

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
                <div className="pm-page-count">
                    <strong>{projects.length}</strong>
                    {projects.length === 1 ? 'project' : 'projects'} active
                </div>
            </div>

            {/* Grid */}
            <div className="pm-project-grid">
                {projects.length === 0 ? (
                    <div className="pm-empty">
                        <div className="pm-empty-icon">🏗️</div>
                        <h3 className="pm-empty-title">No projects yet</h3>
                        <p className="pm-empty-sub">
                            Create a project from the Customer module to get started.
                        </p>
                    </div>
                ) : (
                    projects.map((proj) => {
                        const variant = getStatusVariant(proj.status);
                        const engineers = Array.isArray(proj.assigned_engineers)
                            ? proj.assigned_engineers
                                .map(e => typeof e === 'string' ? e : e?.name)
                                .filter(Boolean)
                                .join(', ')
                            : (proj.assigned_engineers ?? '');

                        return (
                            <div
                                key={proj.id}
                                className="pm-proj-card"
                                onClick={() => onSelectProject(proj)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && onSelectProject(proj)}
                                aria-label={`Open ${proj.project_name}`}
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
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div className="pm-card-foot">
                                    <span className="pm-open-label">
                                        Open Workflow →
                                    </span>
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