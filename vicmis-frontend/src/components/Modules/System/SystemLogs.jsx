import React, { useState, useEffect, useRef } from 'react';
import api from '@/api/axios';
import './css/SystemLogs.css';

const SystemLogs = () => {
  const [errorLogs, setErrorLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/system-logs');
      setErrorLogs(res.data.logs);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => {
    if (!isLoading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLoading]);

  const classifyLog = (log) => {
    if (log.includes('local.ERROR') || log.includes('Stack trace:') || log.includes('Exception')) return 'error';
    if (log.includes('WARNING') || log.includes('WARN')) return 'warn';
    if (log.includes('INFO') || log.includes('local.INFO')) return 'info';
    return 'default';
  };

  const filteredLogs = errorLogs.filter(log => {
    const type = classifyLog(log);
    const matchesFilter = filter === 'all' || type === filter;
    const matchesSearch = log.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = errorLogs.reduce((acc, log) => {
    acc[classifyLog(log)] = (acc[classifyLog(log)] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="vcc-module">
      <div className="vcc-module-header">
        <div>
          <h2 className="vcc-module-title">System Diagnostics</h2>
          <p className="vcc-module-subtitle">{errorLogs.length} log entries captured</p>
        </div>
        <button className="vcc-btn-primary" onClick={fetchLogs}>↺ Refresh</button>
      </div>

      {/* Stats Bar */}
      <div className="vcc-log-stats">
        {[
          { key: 'all', label: 'All Logs', count: errorLogs.length, color: '#94a3b8' },
          { key: 'error', label: 'Errors', count: counts.error || 0, color: '#ef4444' },
          { key: 'warn', label: 'Warnings', count: counts.warn || 0, color: '#f59e0b' },
          { key: 'info', label: 'Info', count: counts.info || 0, color: '#3b82f6' },
        ].map(({ key, label, count, color }) => (
          <button key={key} className={`vcc-log-stat-btn ${filter === key ? 'active' : ''}`}
            style={{ '--stat-color': color }} onClick={() => setFilter(key)}>
            <span className="vcc-stat-count" style={{ color }}>{count}</span>
            <span className="vcc-stat-label">{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="vcc-log-search">
        <span className="vcc-search-icon">⌕</span>
        <input className="vcc-search-input dark" type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Terminal */}
      {isLoading ? (
        <div className="vcc-loader"><div className="vcc-spinner" /></div>
      ) : (
        <div className="vcc-terminal">
          <div className="vcc-terminal-bar">
            <span className="vcc-term-dot red" /><span className="vcc-term-dot yellow" /><span className="vcc-term-dot green" />
            <span className="vcc-term-title">vision-system — bash</span>
          </div>
          <div className="vcc-terminal-body">
            {filteredLogs.length === 0 ? (
              <div className="vcc-term-empty">
                <span style={{ color: '#4af626' }}>$ </span>
                <span style={{ color: '#94a3b8' }}>{errorLogs.length === 0 ? 'System running clean. No errors detected. ✓' : 'No logs match current filters.'}</span>
              </div>
            ) : (
              filteredLogs.map((log, i) => {
                const type = classifyLog(log);
                const color = type === 'error' ? '#ff5555' : type === 'warn' ? '#f59e0b' : type === 'info' ? '#60a5fa' : '#4af626';
                return (
                  <div key={i} className="vcc-log-line" style={{ borderLeftColor: `${color}40` }}>
                    <span className="vcc-log-num">{String(i + 1).padStart(4, '0')}</span>
                    <span style={{ color }}>{log}</span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
