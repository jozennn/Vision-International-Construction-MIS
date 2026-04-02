import React from 'react';
import UserManagement from './UserManagement';
import SystemLogs from './SystemLogs';
import ActivityTracker from './ActivityTracker';
import DatabaseManager from './DatabaseManager';
import './css/ControlCenter.css';

const MODULES = [
  {
    key:   'users',
    icon:  '👥',
    label: 'User Management',
    desc:  'Accounts, roles & access',
    color: '#C0392B',
  },
  {
    key:   'database',
    icon:  '🗄️',
    label: 'Database Manager',
    desc:  'Backup, restore & schedule',
    color: '#27AE60',
  },
  {
    key:   'activity',
    icon:  '🕒',
    label: 'Activity Tracker',
    desc:  'User actions & audit trail',
    color: '#2980B9',
  },
  {
    key:   'logs',
    icon:  '⚠️',
    label: 'System Diagnostics',
    desc:  'Errors, crashes & API logs',
    color: '#E67E22',
  },
];

const ControlCenter = ({ user, activeSubItem, setActiveSubItem }) => {
  const isSuperAdmin = user?.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="vcc-access-denied">
        <div className="vcc-denied-icon">🔒</div>
        <h3>Access Restricted</h3>
        <p>Control Center is exclusively available to the Super Administrator.</p>
      </div>
    );
  }

  const activeMod = MODULES.find(m => m.key === activeSubItem);

  return (
    <div className="vcc-root">

      {/* ── Dark Hero Header (matches Inventory style) ── */}
      <div className="vcc-hero">
        <div className="vcc-hero-grid" />
        <div className="vcc-hero-content">
          <div className="vcc-hero-badge">VISION System</div>
          <h1 className="vcc-hero-title">
            {activeMod ? `${activeMod.icon} ${activeMod.label}` : 'Control Center'}
          </h1>
          <p className="vcc-hero-sub">
            {activeMod
              ? activeMod.desc
              : 'System administration, database operations, and infrastructure management'}
          </p>
        </div>
        <div className="vcc-hero-emblem">⚙</div>
      </div>

      {/* ── Status Bar (only on home view) ── */}
      {!activeMod && (
        <div className="vcc-status-bar">
          <div className="vcc-status-item">
            <span className="vcc-status-dot green" />
            <span>System Online</span>
          </div>
          <div className="vcc-status-divider" />
          <div className="vcc-status-item">
            <span className="vcc-status-dot green" />
            <span>Database Connected</span>
          </div>
          <div className="vcc-status-divider" />
          <div className="vcc-status-item">
            <span className="vcc-status-dot amber" />
            <span>Backup Due</span>
          </div>
          <div className="vcc-status-divider" />
          <div className="vcc-status-item">
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}

      {/* ── Sub-module content (driven by sidebar activeSubItem) ── */}
      {activeMod ? (
        <div className="vcc-module">
          {activeSubItem === 'users'    && <UserManagement user={user} />}
          {activeSubItem === 'database' && <DatabaseManager />}
          {activeSubItem === 'activity' && <ActivityTracker />}
          {activeSubItem === 'logs'     && <SystemLogs />}
        </div>
      ) : (
        <>
          {/* Module Cards — fallback if no sub-item selected */}
          <div className="vcc-module-grid">
            {MODULES.map((mod, i) => (
              <button
                key={mod.key}
                className="vcc-card"
                onClick={() => setActiveSubItem && setActiveSubItem(mod.key)}
                style={{ '--card-color': mod.color, animationDelay: `${i * 0.08}s` }}
              >
                <div className="vcc-card-accent" />
                <div className="vcc-card-icon-wrap">
                  <span className="vcc-card-icon">{mod.icon}</span>
                </div>
                <div className="vcc-card-body">
                  <h3 className="vcc-card-title">{mod.label}</h3>
                  <p className="vcc-card-desc">{mod.desc}</p>
                </div>
                <div className="vcc-card-arrow">→</div>
              </button>
            ))}
          </div>

          <div className="vcc-footer-note">
            <span>🔐</span>
            <span>All actions performed in the Control Center are logged and auditable.</span>
          </div>
        </>
      )}
    </div>
  );
};

export default ControlCenter;