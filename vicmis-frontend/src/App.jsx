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
import SuperAdminDashboard from './components/Dashboard/SuperAdmin/SuperAdminDashboard.jsx'; 
import ManagerDashboard from './components/Dashboard/ManagerDashboard/ManagerDashboard.jsx'; // 👈 Imported Manager
import Customer from './components/Modules/customer/Customer.jsx';
import Inventory from './components/Modules/Inventory/Inventory.jsx';
import Login from './components/Login.jsx';
import ResetPassword from './components/ResetPassword.jsx'; 
import AdminDashboard from './components/Dashboard/Admin/AdminDashboard.jsx';
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
    
    // 1. Settings is strictly for Super Admin ONLY
    if (moduleName === 'Setting' && user.role !== 'super_admin') return false; 

    // 👇 2. UPDATED (Line 38): Give Managers the master key
    if (['super_admin', 'admin', 'manager'].includes(user.role)) return true; 

    // 3. Normal employees rely on the backend permissions array
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

  // --- DASHBOARD ROUTER ---
  const renderDashboard = () => {
    const dept = user.department?.toLowerCase();
    const isManagement = ['admin', 'super_admin', 'manager', 'dept_head'].includes(user.role);

    const notifications = {
      inventoryCount: projects?.filter(p => p.activeStage === 2).length || 0,
      accountingCount: projects?.filter(p => p.activeStage === 4).length || 0
    };

   if (user.role === 'super_admin') {
         return <SuperAdminDashboard user={user} />;
       }
       
   if (user.role === 'admin') {
         return <AdminDashboard user={user} />;
  } 
       // 👇 NEW (Line 71): Route the manager to their new dashboard
   if (user.role === 'manager') {
         return <ManagerDashboard user={user} />;
    }

    if (dept === 'accounting' || dept === 'procurement' || dept === 'accounting/procurement') {
      return <AccountingDashboard user={user} notifications={notifications} />;
    }
    
    if (dept === 'engineering' || user.name?.toLowerCase().includes('engr')) {
      return <EngineeringDashboard user={user} />;
    }
    
    if (dept === 'sales') {
      return <SalesDashboard user={user} projects={projects} />;
    }
    
    if (dept === 'inventory' || dept === 'logistics') {
      return isManagement 
        ? <InventoryDashboard user={user} notifications={notifications} />
        : <InventoryEmployeeDashboard user={user} />;
    }

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
    
    if (!checkAccess(activeItem)) {
      return <div className="p-20 text-red-500">Access Restricted: Insufficient Permissions</div>;
    }

    switch (activeItem) {
      case 'Project': 
        return <Project projects={projects} setProjects={setProjects} user={user} />;
      case 'Customer': 
        return <Customer user={user} onProjectCreated={(p) => { setProjects([...projects, p]); setActiveItem('Project'); }} />;
      case 'Inventory': 
        return <Inventory user={user} />;
      case 'Setting': 
        return <Settings user={user} />;
      default: 
        return <div className="p-20">Module Under Development</div>;
    }
  };

  // URL ROUTING CHECK FOR RESET PASSWORD
  const isResetPage = window.location.pathname === '/reset-password';
  if (isResetPage) {
    return (
      <div className="app-container bg-gray-50">
        <Toaster position="top-right" />
        <ResetPassword />
      </div>
    );
  }

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