import React, { useState, useEffect } from 'react';
import VicmisLogo from '../assets/logo.png';
import api from '../api/axios';
import './Sidebar.css';

const Sidebar = ({ activeItem, setActiveItem, checkAccess, setUser, activeSubItem, setActiveSubItem, user }) => {
  const [isOpen, setIsOpen]               = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [reportsOpen, setReportsOpen]     = useState(false);

  useEffect(() => {
    setInventoryOpen(activeItem === 'Inventory');
    setSettingsOpen(activeItem === 'Setting');
    setReportsOpen(activeItem === 'Reports');
  }, [activeItem]);

  const inventorySubItems = [
    { id: 'Construction Materials', label: 'Construction Materials' },
    { id: 'Incoming Shipment',      label: 'Incoming Shipment'      },
    { id: 'Delivery Materials',     label: 'Delivery Materials'     },
  ];

  // ── Reports sub-items filtered by role / department ──────────────────────
  const reportsSubItems = (() => {
    const role = user?.role ?? '';
    const dept = (user?.department ?? '').toLowerCase();

    const all = [
      { id: 'inventory-reports', label: '📦 Inventory Reports' },
      { id: 'project-reports',   label: '📝 Project Reports'   },
      { id: 'customer-reports',  label: '👤 Customer Reports'  },
    ];

    // Privileged roles see everything
    if (['super_admin', 'admin', 'manager'].includes(role)) return all;

    const allowed = new Set();

    // Sales → Customer Reports
    if (dept.includes('sales')) allowed.add('customer-reports');

    // Engineering → Project Reports
    if (dept.includes('engineering')) allowed.add('project-reports');

    // Inventory / Logistics → Inventory Reports
    if (dept.includes('inventory') || dept.includes('logistics')) allowed.add('inventory-reports');

    // Accounting / Procurement → Inventory + Project Reports
    if (dept.includes('accounting') || dept.includes('procurement')) {
      allowed.add('inventory-reports');
      allowed.add('project-reports');
    }

    // dept_head gets their department's reports + Project Reports
    if (role === 'dept_head') {
      allowed.add('project-reports');
      // They already have their dept-specific ones from above
    }

    return all.filter(s => allowed.has(s.id));
  })();

  const settingsSubItems = [
    { id: 'users',    label: 'User Management'    },
    { id: 'database', label: 'Database Manager'   },
    { id: 'activity', label: 'Activity Tracker'   },
    { id: 'logs',     label: 'System Diagnostics' },
  ];

  const menuItems = [
    { name: 'Dashboard', icon: '🏠' },
    { name: 'Project',   icon: '📝' },
    { name: 'Inventory', icon: '📦', hasDropdown: true },
    { name: 'Customer',  icon: '👤' },
    { name: 'Reports',   icon: '📊', hasDropdown: true },
    { name: 'Setting',   icon: '⚙️', hasDropdown: true },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout API call failed', error);
    } finally {
      sessionStorage.clear();
      if (setUser) {
        setUser(null);
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleItemClick = (name, isAllowed) => {
    if (!isAllowed) return;

    if (name === 'Inventory') {
      setActiveItem('Inventory');
      setInventoryOpen(true);
      setSettingsOpen(false);
      setReportsOpen(false);
      if (!activeSubItem && setActiveSubItem) setActiveSubItem('Construction Materials');
      setIsOpen(false);
      return;
    }

    if (name === 'Reports') {
      setActiveItem('Reports');
      setReportsOpen(true);
      setInventoryOpen(false);
      setSettingsOpen(false);
      // Default to first allowed sub-item for this user
      if (setActiveSubItem) setActiveSubItem(reportsSubItems[0]?.id ?? 'inventory-reports');
      setIsOpen(false);
      return;
    }

    if (name === 'Setting') {
      setActiveItem('Setting');
      setSettingsOpen(true);
      setInventoryOpen(false);
      setReportsOpen(false);
      if (setActiveSubItem) setActiveSubItem('users');
      setIsOpen(false);
      return;
    }

    setActiveItem(name);
    setInventoryOpen(false);
    setSettingsOpen(false);
    setReportsOpen(false);
    if (setActiveSubItem) setActiveSubItem(null);
    setIsOpen(false);
  };

  const handleInventorySubItemClick = (subId) => {
    setActiveItem('Inventory');
    if (setActiveSubItem) setActiveSubItem(subId);
    setIsOpen(false);
  };

  const handleReportsSubItemClick = (subId) => {
    setActiveItem('Reports');
    if (setActiveSubItem) setActiveSubItem(subId);
    setIsOpen(false);
  };

  const handleSettingsSubItemClick = (subId) => {
    setActiveItem('Setting');
    if (setActiveSubItem) setActiveSubItem(subId);
    setIsOpen(false);
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {!isOpen && (
        <button className="hamburger-btn" onClick={toggleSidebar}>☰</button>
      )}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo-container">
            <img src={VicmisLogo} alt="VICMIS Logo" className="sidebar-logo-img" />
            <span className="sidebar-logo-text">VICMIS</span>
          </div>

          <nav className="sidebar-nav-menu">
            <ul>
              {menuItems.map((item) => {
                const isAllowed = item.name === 'Dashboard'
                  ? true
                  : (checkAccess ? checkAccess(item.name) : true);

                const isActive    = item.name === activeItem;
                const isInventory = item.name === 'Inventory';
                const isSetting   = item.name === 'Setting';
                const isReports   = item.name === 'Reports';
                const chevronOpen = isInventory
                  ? inventoryOpen
                  : isSetting
                    ? settingsOpen
                    : isReports
                      ? reportsOpen
                      : false;

                return (
                  <React.Fragment key={item.name}>
                    <li
                      className={`sidebar-nav-item ${isActive ? 'active' : ''} ${!isAllowed ? 'disabled' : ''}`}
                      onClick={() => handleItemClick(item.name, isAllowed)}
                    >
                      <span className="sidebar-icon">{item.icon}</span>
                      <span className="sidebar-item-name">{item.name}</span>
                      {!isAllowed && <span className="sidebar-lock-icon">🔒</span>}
                      {item.hasDropdown && isAllowed && (
                        <span className={`sidebar-chevron ${chevronOpen ? 'open' : ''}`}>›</span>
                      )}
                    </li>

                    {/* Inventory sub-menu */}
                    {isInventory && inventoryOpen && isAllowed && (
                      <ul className="sidebar-submenu">
                        {inventorySubItems.map((sub) => (
                          <li
                            key={sub.id}
                            className={`sidebar-submenu-item ${activeSubItem === sub.id ? 'active' : ''}`}
                            onClick={() => handleInventorySubItemClick(sub.id)}
                          >
                            {sub.label}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Reports sub-menu — filtered by role/dept */}
                    {isReports && reportsOpen && isAllowed && (
                      <ul className="sidebar-submenu">
                        {reportsSubItems.map((sub) => (
                          <li
                            key={sub.id}
                            className={`sidebar-submenu-item ${activeSubItem === sub.id ? 'active' : ''}`}
                            onClick={() => handleReportsSubItemClick(sub.id)}
                          >
                            {sub.label}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Settings sub-menu */}
                    {isSetting && settingsOpen && isAllowed && (
                      <ul className="sidebar-submenu">
                        {settingsSubItems.map((sub) => (
                          <li
                            key={sub.id}
                            className={`sidebar-submenu-item ${activeSubItem === sub.id ? 'active' : ''}`}
                            onClick={() => handleSettingsSubItemClick(sub.id)}
                          >
                            {sub.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </React.Fragment>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn-logout" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;