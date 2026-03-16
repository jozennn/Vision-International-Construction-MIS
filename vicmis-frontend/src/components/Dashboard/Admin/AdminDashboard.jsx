import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Users, Briefcase, TrendingUp, AlertTriangle, BarChart2 } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activeRes, trashedRes] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/leads'),
          api.get('/leads/trashed').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data);

        const activeRows = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data ?? []);
        const trashedRows = Array.isArray(trashedRes.data) ? trashedRes.data : (trashedRes.data?.data ?? []);

        const taggedTrashed = trashedRows.map(lead => ({ ...lead, is_trashed: true }));
        
        setLeads([...activeRows, ...taggedTrashed]);
      } catch (err) {
        console.error('Failed to fetch admin data', err);
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
      <div className="ad-loading">
        <div className="ad-spinner"></div>
        <p>Loading Admin Overview...</p>
      </div>
    );
  }

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ─── DYNAMIC FRONTEND MATH ───
  const totalLeads = leads.length;
  const trashedLeads = leads.filter(lead => lead.is_trashed).length;
  const activeLeads = totalLeads - trashedLeads;
  const activeProjects = stats?.active_projects ?? 0;

  const maxGraphValue = Math.max(1, totalLeads, activeLeads, trashedLeads, activeProjects);

  return (
    <div className="ad-wrapper">

      {/* ─── HEADER ─── */}
      <div className="ad-header">
        <div className="ad-header-left">
          <div className="ad-header-icon">
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 className="ad-title">Admin Overview</h1>
            <p className="ad-subtitle">Welcome back, {user?.name}. Here is the current company status.</p>
          </div>
        </div>
        <div className="ad-header-right">
          <div className="ad-live-badge">
            <span className="ad-live-dot"></span> Live
          </div>
          <span className="ad-clock">⟳ {fmtTime(clock)}</span>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="ad-kpi-grid">

        <div className="ad-kpi-card" style={{ '--kpi-accent': '#497B97' }}>
          <div className="ad-kpi-icon" style={{ background: '#EAF1F6', color: '#497B97' }}>
            <Users size={22} />
          </div>
          <div className="ad-kpi-data">
            <h3>{stats?.total_users ?? 0}</h3>
            <p>Active Employees</p>
          </div>
        </div>

        <div className="ad-kpi-card" style={{ '--kpi-accent': '#d97706' }}>
          <div className="ad-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Briefcase size={22} />
          </div>
          <div className="ad-kpi-data">
            <h3>{activeProjects}</h3>
            <p>Active Projects</p>
            <p className="ad-kpi-note">Projects created</p>
          </div>
        </div>

        <div className="ad-kpi-card ad-kpi-alert">
          <div className="ad-kpi-icon" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="ad-kpi-data">
            <h3>{stats?.bottlenecks?.total_pending ?? 0}</h3>
            <p>Pending Approvals</p>
            <p className="ad-kpi-note">Needs attention</p>
          </div>
        </div>

        <div className="ad-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="ad-kpi-icon" style={{ background: '#dcfce7', color: '#059669' }}>
            <TrendingUp size={22} />
          </div>
          <div className="ad-kpi-data">
            <h3>{totalLeads}</h3>
            <p>Total Leads</p>
            <div className="ad-kpi-split">
              <span className="ad-active-text">{activeLeads} Active</span>
              <span className="ad-divider">|</span>
              <span className="ad-trashed-text">{trashedLeads} Trashed</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── MAIN GRID (Now a 2-Column Split!) ─── */}
      <div className="ad-main-grid">

        {/* 1. DEPARTMENT WORKLOAD RADAR */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div className="ad-panel-header-text">
              <h2>📊 Department Workload</h2>
              <p>Where are active projects currently sitting?</p>
            </div>
          </div>
          <div className="ad-bottleneck-list">

            <div className="ad-dept-row">
              <div className="ad-dept-info">
                <span className="ad-dept-name">Sales Department</span>
                <span className="ad-dept-count">{stats?.bottlenecks?.sales ?? 0} Projects</span>
              </div>
              <div className="ad-progress-bar">
                <div className="ad-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.sales ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#497B97' }} />
              </div>
            </div>

            <div className="ad-dept-row">
              <div className="ad-dept-info">
                <span className="ad-dept-name">Engineering & Operations</span>
                <span className="ad-dept-count">{stats?.bottlenecks?.engineering ?? 0} Projects</span>
              </div>
              <div className="ad-progress-bar">
                <div className="ad-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.engineering ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#d97706' }} />
              </div>
            </div>

            <div className="ad-dept-row">
              <div className="ad-dept-info">
                <span className="ad-dept-name">Logistics & Inventory</span>
                <span className="ad-dept-count">{stats?.bottlenecks?.logistics ?? 0} Projects</span>
              </div>
              <div className="ad-progress-bar">
                <div className="ad-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.logistics ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#10b981' }} />
              </div>
            </div>

            <div className="ad-dept-row">
              <div className="ad-dept-info">
                <span className="ad-dept-name">Accounting & Finance</span>
                <span className="ad-dept-count">{stats?.bottlenecks?.accounting ?? 0} Projects</span>
              </div>
              <div className="ad-progress-bar">
                <div className="ad-progress-fill" style={{ width: `${Math.min(((stats?.bottlenecks?.accounting ?? 0) / (stats?.active_projects || 1)) * 100, 100)}%`, backgroundColor: '#C20100' }} />
              </div>
            </div>

          </div>
        </div>

        {/* 2. SYSTEM HEALTH GRAPH */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div className="ad-panel-header-text">
              <h2>📈 Company Health Funnel</h2>
              <p>Visual breakdown of overall system volume</p>
            </div>
          </div>
          
          <div className="ad-bar-chart">
            <div className="ad-bar-col">
              <div className="ad-bar-fill" style={{ height: `${Math.max(5, (totalLeads / maxGraphValue) * 100)}%`, backgroundColor: '#64748b' }}>
                <span className="ad-bar-val">{totalLeads}</span>
              </div>
              <span className="ad-bar-label">Total<br/>Leads</span>
            </div>

            <div className="ad-bar-col">
              <div className="ad-bar-fill" style={{ height: `${Math.max(5, (activeLeads / maxGraphValue) * 100)}%`, backgroundColor: '#10b981' }}>
                <span className="ad-bar-val">{activeLeads}</span>
              </div>
              <span className="ad-bar-label">Active<br/>Leads</span>
            </div>

            <div className="ad-bar-col">
              <div className="ad-bar-fill" style={{ height: `${Math.max(5, (activeProjects / maxGraphValue) * 100)}%`, backgroundColor: '#3b82f6' }}>
                <span className="ad-bar-val">{activeProjects}</span>
              </div>
              <span className="ad-bar-label">Active<br/>Projects</span>
            </div>

            <div className="ad-bar-col">
              <div className="ad-bar-fill" style={{ height: `${Math.max(5, (trashedLeads / maxGraphValue) * 100)}%`, backgroundColor: '#ef4444' }}>
                <span className="ad-bar-val">{trashedLeads}</span>
              </div>
              <span className="ad-bar-label">Trashed<br/>Leads</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;