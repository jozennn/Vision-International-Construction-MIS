import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Users, Briefcase, TrendingUp, AlertTriangle, Activity, ArrowRight, BarChart2 } from 'lucide-react';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]); // Added to hold the raw leads
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch everything simultaneously to make it blazing fast!
        const [statsRes, activeRes, trashedRes] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/leads'),
          api.get('/leads/trashed').catch(() => ({ data: [] })) // Safe fallback for trash
        ]);

        setStats(statsRes.data);

        const activeRows = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data ?? []);
        const trashedRows = Array.isArray(trashedRes.data) ? trashedRes.data : (trashedRes.data?.data ?? []);

        // Tag trashed leads so we can separate them in the math
        const taggedTrashed = trashedRows.map(lead => ({ ...lead, is_trashed: true }));
        
        setLeads([...activeRows, ...taggedTrashed]);
      } catch (err) {
        console.error('Failed to fetch super admin data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner"></div>
        <p>Booting Command Center...</p>
      </div>
    );
  }

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ─── DYNAMIC FRONTEND MATH (Just like the Sales Dashboard!) ───
  const totalLeads = leads.length;
  const trashedLeads = leads.filter(lead => lead.is_trashed).length;
  const activeLeads = totalLeads - trashedLeads;
  const activeProjects = stats?.active_projects ?? 0;

  // Find the max value to correctly scale the CSS bar graph height
  const maxGraphValue = Math.max(1, totalLeads, activeLeads, trashedLeads, activeProjects);

  return (
    <div className="sa-wrapper">

      {/* ─── HEADER ─── */}
      <div className="sa-header">
        <div className="sa-header-left">
          <div className="sa-header-icon">
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 className="sa-title">Command Center</h1>
            <p className="sa-subtitle">Welcome back, {user?.name}. Here is your company overview.</p>
          </div>
        </div>
        <div className="sa-header-right">
          <div className="sa-live-badge">
            <span className="sa-live-dot"></span> Live
          </div>
          <span className="sa-clock">⟳ {fmtTime(clock)}</span>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="sa-kpi-grid">

        <div className="sa-kpi-card" style={{ '--kpi-accent': '#497B97' }}>
          <div className="sa-kpi-icon" style={{ background: '#EAF1F6', color: '#497B97' }}>
            <Users size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.total_users ?? 0}</h3>
            <p>Active Employees</p>
          </div>
        </div>

        <div className="sa-kpi-card" style={{ '--kpi-accent': '#d97706' }}>
          <div className="sa-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Briefcase size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{activeProjects}</h3>
            <p>Active Projects</p>
            <p className="sa-kpi-note">Projects created</p>
          </div>
        </div>

        {/* Red "needs attention" card */}
        <div className="sa-kpi-card sa-kpi-alert">
          <div className="sa-kpi-icon" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{stats?.bottlenecks?.total_pending ?? 0}</h3>
            <p>Pending Approvals</p>
            <p className="sa-kpi-note">Needs attention</p>
          </div>
        </div>

        <div className="sa-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="sa-kpi-icon" style={{ background: '#dcfce7', color: '#059669' }}>
            <TrendingUp size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalLeads}</h3>
            <p>Total Leads</p>
            {/* 👇 Powered by the new dynamic math! */}
            <div className="sa-kpi-split">
              <span className="sa-active-text">{activeLeads} Active</span>
              <span className="sa-divider">|</span>
              <span className="sa-trashed-text">{trashedLeads} Trashed</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="sa-main-grid">

        {/* 1. DEPARTMENT WORKLOAD RADAR */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>📊 Department Workload</h2>
              <p>Where are active projects currently sitting?</p>
            </div>
          </div>
          <div className="sa-bottleneck-list">

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Sales Department</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.sales ?? 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.sales ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#497B97' }} />
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Engineering & Operations</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.engineering ?? 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.engineering ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#d97706' }} />
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Logistics & Inventory</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.logistics ?? 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.logistics ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#10b981' }} />
              </div>
            </div>

            <div className="sa-dept-row">
              <div className="sa-dept-info">
                <span className="sa-dept-name">Accounting & Finance</span>
                <span className="sa-dept-count">{stats?.bottlenecks?.accounting ?? 0} Projects</span>
              </div>
              <div className="sa-progress-bar">
                <div className="sa-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.accounting ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#C20100' }} />
              </div>
            </div>

          </div>
        </div>

        {/* 2. SYSTEM HEALTH GRAPH */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>📈 Company Health Funnel</h2>
              <p>Visual breakdown of overall system volume</p>
            </div>
          </div>
          
          <div className="sa-bar-chart">
            <div className="sa-bar-col">
              {/* 👇 Powered by the new dynamic math! */}
              <div className="sa-bar-fill" style={{ height: `${Math.max(5, (totalLeads / maxGraphValue) * 100)}%`, backgroundColor: '#64748b' }}>
                <span className="sa-bar-val">{totalLeads}</span>
              </div>
              <span className="sa-bar-label">Total<br/>Leads</span>
            </div>

            <div className="sa-bar-col">
              <div className="sa-bar-fill" style={{ height: `${Math.max(5, (activeLeads / maxGraphValue) * 100)}%`, backgroundColor: '#10b981' }}>
                <span className="sa-bar-val">{activeLeads}</span>
              </div>
              <span className="sa-bar-label">Active<br/>Leads</span>
            </div>

            <div className="sa-bar-col">
              <div className="sa-bar-fill" style={{ height: `${Math.max(5, (activeProjects / maxGraphValue) * 100)}%`, backgroundColor: '#3b82f6' }}>
                <span className="sa-bar-val">{activeProjects}</span>
              </div>
              <span className="sa-bar-label">Active<br/>Projects</span>
            </div>

            <div className="sa-bar-col">
              <div className="sa-bar-fill" style={{ height: `${Math.max(5, (trashedLeads / maxGraphValue) * 100)}%`, backgroundColor: '#ef4444' }}>
                <span className="sa-bar-val">{trashedLeads}</span>
              </div>
              <span className="sa-bar-label">Trash<br/>Leads</span>
            </div>
          </div>
        </div>

        {/* 3. LIVE SYSTEM FEED */}
        <div className="sa-panel sa-feed-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>⚡ Live System Feed</h2>
              <p>Most recent actions across the company</p>
            </div>
          </div>
          <div className="sa-activity-feed">
            {!stats?.recent_activities?.length ? (
              <p className="sa-no-data">No recent activity.</p>
            ) : (
              stats.recent_activities.map((act, index) => (
                <div key={index} className="sa-feed-item">
                  <div className="sa-feed-icon"><Activity size={13} /></div>
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
            <button className="sa-btn-link">
              View Full Audit Log <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;