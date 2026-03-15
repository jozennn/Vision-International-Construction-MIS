import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Users, Briefcase, TrendingUp, AlertTriangle, Activity, ArrowRight } from 'lucide-react';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch super admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner"></div>
        <p>Booting Command Center...</p>
      </div>
    );
  }

  return (
    <div className="sa-wrapper">
      <div className="sa-header">
        <div>
          <h1 className="sa-title">Command Center</h1>
          <p className="sa-subtitle">Welcome back, {user?.name}. Here is your company overview.</p>
        </div>
        <div className="sa-live-badge">
          <span className="sa-live-dot"></span> System Online
        </div>
      </div>

      {/* ─── HIGH-LEVEL KPI CARDS ──────────────────────────────────────── */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Users size={24} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.total_users || 0}</h3>
            <p>Active Employees</p>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Briefcase size={24} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.active_projects || 0}</h3>
            <p>Active Projects</p>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#dcfce7', color: '#b45309' }}>
            <TrendingUp size={24} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.total_leads || 0}</h3>
            <p>Total Leads Generated</p>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.bottlenecks?.total_pending || 0}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
      </div>

      <div className="sa-main-grid">
        
        {/* ─── DEPARTMENT BOTTLENECK RADAR (THE BEST FEATURE) ────────────── */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <h2>Department Workload Radar</h2>
            <p>Where are active projects currently sitting?</p>
          </div>
          <div className="sa-bottleneck-list">
            
            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Sales Department</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.sales || 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.sales || 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#3b82f6' }}></div>
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Engineering & Operations</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.engineering || 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.engineering || 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#f59e0b' }}></div>
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Logistics & Inventory</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.logistics || 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.logistics || 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#10b981' }}></div>
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Accounting & Finance</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.accounting || 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.accounting || 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#A91D22' }}></div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── LIVE SYSTEM FEED ────────────────────────────────────────── */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <h2>Live System Feed</h2>
            <p>Most recent actions across the company</p>
          </div>
          <div className="sa-activity-feed">
            {stats?.recent_activities?.length === 0 ? (
              <p className="sa-no-data">No recent activity.</p>
            ) : (
              stats?.recent_activities?.map((act, index) => (
                <div key={index} className="sa-feed-item">
                  <div className="sa-feed-icon"><Activity size={14} /></div>
                  <div className="sa-feed-content">
                    <p className="sa-feed-desc">
                      <strong>{act.user_name}</strong> {act.description.toLowerCase()}
                    </p>
                    <span className="sa-feed-time">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {act.module}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="sa-panel-footer">
            {/* You can link this to your actual Settings -> Activity Tracker page later! */}
            <button className="sa-btn-link">View Full Audit Log <ArrowRight size={14} /></button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;