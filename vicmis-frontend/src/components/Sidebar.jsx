import React, { useState } from 'react';
import VicmisLogo from '../assets/logo.png'; 
import api from '../api/axios';
import './Sidebar.css'; // Make sure to import the new CSS file

const Sidebar = ({ activeItem, setActiveItem, checkAccess, setUser }) => {
  const [isOpen, setIsOpen] = useState(false); // State for mobile hamburger menu

  const menuItems = [
    { name: 'Dashboard', icon: '🏠' },
    { name: 'Project', icon: '📝' },
    { name: 'Inventory', icon: '📦' },
    { name: 'Customer', icon: '👤' },
    { name: 'Setting', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/logout'); 
    } catch (error) {
      console.error("Logout API call failed", error);
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
    if (isAllowed) {
      setActiveItem(name);
      setIsOpen(false); // Automatically close the sidebar on mobile after clicking a link
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* --- Hamburger Button (Hidden when sidebar is open) --- */}
      {!isOpen && (
        <button className="hamburger-btn" onClick={toggleSidebar}>
          ☰
        </button>
      )}

      {/* --- Overlay (Darkens background on Mobile when open) --- */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* --- Main Sidebar --- */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo-container">
            <img src={VicmisLogo} alt="VICMIS Logo" className="sidebar-logo-img"/>
            <span className="sidebar-logo-text">VICMIS</span>
          </div>
          
          <nav className="sidebar-nav-menu">
            <ul>
              {menuItems.map((item) => {
                const isAllowed = item.name === 'Dashboard' ? true : (checkAccess ? checkAccess(item.name) : true);
                
                return (
                  <li
                    key={item.name}
                    className={`sidebar-nav-item ${item.name === activeItem ? 'active' : ''} ${!isAllowed ? 'disabled' : ''}`}
                    onClick={() => handleItemClick(item.name, isAllowed)}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-item-name">{item.name}</span>
                    {!isAllowed && <span className="sidebar-lock-icon">🔒</span>}
                  </li>
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