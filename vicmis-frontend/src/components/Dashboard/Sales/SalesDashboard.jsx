import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Building2, 
  Clock, 
  Trophy, 
  RefreshCw, 
  Users,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import './SalesDashboard.css';

const SalesDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    convertedProjects: 0,
    pendingApprovals: 0,
    winRate: '0%',
    pipeline: []
  });

  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  // --- SKELETON COMPONENT ---
  const StatSkeleton = () => (
    <div className="stat-card skeleton-card">
      <div className="stat-content">
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-value"></div>
      </div>
      <div className="skeleton skeleton-circle"></div>
    </div>
  );

  // --- DATA FETCHING (Same Logic as HR) ---
  const fetchSalesData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsSyncing(true);
    try {
      // Replace with your actual sales endpoints
      const [statsRes, leadsRes] = await Promise.all([
        api.get('/sales/dashboard-stats'),
        api.get('/sales/leads/recent')
      ]);
      
      setStats(statsRes.data);
      setLeads(leadsRes.data);
      setLastSynced(new Date());
    } catch (error) {
      console.error("Sales Sync Error:", error);
      if (!silent) toast.error("Failed to sync sales data.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // --- AUTO-REFRESH (30 SECONDS) ---
  useEffect(() => {
    fetchSalesData();
    const interval = setInterval(() => {
      fetchSalesData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      {/* HEADER SECTION - Matching HR Style */}
      <div className="dashboard-header">
        <div className="header-text">
          <h2>Sales Executive Console</h2>
          <p className="dashboard-subtext">Vision Brand Management • {currentMonthName} {new Date().getFullYear()}</p>
        </div>
        <button className={`hr-sync-btn ${isSyncing ? 'syncing' : ''}`} onClick={() => fetchSalesData()}>
          <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
          <span>Last Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </button>
      </div>

      {/* STATS GRID - 4 Column Layout with signature borders */}
      <div className="stats-grid">
        {loading ? (
          <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
        ) : (
          <>
            <div className="stat-card total">
              <div className="stat-content">
                <span className="stat-label">Total Leads</span>
                <h2 className="stat-value">{stats.totalLeads}</h2>
              </div>
              <TrendingUp size={28} className="stat-icon-fade" />
            </div>

            <div className="stat-card converted">
              <div className="stat-content">
                <span className="stat-label">Converted Projects</span>
                <h2 className="stat-value">{stats.convertedProjects}</h2>
              </div>
              <Building2 size={28} className="stat-icon-fade" />
            </div>

            <div className="stat-card pending">
              <div className="stat-content">
                <span className="stat-label">Pending Approvals</span>
                <h2 className="stat-value">{stats.pendingApprovals}</h2>
              </div>
              <Clock size={28} className="stat-icon-fade" />
            </div>

            <div className="stat-card winrate">
              <div className="stat-content">
                <span className="stat-label">Win Rate</span>
                <h2 className="stat-value">{stats.winRate}</h2>
              </div>
              <Trophy size={28} className="stat-icon-fade" />
            </div>
          </>
        )}
      </div>

      {/* MAIN CONTENT - 2:1 Layout like HR */}
      <div className="dashboard-main-grid">
        <div className="dashboard-card">
          <h3>Recent Leads</h3>
          <div className="table-responsive">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-semibold">{lead.client_name}</td>
                    <td>{lead.project_name}</td>
                    <td>
                      <span className={`status-pill ${lead.status.toLowerCase().replace(' ', '-')}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <button className="view-details-btn">
                        Details <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Pipeline Overview</h3>
          <div className="pipeline-list">
             {stats.pipeline?.map((item, index) => (
               <div key={index} className="pipeline-item">
                  <span className="stage-name">{item.stage}</span>
                  <span className="stage-count">{item.count}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;