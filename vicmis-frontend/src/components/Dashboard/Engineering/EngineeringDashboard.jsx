import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './EngineeringDashboard.css'; // We'll share some styles from HRDashboard.css

const EngineeringDashboard = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_projects: 0,
    pending_tasks: 0,
    project_progress: '0%',
    total_engineers: 0
  });

  useEffect(() => {
    fetchEngineeringData();
  }, []);

  const fetchEngineeringData = async () => {
  try {
    setLoading(true);
    console.log("Fetching Engineering Stats..."); // Debug Log 1
    
    const response = await api.get('/engineering/dashboard-stats');
    
    console.log("Stats Received:", response.data); // Debug Log 2
    setStats(response.data);
  } catch (error) {
    console.error("Engineering API Error:", error.response || error);
    // Set some default stats so the dashboard still shows up even if API fails
    setStats({
        total_projects: 0,
        pending_tasks: 0,
        project_progress: '0%',
        total_engineers: 0
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="dashboard-wrapper">
      {/* HEADER SECTION */}
      <div className="dashboard-header">
        <div className="header-text">
          <h2>Engineering Command Center</h2>
          <p>Project milestones and technical resource allocation</p>
        </div>
        <button className="refresh-btn" onClick={fetchEngineeringData} title="Refresh Data">
          ↻
        </button>
      </div>

      {/* STATS GRID - Same style as HR Dashboard */}
      <div className="stats-grid">
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Total Projects</p>
              <h3 className="stat-value">{stats.total_projects}</h3>
            </div>
          </div>
          
          <div className="stat-card task-highlight">
            <div className="stat-content">
              <p className="stat-label">Pending Tasks</p>
              <div className="task-flex">
                <h3 className="stat-value">{stats.pending_tasks}</h3>
                {user.role === 'dept_head' && (
                  <button className="mini-assign-btn" onClick={() => setShowModal(true)}>
                    + Assign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Active Engineers</p>
              <h3 className="stat-value">{stats.total_engineers}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Project Progress</p>
              <h3 className="stat-value">{stats.project_progress}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card wide blue-tint">
          <div className="stat-content">
            <p className="stat-label">Departmental Goal</p>
            <h3 className="announcement-text">Current Focus: Project X Structural Compliance</h3>
          </div>
        </div>
      </div>

      {/* TASK MANAGEMENT SECTION (Style consistent with Approval Center) */}
      <div className="approval-section">
        <div className="section-header">
          <h2 className="title-blue">Active Project Tasks</h2>
        </div>
        
        {/* You can map through tasks here later, similar to the HR requests */}
        <div className="no-requests-container">
            <p className="no-requests">All technical tasks are currently on schedule.</p>
        </div>
      </div>

      {/* MODAL FOR ASSIGNING TASKS */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
               <h3>Assign New Engineering Task</h3>
               <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form className="eng-form">
              <div className="form-group">
                <label>Responsible Engineer</label>
                <select className="modal-input">
                  <option>Select from team...</option>
                  <option>Engr. David Chief</option>
                  <option>Engr. Sarah Smith</option>
                </select>
              </div>

              <div className="form-group">
                <label>Task Instructions</label>
                <textarea className="modal-input" placeholder="Specify technical requirements..."></textarea>
              </div>

              <div className="form-group">
                <label>Deadline</label>
                <input type="date" className="modal-input" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="confirm-btn">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineeringDashboard;