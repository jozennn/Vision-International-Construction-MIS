import React, { useState, useEffect } from "react";
import api from "@/api/axios";
import "./css/ProjectManagement.css";

const ProjectManagementHome = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get("/projects");
        const data = response.data;
        setProjects(Array.isArray(data) ? data : (data.projects ?? []));
      } catch (err) {
        console.error("Error fetching projects:", err);
        const msg = err?.response?.data?.message ?? null;
        setError(msg ? `Server error: ${msg}` : "Failed to load projects. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="pm-loading">
        <div className="pm-spinner"></div>
        <span className="pm-loading-text">Loading Projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pm-error">⚠️ {error}</div>
    );
  }

  return (
    <div className="pm-page">
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

      <div className="pm-project-grid">
        {projects.length === 0 ? (
          <div className="pm-empty">
            <div className="pm-empty-icon">🏗️</div>
            <h3 className="pm-empty-title">No active projects</h3>
            <p className="pm-empty-sub">No active projects assigned to your department right now.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="pm-proj-card"
              onClick={() => onSelectProject(project)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelectProject(project)}
            >
              <div className="pm-card-strip" />
              <div className="pm-card-head">
                <span className="pm-card-id">PROJ-{String(project.id).padStart(4, '0')}</span>
                <span className="pm-status-chip chip-engineering">
                  <span className="pm-status-dot" />
                  {project.status}
                </span>
              </div>
              <div className="pm-card-body">
                <h3 className="pm-card-project-name">{project.project_name}</h3>
                <div className="pm-card-meta">
                  <div className="pm-card-meta-row">
                    <span className="pm-card-meta-key">Client</span>
                    <span className="pm-card-meta-val">{project.client_name}</span>
                  </div>
                  <div className="pm-card-meta-row">
                    <span className="pm-card-meta-key">Location</span>
                    <span className="pm-card-meta-val">{project.location}</span>
                  </div>
                </div>
              </div>
              <div className="pm-card-foot">
                <span className="pm-open-label">Open Workflow →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectManagementHome;