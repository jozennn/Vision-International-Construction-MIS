import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Target, TrendingUp, Layers, Clock, BarChart2 } from 'lucide-react';
import './ManagerDashboard.css';

/* ── Phase bar graph — pure CSS bars, no external chart lib ── */
const PhaseGraph = ({ stats }) => {
  const maxVal = stats?.active_projects || 10;

  const phases = [
    { label: 'Phase 1\nSales',       leads: stats?.bottlenecks?.sales       || 0, color: '#497B97' },
    { label: 'Phase 2\nLogistics',   leads: stats?.bottlenecks?.logistics   || 0, color: '#d97706' },
    { label: 'Phase 3\nEngineering', leads: stats?.bottlenecks?.engineering || 0, color: '#10b981' },
    { label: 'Phase 4\nBilling',     leads: stats?.bottlenecks?.accounting  || 0, color: '#C20100' },
  ];

  const graphMax = Math.max(...phases.map(p => p.leads), 1);
  const ySteps   = [0, Math.round(graphMax * 0.25), Math.round(graphMax * 0.5), Math.round(graphMax * 0.75), graphMax];

  const pct = (val) => `${Math.max((val / graphMax) * 100, 2)}%`;

  return (
    <div className="mgr-graph-wrap">
      <div className="mgr-graph-legend">
        <div className="mgr-legend-item">
          <div className="mgr-legend-dot" style={{ background: '#497B97' }}></div> Sales
        </div>
        <div className="mgr-legend-item">
          <div className="mgr-legend-dot" style={{ background: '#d97706' }}></div> Logistics
        </div>
        <div className="mgr-legend-item">
          <div className="mgr-legend-dot" style={{ background: '#10b981' }}></div> Engineering
        </div>
        <div className="mgr-legend-item">
          <div className="mgr-legend-dot" style={{ background: '#C20100' }}></div> Billing
        </div>
      </div>

      <div className="mgr-graph-inner">
        {/* Y-axis labels */}
        <div className="mgr-y-axis">
          {[...ySteps].reverse().map((v, i) => (
            <span key={i} className="mgr-y-label">{v}</span>
          ))}
        </div>

        {/* Bars + grid */}
        <div className="mgr-graph-body">
          <div className="mgr-grid-lines">
            {ySteps.map((_, i) => <div key={i} className="mgr-grid-line" />)}
          </div>

          <div className="mgr-bars-row">
            {phases.map((phase, i) => (
              <div key={i} className="mgr-bar-group">
                <div className="mgr-bars">
                  <div
                    className="mgr-bar"
                    style={{ height: pct(phase.leads), backgroundColor: phase.color }}
                  >
                    <span className="mgr-bar-tip">{phase.leads}</span>
                  </div>
                </div>
                <div className="mgr-bar-label" style={{ whiteSpace: 'pre-line' }}>
                  {phase.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard = ({ user }) => {
  const [stats, setStats]     = useState(null);
  const [leads, setLeads]     = useState([]); // 👇 NEW: State to hold the raw leads
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 👇 UPDATED: Fetching stats, active leads, and trashed leads simultaneously
        const [statsRes, activeRes, trashedRes] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/leads'),
          api.get('/leads/trashed').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data);

        const activeRows = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data ?? []);
        const trashedRows = Array.isArray(trashedRes.data) ? trashedRes.data : (trashedRes.data?.data ?? []);

        // Tag the trashed leads so we can separate them in the math
        const taggedTrashed = trashedRows.map(lead => ({ ...lead, is_trashed: true }));
        
        setLeads([...activeRows, ...taggedTrashed]);
      } catch (err) {
        console.error('Failed to fetch manager data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="manager-loading">
        <div className="manager-spinner"></div>
        <p>Loading Operational Overview...</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // ─── DYNAMIC FRONTEND MATH ───
  // 👇 NEW: Exactly the same highly-accurate math we used in the other dashboards!
  const totalLeads = leads.length;
  const trashedLeads = leads.filter(lead => lead.is_trashed).length;
  const activeLeads = totalLeads - trashedLeads;

  return (
    <div className="manager-wrapper">

      {/* ─── HEADER ─── */}
      <div className="manager-header">
        <div className="manager-header-left">
          <div className="manager-header-icon">
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 className="manager-title">Operational Overview</h1>
            <p className="manager-subtitle">Manager Access · Read-Only Mode</p>
          </div>
        </div>
        <div className="manager-date-badge">{today}</div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="manager-kpi-grid">

        <div className="manager-kpi-card" style={{ '--kpi-accent': '#497B97' }}>
          <div className="manager-kpi-icon" style={{ background: '#EAF1F6', color: '#497B97' }}>
            <Layers size={22} />
          </div>
          <div className="manager-kpi-data">
            <h3>{stats?.active_projects || 0}</h3>
            <p>Total Active Projects</p>
          </div>
        </div>

        <div className="manager-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="manager-kpi-icon" style={{ background: '#dcfce7', color: '#059669' }}>
            <Target size={22} />
          </div>
          <div className="manager-kpi-data">
            {/* 👇 UPDATED: Using the dynamic totalLeads and showing the breakdown! */}
            <h3>{totalLeads}</h3>
            <p>Total Leads</p>
            <div className="manager-kpi-split">
              <span className="manager-active-text">{activeLeads} Active</span>
              <span className="manager-divider">|</span>
              <span className="manager-trashed-text">{trashedLeads} Trashed</span>
            </div>
          </div>
        </div>

        <div className="manager-kpi-card" style={{ '--kpi-accent': '#C20100' }}>
          <div className="manager-kpi-icon" style={{ background: '#fee2e2', color: '#C20100' }}>
            <Clock size={22} />
          </div>
          <div className="manager-kpi-data">
            <h3>{stats?.bottlenecks?.total_pending || 0}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>

      </div>

      {/* ─── PHASE COMPLETION GRAPH (full-width) ─── */}
      <div className="manager-graph-row">
        <div className="manager-panel">
          <div className="manager-panel-header">
            <div>
              <h2>📊 Phase Distribution Graph</h2>
              <p>Number of active projects per pipeline phase</p>
            </div>
          </div>
          <PhaseGraph stats={stats} />
        </div>
      </div>

      {/* ─── PIPELINE (full-width) ─── */}
      <div className="manager-graph-row">
        <div className="manager-panel">
          <div className="manager-panel-header">
            <div>
              <h2>🔁 Project Phase Pipeline</h2>
              <p>Current distribution of active workflow</p>
            </div>
          </div>
          <div className="manager-pipeline manager-pipeline-grid">

            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#497B97' }}></span>
                <h4>Phase 1: Planning & Sales</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.sales || 0} Projects</div>
              <p className="stage-desc">Floor plans, BOQ, and PO gathering.</p>
            </div>

            <div className="pipeline-stage">
              <div className="stage-header">
                <span className="stage-dot" style={{ backgroundColor: '#d97706' }}></span>
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
                <span className="stage-dot" style={{ backgroundColor: '#C20100' }}></span>
                <h4>Phase 4: Handover & Billing</h4>
              </div>
              <div className="stage-value">{stats?.bottlenecks?.accounting || 0} Projects</div>
              <p className="stage-desc">Client walkthroughs, COC, and final invoicing.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;