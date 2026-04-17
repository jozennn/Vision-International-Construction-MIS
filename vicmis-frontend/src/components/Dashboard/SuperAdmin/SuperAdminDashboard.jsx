import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { Users, Activity, ArrowRight, BarChart2, Database, Shield, Cpu, Package, AlertCircle } from 'lucide-react';
import ServerMetricsCard from './ServerMetricsCard'; // <-- IMPORT NEW COMPONENT
import './SuperAdminDashboard.css';

const SuperAdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  
  // KPI States
  const [totalBackups, setTotalBackups] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [fetchedTotalUsers, setFetchedTotalUsers] = useState(0);
  const [deptCounts, setDeptCounts] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Dashboard Stats (for live feed, etc.)
        try {
          const statsRes = await api.get('/admin/dashboard-stats');
          setStats(statsRes.data);
        } catch (err) { console.error('Stats fetch error:', err); }

        // 2. Fetch Backups for KPI Card
        try {
          const backupsRes = await api.get('/admin/database/backups');
          setTotalBackups(backupsRes.data.backups?.length || 0);
        } catch (err) { console.error('Backups fetch error:', err); }

        // 3. Fetch System Logs for Errors KPI Card
        try {
          const logsRes = await api.get('/admin/system-logs');
          const logs = logsRes.data.logs || [];
          const errorCount = logs.filter(log => 
            log.includes('local.ERROR') || log.includes('Stack trace:') || log.includes('Exception')
          ).length;
          setTotalErrors(errorCount);
        } catch (err) { console.error('Logs fetch error:', err); }

        // 4. Fetch Users count & Calculate Headcount Directly
        try {
          const usersRes = await api.get('/admin/users');
          const usersList = usersRes.data || [];
          setFetchedTotalUsers(usersList.length);
          
          // Calculate headcount dynamically based on actual user data
          const calculatedCounts = {};
          usersList.forEach(u => {
            let dept = u.department || 'Unassigned';
            if (dept === 'Accounting/Procurement') dept = 'Procurement'; // Handle legacy records
            calculatedCounts[dept] = (calculatedCounts[dept] || 0) + 1;
          });
          setDeptCounts(calculatedCounts);

        } catch (err) { console.error('Users fetch error:', err); }

      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner"></div>
        <p>Booting Command Center…</p>
      </div>
    );
  }

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Map the calculated dynamic counts to standard department visual profiles
  const DEPARTMENTS = [
    { name: 'Management',  count: deptCounts['Management'] || 0,  color: '#7C3AED', icon: <Shield size={14} /> },
    { name: 'Sales',       count: deptCounts['Sales'] || 0,       color: '#497B97', icon: <BarChart2 size={14} /> },
    { name: 'Engineering', count: deptCounts['Engineering'] || 0, color: '#d97706', icon: <Cpu size={14} /> },
    { name: 'Logistics',   count: deptCounts['Logistics'] || 0,   color: '#10b981', icon: <Package size={14} /> },
    { name: 'Procurement', count: deptCounts['Procurement'] || 0, color: '#6366F1', icon: <Database size={14} /> },
  ].filter(d => d.count > 0); 

  const maxDeptCount = Math.max(1, ...DEPARTMENTS.map(d => d.count));

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
            <p className="sa-subtitle">Welcome back, {user?.name}. Here is your system overview.</p>
          </div>
        </div>
        <div className="sa-header-right">
          <div className="sa-live-badge">
            <span className="sa-live-dot"></span> Live
          </div>
          <span className="sa-clock">⟳ {fmtTime(clock)}</span>
        </div>
      </div>

      {/* ─── TOP ROW: MULTIPLE KPIs ─── */}
      <div className="sa-kpi-grid">
        
        {/* Total Users Card */}
        <div 
          className="sa-kpi-card" 
          style={{ '--kpi-accent': '#497B97', cursor: 'pointer' }}
          onClick={() => navigate('/admin/users')}
        >
          <div className="sa-kpi-icon" style={{ background: '#EAF1F6', color: '#497B97' }}>
            <Users size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{fetchedTotalUsers}</h3>
            <p>Total Employees</p>
            <p className="sa-kpi-note">Registered user accounts</p>
          </div>
        </div>

        {/* Total Database Backups Card */}
        <div 
          className="sa-kpi-card" 
          style={{ '--kpi-accent': '#10b981', cursor: 'pointer' }}
          onClick={() => navigate('/admin/database')}
        >
          <div className="sa-kpi-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Database size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalBackups}</h3>
            <p>Database Backups</p>
            <p className="sa-kpi-note">Available restore points</p>
          </div>
        </div>

        {/* System Diagnostics Errors Card */}
        <div 
          className="sa-kpi-card" 
          style={{ '--kpi-accent': '#ef4444', cursor: 'pointer' }}
          onClick={() => navigate('/admin/system-logs')}
        >
          <div className="sa-kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className="sa-kpi-data">
            <h3>{totalErrors}</h3>
            <p>System Errors</p>
            <p className="sa-kpi-note">Captured in diagnostics log</p>
          </div>
        </div>

        {/* ─── NEW METRICS CARDS INJECTED HERE ─── */}
        <ServerMetricsCard />

      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="sa-main-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>

        {/* 1. DEPARTMENT HEADCOUNT */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-header-text">
              <h2>👥 Department Headcount</h2>
              <p>Users registered per department</p>
            </div>
          </div>
          <div className="sa-dept-section">
            {DEPARTMENTS.length === 0 ? (
              <p className="sa-no-data">No users found.</p>
            ) : (
              DEPARTMENTS.map((dept) => (
                <div key={dept.name} className="sa-dept-row">
                  <div className="sa-dept-info">
                    <div className="sa-dept-label">
                      <span className="sa-dept-dot" style={{ background: dept.color }} />
                      <span className="sa-dept-name">{dept.name}</span>
                    </div>
                    <span className="sa-dept-count">{dept.count} <span className="sa-dept-unit">users</span></span>
                  </div>
                  <div className="sa-progress-bar">
                    <div
                      className="sa-progress-fill"
                      style={{
                        width: `${Math.max(3, (dept.count / maxDeptCount) * 100)}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>
                  <div className="sa-dept-pct">
                    {fetchedTotalUsers > 0 ? Math.round((dept.count / fetchedTotalUsers) * 100) : 0}% of workforce
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. LIVE SYSTEM FEED */}
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
            <button 
              className="sa-btn-link" 
              onClick={() => navigate('/admin/activity-logs')}
            >
              View Full Audit Log <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;