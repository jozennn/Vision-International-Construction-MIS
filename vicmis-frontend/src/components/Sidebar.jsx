import React from 'react';
import VicmisLogo from '../assets/logo.png'; 
import api from '../api/axios';

const Sidebar = ({ activeItem, setActiveItem, checkAccess, setUser }) => {
  // Only the core modules remain
  const menuItems = [
    { name: 'Dashboard', icon: '🏠' },
    { name: 'Project', icon: '📝' },
    { name: 'Inventory', icon: '📦' },
    { name: 'Customer', icon: '👤' },
    { name: 'Setting', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    try {
      // 1. Invalidate session on the Laravel backend
      await api.post('/logout'); 
    } catch (error) {
      console.error("Logout API call failed", error);
    } finally {
      // 2. Clear SessionStorage (Must match App.js storage type)
      sessionStorage.clear(); 
      
      // 3. Reset UI state to trigger redirect to Login
      if (setUser) {
        setUser(null);
      } else {
        // Fallback: force a reload to the login route
        window.location.href = '/'; 
      }
    }
  };

  return (
    <div className="sidebar h-full flex flex-col justify-between">
      <div className="sidebar-top">
        <div className="logo flex items-center p-4">
          <img src={VicmisLogo} alt="VICMIS Logo" className="sidebar-logo-img w-8 h-8 mr-2"/>
          <span className="font-bold text-xl">VICMIS</span>
        </div>
        
        <nav className="nav-menu">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              // Dashboard is usually accessible to everyone
              const isAllowed = item.name === 'Dashboard' ? true : (checkAccess ? checkAccess(item.name) : true);
              
              return (
                <li
                  key={item.name}
                  className={`nav-item flex items-center p-3 cursor-pointer transition-colors
                    ${item.name === activeItem ? 'active bg-blue-600 text-white' : 'hover:bg-gray-700'} 
                    ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isAllowed && setActiveItem(item.name)}
                >
                  <span className="icon mr-3">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  {!isAllowed && <span className="lock-icon text-xs">🔒</span>}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer p-4 border-t border-gray-700">
        <button 
          className="btn-logout flex items-center w-full p-2 text-red-400 hover:text-red-300 transition-colors" 
          onClick={handleLogout}
        >
          <span className="icon mr-3">🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;