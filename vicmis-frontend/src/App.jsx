import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Project from './components/Modules/project/Project.jsx';
import Settings from './components/Settings.jsx';
import EngineeringDashboard from './components/Dashboard/Engineering/EngineeringDashboard.jsx'; 
import SalesDashboard from './components/Dashboard/Sales/SalesDashboard.jsx';
import InventoryDashboard from './components/Dashboard/Inventory/InventoryDashboard.jsx';
import InventoryEmployeeDashboard from './components/Dashboard/Inventory/InventoryEmployeeDashboard.jsx';
import AccountingDashboard from './components/Dashboard/Accounting/AccountingDashboard.jsx';
import Customer from './components/Modules/customer/Customer.jsx';
import Inventory from './components/Modules/Inventory/Inventory.jsx';
import Login from './components/Login.jsx'
import './App.css'; 
import { Toaster } from 'react-hot-toast';

const App = () => {
  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    return (savedUser && token) ? JSON.parse(savedUser) : null;
  });
  
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [projects, setProjects] = useState([]);

  // --- ACCESS CONTROL ---
  const checkAccess = useCallback((moduleName) => {
    if (!user) return false;
    if (user.role === 'admin') return true; 
    // Checks if module name exists in permissions array or if user is management
    return user.permissions?.includes(moduleName) || false;
  }, [user]);

  const handleLoginSuccess = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setActiveItem('Dashboard');
  };

  const handleLogout = () => {
    sessionStorage.clear(); 
    setUser(null);
    setActiveItem('Dashboard');
  };

  // --- DASHBOARD ROUTER (Optimized for Seeder Roles) ---
  const renderDashboard = () => {
    const dept = user.department?.toLowerCase();
    const isManagement = ['admin', 'manager', 'dept_head'].includes(user.role);

    // Contextual counts for specific departments
    const notifications = {
      inventoryCount: projects?.filter(p => p.activeStage === 2).length || 0,
      accountingCount: projects?.filter(p => p.activeStage === 4).length || 0
    };

    // 1. Accounting & Procurement
    if (dept === 'accounting' || dept === 'procurement' || dept === 'accounting/procurement') {
      return <AccountingDashboard user={user} notifications={notifications} />;
    }
    
    // 2. Engineering
    if (dept === 'engineering' || user.name?.toLowerCase().includes('engr')) {
      return <EngineeringDashboard user={user} />;
    }
    
    // 3. Sales
    if (dept === 'sales') {
      return <SalesDashboard user={user} projects={projects} />;
    }
    
    // 4. Logistics & Inventory
    if (dept === 'inventory' || dept === 'logistics') {
      return isManagement 
        ? <InventoryDashboard user={user} notifications={notifications} />
        : <InventoryEmployeeDashboard user={user} />;
    }

    // Default Welcome for IT/Admin or undefined roles
    return (
      <div className="p-20 text-center bg-white rounded-lg shadow m-6">
        <h2 className="text-xl font-semibold text-gray-800">VISION System Access</h2>
        <p className="text-gray-500 mt-2">Logged in as: {user.name}</p>
        <p className="text-sm text-gray-400 italic">{user.department} | {user.role}</p>
      </div>
    );
  };

  // --- MODULE ROUTER ---
  const renderContent = () => {
    if (!user) return null;
    if (activeItem === 'Dashboard') return renderDashboard();
    
    // Security Check
    if (!checkAccess(activeItem)) {
      return <div className="p-20 text-red-500">Access Restricted: Insufficient Permissions</div>;
    }

    switch (activeItem) {
      case 'Project': 
        return <Project projects={projects} setProjects={setProjects} />;
      case 'Customer': 
        return <Customer user={user} onProjectCreated={(p) => { setProjects([...projects, p]); setActiveItem('Project'); }} />;
      case 'Inventory': 
        return <Inventory />;
      case 'Setting': 
        return <Settings />;
      default: 
        return <div className="p-20">Module Under Development</div>;
    }
  };

  if (!user) return <Login onEnterSystem={handleLoginSuccess} />;

  return (
    <div className="app-container flex h-screen w-full overflow-hidden bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: { background: '#2D3748', color: '#fff', borderRadius: '8px' },
          success: { style: { borderLeft: '5px solid #48BB78' } },
          error: { style: { borderLeft: '5px solid #F56565' } }
        }}
      />

      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} checkAccess={checkAccess} />
      
      <main className="content-area flex-1 h-full overflow-y-auto">
        <Header user={user} onLogout={handleLogout} />
        <div className="main-content-wrapper">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;