import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  BarChart2, Target, Layers, Clock, TrendingUp, Briefcase,
  Award, AlertTriangle, Package, Truck, Ship, Warehouse,
  HardHat, Filter, RefreshCw, ArrowUpRight, ArrowDownRight,
  ChevronRight, Globe, Building2, Users, Zap, CheckCircle,
} from 'lucide-react';
import './ManagerDashboard.css';

// ─── Mini bar for pipeline funnel ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'to be contacted',             label: 'To Contact', color: '#94a3b8' },
  { key: 'contacted',                   label: 'Contacted',  color: '#3b82f6' },
  { key: 'for presentation',            label: 'Presenting', color: '#f59e0b' },
  { key: 'ready for creating project',  label: 'Ready',      color: '#10b981' },
];

const PipelineFunnel = ({ leads = [] }) => {
  const active = leads.filter(l => !l.is_trashed);
  const max    = Math.max(1, ...PIPELINE_STAGES.map(s =>
    active.filter(l => (l.status || '').toLowerCase().trim() === s.key).length
  ));
  return (
    <div className="mgr2-funnel">
      {PIPELINE_STAGES.map(stage => {
        const count = active.filter(l =>
          (l.status || '').toLowerCase().trim() === stage.key
        ).length;
        return (
          <div key={stage.key} className="mgr2-funnel-row">
            <span className="mgr2-funnel-label">{stage.label}</span>
            <div className="mgr2-funnel-track">
              <div
                className="mgr2-funnel-fill"
                style={{
                  width: `${Math.max(4, (count / max) * 100)}%`,
                  background: stage.color,
                }}
              />
            </div>
            <span className="mgr2-funnel-count" style={{ color: stage.color }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Phase Bar Graph ──────────────────────────────────────────────────────────
const PhaseGraph = ({ phaseCounts = {} }) => {
  const phases = [
    { label: 'Sales',       value: phaseCounts.sales       || 0, color: '#497B97' },
    { label: 'Logistics',   value: phaseCounts.logistics   || 0, color: '#d97706' },
    { label: 'Engineering', value: phaseCounts.engineering || 0, color: '#10b981' },
    { label: 'Billing',     value: phaseCounts.accounting  || 0, color: '#C20100' },
  ];
  const max = Math.max(...phases.map(p => p.value), 1);
  return (
    <div className="mgr2-phase-graph">
      {phases.map((p, i) => (
        <div key={i} className="mgr2-phase-col">
          <div className="mgr2-phase-bar-wrap">
            <div
              className="mgr2-phase-bar"
              style={{
                height: `${Math.max((p.value / max) * 100, 4)}%`,
                background: p.color,
              }}
            >
              <span className="mgr2-phase-tip">{p.value}</span>
            </div>
          </div>
          <span className="mgr2-phase-label" style={{ color: p.color }}>{p.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, label, value, color, sub }) => (
  <div className="mgr2-stat-pill" style={{ '--pill-color': color }}>
    <div className="mgr2-pill-icon"><Icon size={16} /></div>
    <div className="mgr2-pill-body">
      <span className="mgr2-pill-value">{value}</span>
      <span className="mgr2-pill-label">{label}</span>
      {sub && <span className="mgr2-pill-sub">{sub}</span>}
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, color }) => (
  <div className="mgr2-section-header" style={{ '--sh-color': color }}>
    <div className="mgr2-section-icon-wrap">
      <Icon size={16} />
    </div>
    <div>
      <h2 className="mgr2-section-title">{title}</h2>
      {subtitle && <p className="mgr2-section-sub">{subtitle}</p>}
    </div>
    <div className="mgr2-section-rule" />
  </div>
);

// ─── Monthly Target Bar ───────────────────────────────────────────────────────
const MONTHLY_GOAL = 5;
const MonthlyTarget = ({ leads = [] }) => {
  const now       = new Date();
  const thisMonth = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const converted = thisMonth.filter(l => {
    const s = (l.status || '').toLowerCase();
    return (s.includes('project') && s.includes('created')) || s.includes('won');
  }).length;
  const pct = Math.min(100, Math.round((converted / MONTHLY_GOAL) * 100));
  const color = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
  return (
    <div className="mgr2-target">
      <div className="mgr2-target-head">
        <Target size={12} color={color} />
        <span>Monthly Conversion Goal</span>
        <strong style={{ color }}>{converted} / {MONTHLY_GOAL}</strong>
      </div>
      <div className="mgr2-target-track">
        <div className="mgr2-target-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mgr2-target-pct" style={{ color }}>{pct}%</span>
    </div>
  );
};

// ─── Inventory Snapshot Bars ──────────────────────────────────────────────────
const InventorySnapshot = ({ inventory = [] }) => {
  const on  = inventory.filter(i => i.availability === 'ON STOCK').length;
  const low = inventory.filter(i => i.availability === 'LOW STOCK').length;
  const no  = inventory.filter(i => i.availability === 'NO STOCK').length;
  const total = inventory.length || 1;
  const bars = [
    { label: 'On Stock',  count: on,  color: '#10b981' },
    { label: 'Low Stock', count: low, color: '#f59e0b' },
    { label: 'No Stock',  count: no,  color: '#C20100' },
  ];
  return (
    <div className="mgr2-inv-snapshot">
      {bars.map(b => (
        <div key={b.label} className="mgr2-inv-bar-row">
          <span className="mgr2-inv-bar-label">{b.label}</span>
          <div className="mgr2-inv-bar-track">
            <div
              className="mgr2-inv-bar-fill"
              style={{ width: `${(b.count / total) * 100}%`, background: b.color }}
            />
          </div>
          <span className="mgr2-inv-bar-count" style={{ color: b.color }}>{b.count}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const ManagerDashboard = ({ user }) => {
  const [loading,      setLoading]      = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Raw data states
  const [adminStats,   setAdminStats]   = useState(null); // kept for future use if role allows
  const [leads,        setLeads]        = useState([]);
  const [engStats,     setEngStats]     = useState(null);
  const [inventory,    setInventory]    = useState([]);
  const [shipments,    setShipments]    = useState([]);
  const [deliveries,   setDeliveries]   = useState([]);
  const [reorders,     setReorders]     = useState([]);
  const [reports,      setReports]      = useState([]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setIsRefreshing(true);
    try {
      const [
        activeLeadsRes, trashedLeadsRes,
        engRes,
        invRes, shipRes, delRes, reorderRes, reportRes,
      ] = await Promise.all([
        api.get('/leads').catch(() => ({ data: [] })),
        api.get('/leads/trashed').catch(() => ({ data: [] })),
        api.get('/engineering/dashboard-stats').catch(() => ({ data: null })),
        api.get('/warehouse-inventory', { params: { per_page: 9999 } }).catch(() => ({ data: [] })),
        api.get('/inventory/shipments').catch(() => ({ data: [] })),
        api.get('/inventory/logistics', { params: { per_page: 9999 } }).catch(() => ({ data: [] })),
        api.get('/inventory/reorder-requests').catch(() => ({ data: [] })),
        api.get('/inventory/shipments/reports').catch(() => ({ data: [] })),
      ]);

      // ── Leads — handle both array and paginated {data:[]} shape ──
      const normalizeArray = (res) => {
        const d = res?.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.data)) return d.data;
        // Some APIs wrap in {leads:[]} or {items:[]}
        for (const key of ['leads','items','results']) {
          if (Array.isArray(d[key])) return d[key];
        }
        return [];
      };

      const activeRows  = normalizeArray(activeLeadsRes);
      const trashedRows = normalizeArray(trashedLeadsRes);
      console.log('[MGR] leads active:', activeRows.length, '| trashed:', trashedRows.length);
      setLeads([...activeRows, ...trashedRows.map(l => ({ ...l, is_trashed: true }))]);

      // ── Engineering stats ──
      console.log('[MGR] engStats raw:', engRes.data);
      setEngStats(engRes.data);

      // ── Inventory ──
      const invRows = normalizeArray(invRes);
      console.log('[MGR] inventory rows:', invRows.length, '| sample:', invRows[0]);
      setInventory(invRows);

      // ── Shipments ──
      const shipRows = normalizeArray(shipRes);
      console.log('[MGR] shipments:', shipRows.length);
      setShipments(shipRows);

      // ── Deliveries ──
      const delRows = normalizeArray(delRes);
      console.log('[MGR] deliveries:', delRows.length);
      setDeliveries(delRows);

      // ── Reorders ──
      const reorderRows = normalizeArray(reorderRes);
      console.log('[MGR] reorders:', reorderRows.length);
      setReorders(reorderRows);

      // ── Reports ──
      const reportRows = normalizeArray(reportRes);
      console.log('[MGR] reports:', reportRows.length);
      setReports(reportRows);

    } catch (err) {
      console.error('[MGR] dashboard fetch failed:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="mgr2-loading">
        <div className="mgr2-spinner" />
        <p>Loading Operational Overview…</p>
      </div>
    );
  }

  // ── Derived: Sales ────────────────────────────────────────────────────
  const totalLeads   = leads.length;
  const activeLeads  = leads.filter(l => !l.is_trashed).length;
  const trashedLeads = leads.filter(l =>  l.is_trashed).length;
  const converted    = leads.filter(l => {
    if (l.is_trashed) return false;
    const s = (l.status || '').toLowerCase();
    return (s.includes('project') && s.includes('created')) || s.includes('won');
  }).length;
  const winRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const followUpsDue = leads.filter(l => {
    if (l.is_trashed) return false;
    const s = (l.status || '').toLowerCase();
    if (s.includes('project') && s.includes('created')) return false;
    if (!l.updated_at && !l.created_at) return false;
    return (Date.now() - new Date(l.updated_at || l.created_at).getTime()) / 86400000 >= 3;
  }).length;

  // ── Derived: Engineering ──────────────────────────────────────────────
  const totalProjects   = engStats?.total_projects      || 0;
  const pendingTasks    = engStats?.pending_tasks        || 0;
  const totalEngineers  = engStats?.total_engineers      || 0;
  const globalProgress  = engStats?.project_progress     || '0%';
  const pickupQueue     = engStats?.pickup_queue?.length || 0;
  const activeProjects  = engStats?.active_projects?.length ?? totalProjects;
  const pendingApprvals = pendingTasks;

  // Phase distribution — derived from leads statuses (no admin endpoint needed)
  const activeLeadsList = leads.filter(l => !l.is_trashed);
  const countByKeywords = (...words) =>
    activeLeadsList.filter(l => words.some(w => (l.status || '').toLowerCase().includes(w))).length;
  const phaseCounts = {
    sales:       countByKeywords('sales', 'planning', 'to be contacted', 'contacted', 'presentation', 'ready'),
    logistics:   countByKeywords('logistics', 'pre-execution', 'material', 'delivery'),
    engineering: countByKeywords('engineering', 'construction', 'installation', 'monitoring'),
    accounting:  countByKeywords('billing', 'handover', 'accounting', 'invoic', 'coc'),
  };

  // ── Derived: Inventory ────────────────────────────────────────────────
  const noStockCount   = inventory.filter(i => i.availability === 'NO STOCK').length;
  const lowStockCount  = inventory.filter(i => i.availability === 'LOW STOCK').length;
  const criticalAlerts = noStockCount + lowStockCount;
  const activeShipments = shipments.filter(s => s.shipment_status !== 'ARRIVED').length;
  const inTransit      = deliveries.filter(d => d.status !== 'Delivered').length;
  const pendingReorders= reorders.filter(r => r.status === 'pending').length;
  const arrivedPending = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="mgr2-wrapper">

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="mgr2-header">
        <div className="mgr2-header-left">
          <div className="mgr2-header-icon"><BarChart2 size={20} /></div>
          <div>
            <h1 className="mgr2-title">Operational Overview</h1>
            <p className="mgr2-subtitle">Manager Access · All Departments · Read-Only</p>
          </div>
        </div>
        <div className="mgr2-header-right">
          <span className="mgr2-date-badge">{today}</span>
          <button
            className={`mgr2-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => fetchAll(true)}
            title="Refresh all data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ══ TOP KPI STRIP ═══════════════════════════════════════════════ */}
      <div className="mgr2-top-strip">
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#497B97' }}>
          <Layers size={15} />
          <div>
            <span className="mgr2-chip-val">{activeProjects}</span>
            <span className="mgr2-chip-lbl">Active Projects</span>
          </div>
        </div>
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#10b981' }}>
          <Target size={15} />
          <div>
            <span className="mgr2-chip-val">{totalLeads}</span>
            <span className="mgr2-chip-lbl">Total Leads</span>
          </div>
        </div>
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#C20100' }}>
          <Clock size={15} />
          <div>
            <span className="mgr2-chip-val">{pendingApprvals}</span>
            <span className="mgr2-chip-lbl">Pending Approvals</span>
          </div>
        </div>
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#d97706' }}>
          <AlertTriangle size={15} />
          <div>
            <span className="mgr2-chip-val">{criticalAlerts}</span>
            <span className="mgr2-chip-lbl">Stock Alerts</span>
          </div>
        </div>
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#6366f1' }}>
          <Users size={15} />
          <div>
            <span className="mgr2-chip-val">{totalEngineers}</span>
            <span className="mgr2-chip-lbl">Active Engineers</span>
          </div>
        </div>
        <div className="mgr2-kpi-chip" style={{ '--chip-color': '#0ea5e9' }}>
          <Ship size={15} />
          <div>
            <span className="mgr2-chip-val">{activeShipments}</span>
            <span className="mgr2-chip-lbl">Active Shipments</span>
          </div>
        </div>
      </div>

      <div className="mgr2-body">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 · SALES
        ══════════════════════════════════════════════════════════════ */}
        <section className="mgr2-dept-section">
          <SectionHeader
            icon={TrendingUp}
            title="Sales Department"
            subtitle="Lead pipeline · conversion performance · follow-up health"
            color="#497B97"
          />

          <div className="mgr2-dept-grid">

            {/* KPI Row */}
            <div className="mgr2-panel mgr2-panel--kpis">
              <StatPill icon={TrendingUp}    label="Total Leads"   value={totalLeads}   color="#497B97" sub={`${activeLeads} active · ${trashedLeads} trashed`} />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Briefcase}     label="Converted"     value={converted}    color="#059669" sub="Projects created" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Award}         label="Win Rate"      value={`${winRate}%`} color={winRate >= 50 ? '#10b981' : '#f59e0b'} sub={winRate >= 50 ? 'On track' : 'Needs attention'} />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Clock}         label="Follow-ups Due" value={followUpsDue} color={followUpsDue > 0 ? '#C20100' : '#10b981'} sub="Leads stale 3+ days" />
            </div>

            {/* Pipeline Funnel */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Filter size={13} /> Pipeline Funnel</p>
              <PipelineFunnel leads={leads} />
            </div>

            {/* Monthly Target */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Target size={13} /> Monthly Conversion Goal</p>
              <MonthlyTarget leads={leads} />
              <div className="mgr2-target-note">
                <Zap size={11} />
                Goal: {MONTHLY_GOAL} conversions / month
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 · ENGINEERING
        ══════════════════════════════════════════════════════════════ */}
        <section className="mgr2-dept-section">
          <SectionHeader
            icon={HardHat}
            title="Engineering Department"
            subtitle="Project phases · task workload · team allocation"
            color="#10b981"
          />

          <div className="mgr2-dept-grid">

            {/* KPI Row */}
            <div className="mgr2-panel mgr2-panel--kpis">
              <StatPill icon={Layers}   label="Total Projects"   value={totalProjects}  color="#221F1F" sub="All phases combined" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Clock}    label="Pending Tasks"    value={pendingTasks}   color={pendingTasks > 0 ? '#C20100' : '#10b981'} sub="Awaiting assignment" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Users}    label="Engineers"        value={totalEngineers} color="#497B97" sub="Active field staff" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={TrendingUp} label="Global Progress" value={globalProgress} color="#10b981" sub="Across all projects" />
              {pickupQueue > 0 && (
                <>
                  <div className="mgr2-pill-divider" />
                  <StatPill icon={AlertTriangle} label="Unclaimed" value={pickupQueue} color="#f59e0b" sub="No engineer assigned" />
                </>
              )}
            </div>

            {/* Phase Distribution Graph */}
            <div className="mgr2-panel mgr2-panel--graph">
              <p className="mgr2-panel-title"><BarChart2 size={13} /> Phase Distribution</p>
              <PhaseGraph phaseCounts={phaseCounts} />
              <div className="mgr2-phase-legend">
                {[
                  { label: 'Sales',       color: '#497B97' },
                  { label: 'Logistics',   color: '#d97706' },
                  { label: 'Engineering', color: '#10b981' },
                  { label: 'Billing',     color: '#C20100' },
                ].map(p => (
                  <span key={p.label} className="mgr2-phase-leg-item">
                    <span className="mgr2-phase-leg-dot" style={{ background: p.color }} />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Pipeline Stage Detail */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Layers size={13} /> Phase Pipeline</p>
              <div className="mgr2-pipeline-list">
                {[
                  { phase: 'Phase 1', label: 'Planning & Sales',      key: 'sales',       color: '#497B97', desc: 'Floor plans, BOQ, PO gathering' },
                  { phase: 'Phase 2', label: 'Pre-Execution',         key: 'logistics',   color: '#d97706', desc: 'Materials, logistics, delivery' },
                  { phase: 'Phase 3', label: 'Active Construction',   key: 'engineering', color: '#10b981', desc: 'Installation, monitoring, QA' },
                  { phase: 'Phase 4', label: 'Handover & Billing',    key: 'accounting',  color: '#C20100', desc: 'Client walkthrough, COC, invoicing' },
                ].map(item => (
                  <div key={item.key} className="mgr2-pipe-row">
                    <span className="mgr2-pipe-dot" style={{ background: item.color }} />
                    <div className="mgr2-pipe-info">
                      <span className="mgr2-pipe-phase">{item.phase}: {item.label}</span>
                      <span className="mgr2-pipe-desc">{item.desc}</span>
                    </div>
                    <span className="mgr2-pipe-count" style={{ color: item.color }}>
                      {phaseCounts[item.key] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 · INVENTORY
        ══════════════════════════════════════════════════════════════ */}
        <section className="mgr2-dept-section">
          <SectionHeader
            icon={Warehouse}
            title="Inventory & Warehouse"
            subtitle="Stock health · SKU levels · critical alerts"
            color="#d97706"
          />

          <div className="mgr2-dept-grid">

            {/* KPI Row */}
            <div className="mgr2-panel mgr2-panel--kpis">
              <StatPill icon={AlertTriangle} label="Critical Alerts" value={criticalAlerts}    color={criticalAlerts > 0 ? '#C20100' : '#10b981'} sub={`${noStockCount} no stock · ${lowStockCount} low`} />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Package}       label="Total SKUs"      value={inventory.length}  color="#221F1F" sub="Warehouse items" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={CheckCircle}   label="On Stock"        value={inventory.filter(i => i.availability === 'ON STOCK').length} color="#10b981" sub="Healthy stock" />
            </div>

            {/* Stock Snapshot */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Warehouse size={13} /> Stock Health Snapshot</p>
              <InventorySnapshot inventory={inventory} />
              {noStockCount > 0 && (
                <div className="mgr2-nostock-alert">
                  <AlertTriangle size={12} color="#C20100" />
                  <span>{noStockCount} product{noStockCount !== 1 ? 's' : ''} out of stock — immediate action required</span>
                </div>
              )}
            </div>

            {/* Critical items list */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><AlertTriangle size={13} /> Items Needing Attention</p>
              <div className="mgr2-alerts-list">
                {inventory
                  .filter(i => i.availability === 'NO STOCK' || i.availability === 'LOW STOCK')
                  .slice(0, 5)
                  .map((item, i) => (
                    <div key={i} className="mgr2-alert-row">
                      <span
                        className="mgr2-alert-dot"
                        style={{ background: item.availability === 'NO STOCK' ? '#C20100' : '#f59e0b' }}
                      />
                      <div className="mgr2-alert-info">
                        <span className="mgr2-alert-code">{item.product_code}</span>
                        <span className="mgr2-alert-cat">{item.product_category}</span>
                      </div>
                      <span
                        className="mgr2-avail-badge"
                        style={{
                          background: item.availability === 'NO STOCK' ? '#fee2e2' : '#fef3c7',
                          color:      item.availability === 'NO STOCK' ? '#C20100' : '#b45309',
                        }}
                      >
                        {item.availability}
                      </span>
                    </div>
                  ))}
                {criticalAlerts === 0 && (
                  <div className="mgr2-all-clear">
                    <CheckCircle size={20} color="#10b981" />
                    <span>All stock levels are healthy</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4 · LOGISTICS
        ══════════════════════════════════════════════════════════════ */}
        <section className="mgr2-dept-section">
          <SectionHeader
            icon={Ship}
            title="Logistics & Procurement"
            subtitle="Shipments · deliveries · reorder requests · reports"
            color="#0ea5e9"
          />

          <div className="mgr2-dept-grid">

            {/* KPI Row */}
            <div className="mgr2-panel mgr2-panel--kpis">
              <StatPill icon={Ship}          label="Active Shipments"  value={activeShipments}  color="#497B97" sub={arrivedPending > 0 ? `${arrivedPending} pending check-in` : 'All checked in'} />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Truck}         label="In-Transit"        value={inTransit}         color="#221F1F" sub={`${deliveries.filter(d => d.status === 'Delivered').length} delivered`} />
              <div className="mgr2-pill-divider" />
              <StatPill icon={Package}       label="Reorder Requests"  value={pendingReorders}   color={pendingReorders > 0 ? '#d97706' : '#10b981'} sub="Pending acknowledgement" />
              <div className="mgr2-pill-divider" />
              <StatPill icon={AlertTriangle} label="Reports Filed"     value={reports.length}    color={reports.length > 0 ? '#C20100' : '#10b981'} sub="Return / damage reports" />
            </div>

            {/* Recent Shipments Feed */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Ship size={13} /> Recent Shipments</p>
              <div className="mgr2-feed">
                {shipments.length === 0 ? (
                  <p className="mgr2-empty">No shipments recorded.</p>
                ) : shipments.slice(0, 5).map((s, i) => {
                  const statusColor =
                    s.shipment_status === 'ARRIVED'   ? '#10b981' :
                    s.shipment_status === 'DEPARTURE' ? '#3b82f6' : '#94a3b8';
                  return (
                    <div key={i} className="mgr2-feed-row">
                      <div className="mgr2-feed-icon" style={{ background: s.origin_type === 'INTERNATIONAL' ? '#fee2e2' : '#dbeafe' }}>
                        {s.origin_type === 'INTERNATIONAL'
                          ? <Globe size={12} color="#C20100" />
                          : <Building2 size={12} color="#3b82f6" />}
                      </div>
                      <div className="mgr2-feed-info">
                        <span className="mgr2-feed-title">{s.shipment_number}</span>
                        <span className="mgr2-feed-meta">{s.container_type} · {s.origin_type}</span>
                      </div>
                      <span className="mgr2-feed-badge" style={{ color: statusColor, background: `${statusColor}18` }}>
                        {s.shipment_status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reorder Requests */}
            <div className="mgr2-panel">
              <p className="mgr2-panel-title"><Package size={13} /> Reorder Requests</p>
              <div className="mgr2-feed">
                {reorders.length === 0 ? (
                  <p className="mgr2-empty">No reorder requests.</p>
                ) : reorders.slice(0, 5).map((r, i) => {
                  const statusColor =
                    r.status === 'ordered'      ? '#10b981' :
                    r.status === 'acknowledged' ? '#3b82f6' : '#f59e0b';
                  return (
                    <div key={i} className="mgr2-feed-row">
                      <div className="mgr2-feed-icon" style={{ background: `${statusColor}18` }}>
                        <Package size={12} color={statusColor} />
                      </div>
                      <div className="mgr2-feed-info">
                        <span className="mgr2-feed-title">{r.product_code}</span>
                        <span className="mgr2-feed-meta">{r.product_category} · Qty: {r.quantity_needed} {r.unit}</span>
                      </div>
                      <span className="mgr2-feed-badge" style={{ color: statusColor, background: `${statusColor}18` }}>
                        {r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default ManagerDashboard;