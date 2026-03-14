import React, { useState, useEffect } from "react";
import api from "@/api/axios";
import "../css/ProjectManagement.css";

const ProjectManagement = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch projects from MySQL database via Laravel API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        // This hits your 'http://localhost:8000/api/projects' endpoint
        const response = await api.get("/projects");
        setProjects(response.data);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Could not load projects. Please check your backend connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

if (loading) {
  return (
    <div className="loading-screen">
      <div className="vision-spinner"></div>
      {/* Text removed as requested */}
    </div>
  );
}

  if (error) {
    return (
      <div className="management-status-container">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="customer-container">
      <div className="customer-header">
        <div className="header-info">
          <h1>Project Management</h1>
          <p>Active projects from database</p>
        </div>
      </div>

      <div className="lead-grid">
        {projects.length === 0 ? (
          <div className="no-data-card">
            <p>No projects found. Create a project in the Customer module first.</p>
          </div>
        ) : (
          projects.map((proj) => (
            <div 
              key={proj.id} 
              className="lead-card" 
              onClick={() => onSelectProject(proj)} 
              style={{ cursor: 'pointer' }}
            >
              <div className="lead-card-header">
                {/* Status defaults to ONGOING if not set in DB */}
                <span className="status-badge contacted">
                  {proj.status?.toUpperCase() || 'ONGOING'}
                </span>
                <span className="lead-id">PROJ-{proj.id}</span>
              </div>
              
              <div className="lead-body">
                {/* project_name is 'Hospital' in your DB */}
                <h3 className="client-name">{proj.project_name}</h3> 
                
                <p className="project-title" style={{ marginTop: '8px' }}>
                  {/* client_name is 'Arthur Morgan' in your DB */}
                  Client: <strong>{proj.client_name}</strong>
                </p>
                
                <p className="project-title">
                  Location: {proj.location || 'Manila'}
                </p>
                
                <p className="project-title">
                  Type: {proj.project_type || 'Construction'}
                </p>
              </div>

              <div className="lead-card-footer">
                <span className="open-link">Open Workflow Dashboard →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectManagement;