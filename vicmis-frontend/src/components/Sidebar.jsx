import React, { useState, useEffect } from 'react';
import VicmisLogo from '../assets/logo.png'; 
import api from '../api/axios';
import './Sidebar.css';

const Sidebar = ({ activeItem, setActiveItem, checkAccess, setUser, activeSubItem, setActiveSubItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);

  useEffect(() => {
    setInventoryOpen(activeItem === 'Inventory');
    setSettingsOpen(activeItem === 'Setting');
  }, [activeItem]);

  const inventorySubItems = [
    { id: 'Construction Materials', label: 'Construction Materials' },
    { id: 'Incoming Shipment',      label: 'Incoming Shipment'      },
    { id: 'Delivery Materials',     label: 'Delivery Materials'     },
  ];

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
      if (!activeSubItem && setActiveSubItem) {
        setActiveSubItem('Construction Materials');
      }
      setIsOpen(false);
      return;
    }

    if (name === 'Setting') {
      setActiveItem('Setting');
      setSettingsOpen(true);
      setInventoryOpen(false);
      if (setActiveSubItem) setActiveSubItem('users');
      setIsOpen(false);
      return;
    }

    setActiveItem(name);
    setInventoryOpen(false);
    setSettingsOpen(false);
    if (setActiveSubItem) setActiveSubItem(null);
    setIsOpen(false);
  };

  const handleInventorySubItemClick = (subId) => {
    setActiveItem('Inventory');
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
            <img src={VicmisLogo} alt="VICMIS Logo" className="sidebar-logo-img"/>
            <span className="sidebar-logo-text">VICMIS</span>
          </div>
          
          <nav className="sidebar-nav-menu">
            <ul>
              {menuItems.map((item) => {
                const isAllowed = item.name === 'Dashboard'
                  ? true
                  : (checkAccess ? checkAccess(item.name) : true);

                const isActive = item.name === activeItem;
                const isInventory = item.name === 'Inventory';
                const isSetting   = item.name === 'Setting';
                const chevronOpen = isInventory ? inventoryOpen : isSetting ? settingsOpen : false;

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
                        <span className={`sidebar-chevron ${chevronOpen ? 'open' : ''}`}>
                          ›
                        </span>
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