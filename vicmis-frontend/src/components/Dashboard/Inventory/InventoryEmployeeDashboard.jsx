import React, { useState, useEffect, useCallback } from 'react';
import inventoryService from '@/api/inventoryService';
import api from '@/api/axios';
import './InventoryDashboard.css';

const InventoryEmployeeDashboard = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ deliveries: 0, shipments: 0 });
  const [tasks, setTasks] = useState({ incoming: [], outbound: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [alertRes, logiRes, shipRes] = await Promise.all([
        inventoryService.getAlerts(),
        api.get('/inventory/logistics'), // Source for deliverymat
        api.get('/inventory/shipments')  // Source for incomingshipment
      ]);

      setAlerts(alertRes.data);
      
      // Filter for items that aren't finished yet
      const pendingDeliveries = logiRes.data.filter(d => d.status !== 'Delivered');
      const pendingShipments = shipRes.data.filter(s => s.status !== 'Received');

      setCounts({
        deliveries: pendingDeliveries.length,
        shipments: pendingShipments.length
      });

      // Map real data to the task checklist (latest 3 of each)
      setTasks({
        outbound: pendingDeliveries.slice(0, 3),
        incoming: pendingShipments.slice(0, 3)
      });

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const employeeStats = [
    { id: 1, label: 'Low Stock Items', value: alerts.length, icon: '⚠️', color: '#ef4444' },
    { id: 2, label: 'Incoming Shipments', value: counts.shipments, icon: '📥', color: '#059669' },
    { id: 3, label: 'Outbound Deliveries', value: counts.deliveries, icon: '🚛', color: '#4318ff' },
    { id: 4, label: 'System Health', value: 'Live', icon: '🛡️', color: '#7f8c8d' },
  ];

  return (
    <div className="inventory-dashboard-container">
      <div className="dashboard-header">
        <div className="header-info">
          <h1>Inventory Operations</h1>
          <p className="subtitle">Welcome, {user?.name || 'Staff'} | {new Date().toLocaleDateString()}</p>
        </div>
        <div className="live-badge">
          <span className="blink-dot"></span> Real-time Operations
        </div>
      </div>

      {/* OPERATION STATS */}
      <div className="stats-grid">
        {employeeStats.map(stat => (
          <div key={stat.id} className="stat-card" style={{ borderBottom: `4px solid ${stat.color}` }}>
            <div className="stat-icon-wrapper" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-layout">
        {/* LEFT: STOCK ALERTS */}
        <div className="alert-section">
          <div className="glass-card">
            <div className="card-header">
              <h3>🚨 Critical Stock Alerts</h3>
              <p>Replenish these materials immediately</p>
            </div>
            <div className="alert-feed">
              {loading ? <p>Loading alerts...</p> : alerts.length > 0 ? (
                alerts.map((item, idx) => (
                  <div key={idx} className="feed-item-alert">
                    <div className="alert-dot"></div>
                    <div className="alert-content">
                      <strong>{item.name}</strong>
                      <span>{item.quantity} {item.unit} remaining in {item.category}</span>
                    </div>
                  </div>
                ))
              ) : <div className="empty-state">✅ All stocks healthy</div>}
            </div>
          </div>
        </div>

        {/* RIGHT: REAL-TIME TASK CHECKLIST */}
        <div className="task-section">
          <div className="glass-card">
            <div className="card-header">
              <h3>📋 Daily Logistics Checklist</h3>
              <p>Live tasks from Shipments & Site Deliveries</p>
            </div>
            <div className="task-list">
              {/* Incoming Tasks */}
              {tasks.incoming.map(ship => (
                <div key={`in-${ship.id}`} className="task-item">
                  <input type="checkbox" id={`in-${ship.id}`} />
                  <label htmlFor={`in-${ship.id}`}>
                    Confirm <strong>{ship.name}</strong> from {ship.supplier}
                    <span className="task-tag in">INCOMING</span>
                  </label>
                </div>
              ))}

              {/* Outbound Tasks */}
              {tasks.outbound.map(del => (
                <div key={`out-${del.id}`} className="task-item">
                  <input type="checkbox" id={`out-${del.id}`} />
                  <label htmlFor={`out-${del.id}`}>
                    Release <strong>{del.item_name}</strong> to {del.destination}
                    <span className="task-tag out">OUTBOUND</span>
                  </label>
                </div>
              ))}

              {!loading && tasks.incoming.length === 0 && tasks.outbound.length === 0 && (
                <p className="empty-state">No pending logistics tasks.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>Data synced with <strong>BuildFlow Logistics Engine</strong>. Check relevant tabs for full management.</p>
      </footer>
    </div>
  );
};

export default InventoryEmployeeDashboard;