import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Target, TrendingUp, Layers, CheckCircle, Clock } from 'lucide-react';
import './ManagerDashboard.css';

const ManagerDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerStats = async () => {
      try {
        // We can reuse the Super Admin endpoint, just make sure to allow managers in your Laravel controller!
        const res = await api.get('/admin/dashboard-stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch manager stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManagerStats();
  }, []);

  if (loading) {
    return (
      <div className="manager-loading">
        <div className="manager-spinner"></div>
        <p>Loading Operational Overview...</p>
      </div>
    );
  }

  return (
    <div className="manager-wrapper">
      <div className="manager-header">
        <div>
          <h1 className="manager-title">Operational Overview</h1>
          <p className="manager-subtitle">Manager Access • Read-Only Mode</p>
        </div>
        <div className="manager-date-badge">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ─── METRIC CARDS ──────────────────────────────────────── */}
      <div className="manager-kpi-grid">
        <div className="manager-kpi-card">
          <div className="manager-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Layers size={24} />
          </div>
          <div className="manager-kpi-data">
            <h3>{stats?.active_projects || 0}</h3>
            <p>Total Active Projects</p>
          </div>
        </div>

        <div className="manager-kpi-card">
          <div className="manager-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Target size={24} />
          </div>
          <div className="manager-kpi-data">
            <h3>{stats?.total_leads || 0}</h3>
            <p>Leads Generated</p>
          </div>
        </div>

        <div className="manager-kpi-card">
          <div className="manager-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <Clock size={24} />
          </div>
          <div className="manager-kpi-data">
            <h3>{stats?.bottlenecks?.total_pending || 0}</h3>
            <p>Pending Department Approvals</p>
          </div>
        </div>
      </div>

      <div className="manager-main-grid">
        
        {/* ─── PROJECT PHASE PIPELINE (THE BEST FEATURE) ────────────── */}
        <div className="manager-panel">
          <div className="manager-panel-header">
            <h2>Project Phase Pipeline</h2>
            <p>Current distribution of active workflow</p>
          </div>
          <div className="manager-pipeline">
            
            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                <h4>Phase 1: Planning & Sales</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.sales || 0} Projects</div>
              <p className="stage-desc">Floor plans, BOQ, and PO gathering.</p>
            </div>

            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                <h4>Phase 2: Pre-Execution</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.logistics || 0} Projects</div>
              <p className="stage-desc">Material requests, logistics, and delivery.</p>
            </div>

            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#10b981' }}></span>
                <h4>Phase 3: Active Construction</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.engineering || 0} Projects</div>
              <p className="stage-desc">Installation, monitoring, and QA checks.</p>
            </div>

            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#A91D22' }}></span>
                <h4>Phase 4: Handover & Billing</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.accounting || 0} Projects</div>
              <p className="stage-desc">Client walkthroughs, COC, and final invoicing.</p>
            </div>

          </div>
        </div>

        {/* ─── RECENT SYSTEM ACTIVITY ─────────────────────────────────── */}
        <div className="manager-panel">
          <div className="manager-panel-header">
            <h2>Latest System Activity</h2>
            <p>Real-time updates from your teams</p>
          </div>
          <div className="manager-activity-list">
            {stats?.recent_activities?.length === 0 ? (
              <p className="no-activity">No recent activity found.</p>
            ) : (
              stats?.recent_activities?.slice(0, 5).map((act, idx) => (
                <div key={idx} className="activity-row">
                  <div className="activity-bullet"></div>
                  <div className="activity-content">
                    <p><strong>{act.user_name}</strong> {act.description}</p>
                    <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.module}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;