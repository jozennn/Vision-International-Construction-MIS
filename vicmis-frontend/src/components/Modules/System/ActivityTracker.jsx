import React, { useState, useEffect } from 'react';
import api from '@/api/axios';

const MODULE_COLORS = {
  Leads: '#3b82f6', Projects: '#8b5cf6', Inventory: '#f59e0b',
  Logistics: '#10b981', Users: '#ef4444', Settings: '#64748b', Engineering: '#0891b2',
};

const ActivityTracker = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/activities');
      setActivities(res.data);
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  const uniqueModules = ['All', ...new Set(activities.map(a => a.module))];

  const filtered = activities.filter(a => {
    const matchSearch = a.user_name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'All' || a.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const formatTime = (ts) => new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  return (
    <div className="vcc-module">
      <div className="vcc-module-header">
        <div>
          <h2 className="vcc-module-title">Activity Tracker</h2>
          <p className="vcc-module-subtitle">{activities.length} events recorded</p>
        </div>
        <button className="vcc-btn-primary" onClick={fetchActivities}>↺ Refresh</button>
      </div>

      {/* Filters */}
      <div className="vcc-filter-bar">
        <div className="vcc-search-wrap">
          <span className="vcc-search-icon">⌕</span>
          <input className="vcc-search-input" type="text" placeholder="Search user or action..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="vcc-select" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          {uniqueModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="vcc-loader"><div className="vcc-spinner" /></div>
      ) : (
        <div className="vcc-activity-timeline">
          {filtered.length === 0 ? (
            <div className="vcc-empty">
              <div className="vcc-empty-icon">📭</div>
              <p>{activities.length === 0 ? 'No activity recorded yet.' : 'No results for current filters.'}</p>
            </div>
          ) : (
            filtered.map((act, i) => {
              const color = MODULE_COLORS[act.module] || '#64748b';
              return (
                <div key={act.id} className="vcc-timeline-row" style={{ animationDelay: `${i * 0.02}s` }}>
                  <div className="vcc-timeline-dot" style={{ background: color }} />
                  <div className="vcc-timeline-content">
                    <div className="vcc-timeline-meta">
                      <span className="vcc-timeline-user">{act.user_name}</span>
                      <span className="vcc-module-pill" style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
                        {act.module}
                      </span>
                      <span className="vcc-timeline-time">{formatTime(act.created_at)}</span>
                    </div>
                    <p className="vcc-timeline-desc">{act.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityTracker;
