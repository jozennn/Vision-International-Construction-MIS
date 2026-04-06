import React, { useState, useCallback, useEffect } from 'react';
import api, { initCsrf } from '@/api/axios';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Project from './components/Modules/project/Project.jsx';
import ControlCenter from './components/Modules/System/ControlCenter.jsx';
import EngineeringDashboard from './components/Dashboard/Engineering/EngineeringDashboard.jsx';
import SalesDashboard from './components/Dashboard/Sales/SalesDashboard.jsx';
import InventoryDashboard from './components/Dashboard/Inventory/InventoryDashboard.jsx';
import InventoryEmployeeDashboard from './components/Dashboard/Inventory/InventoryEmployeeDashboard.jsx';
import AccountingDashboard from './components/Dashboard/Accounting/AccountingDashboard.jsx';
import SuperAdminDashboard from './components/Dashboard/SuperAdmin/SuperAdminDashboard.jsx';
import ManagerDashboard from './components/Dashboard/ManagerDashboard/ManagerDashboard.jsx';
import Customer from './components/Modules/customer/Customer.jsx';
import Inventory from './components/Modules/Inventory/Inventory.jsx';
import Login from './components/Login.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import AdminDashboard from './components/Dashboard/Admin/AdminDashboard.jsx';
import './App.css';
import { Toaster } from 'react-hot-toast';

// ── Helper: read a cookie value by name ──────────────────────────────────────
// Used to check the has_session indicator before firing any API calls.
// has_session is NOT HttpOnly so this is safe to read from JS.
const getCookie = (name) =>
  document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1] ?? null;

const App = () => {
  // null      = not yet checked (show loading spinner)
  // null+ready = checked, not authenticated (show login)
  // {...}     = checked, authenticated (show app)
  const [user, setUser]                   = useState(null);
  const [authReady, setAuthReady]         = useState(false);

  const [activeItem, setActiveItem]       = useState('Dashboard');
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [projects, setProjects]           = useState([]);

  // ── Session restore on every page load / refresh ──────────────────────
  // Boot flow:
  //
  //   1. Read the has_session cookie (readable by JS, set by the server on
  //      login/refresh, cleared on logout). Contains no sensitive data —
  //      just a '1' flag that tells us whether to bother calling the API.
  //
  //   2. If has_session is absent → no session or refresh token exists.
  //      Skip all API calls and show the login screen immediately.
  //      Zero 401s fired, zero console noise.
  //
  //   3. If has_session is present → a session or refresh token cookie exists.
  //      Call GET /api/user. The axios interceptor handles the rest:
  //        a. 200 → session alive, set user state.
  //        b. 401 → interceptor calls POST /api/refresh automatically,
  //                 then replays GET /api/user. If refresh succeeds, user
  //                 is restored silently. If refresh also fails, interceptor
  //                 redirects to /login.
  useEffect(() => {
    const restoreSession = async () => {
      // Step 1 — check indicator cookie before touching the network
      const hasSession = getCookie('has_session');

      if (!hasSession) {
        // No session exists — skip API calls entirely, go straight to login
        setUser(null);
        setAuthReady(true);
        return;
      }

      // Step 2 — session or refresh token may exist, verify with the server
      try {
        await initCsrf();
        const res = await api.get('/user');
        setUser(res.data);
      } catch {
        // Interceptor already attempted /refresh. If it also failed, the
        // interceptor clears the stale has_session cookie server-side and
        // redirects to /login. Nothing extra needed here.
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  // ── Access control ────────────────────────────────────────────────────
  const checkAccess = useCallback((moduleName) => {
    if (!user) return false;
    if (moduleName === 'Setting' && user.role !== 'super_admin') return false;
    if (['super_admin', 'admin', 'manager'].includes(user.role)) return true;
    return user.permissions?.includes(moduleName) || false;
  }, [user]);

  // ── Login success ─────────────────────────────────────────────────────
  // User data comes directly from the /verify-2fa response body.
  // The server sets has_session, laravel_session, and optionally
  // refresh_token cookies — nothing is stored in JS storage.
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveItem('Dashboard');
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      // Server invalidates session + revokes refresh token +
      // expires both refresh_token and has_session cookies
      await api.post('/logout');
    } catch {
      // Even if the backend call fails, clear local state
    } finally {
      setUser(null);
      setActiveItem('Dashboard');
      setActiveSubItem(null);
    }
  };

  // ── Dashboard router ──────────────────────────────────────────────────
  const renderDashboard = () => {
    const dept         = user.department?.toLowerCase();
    const isManagement = ['admin', 'super_admin', 'manager', 'dept_head'].includes(user.role);

    const notifications = {
      inventoryCount:  projects?.filter(p => p.activeStage === 2).length || 0,
      accountingCount: projects?.filter(p => p.activeStage === 4).length || 0,
    };

    if (user.role === 'super_admin') return <SuperAdminDashboard user={user} />;
    if (user.role === 'admin')       return <AdminDashboard user={user} />;
    if (user.role === 'manager')     return <ManagerDashboard user={user} />;

    if (dept === 'accounting' || dept === 'procurement' || dept === 'accounting/procurement')
      return <AccountingDashboard user={user} notifications={notifications} />;

    if (dept === 'engineering' || user.name?.toLowerCase().includes('engr'))
      return <EngineeringDashboard user={user} />;

    if (dept === 'sales')
      return <SalesDashboard user={user} projects={projects} />;

    if (dept === 'inventory' || dept === 'logistics')
      return isManagement
        ? <InventoryDashboard user={user} notifications={notifications} />
        : <InventoryEmployeeDashboard user={user} />;

    return (
      <div className="p-20 text-center bg-white rounded-lg shadow m-6">
        <h2 className="text-xl font-semibold text-gray-800">VISION System Access</h2>
        <p className="text-gray-500 mt-2">Logged in as: {user.name}</p>
        <p className="text-sm text-gray-400 italic">{user.department} | {user.role}</p>
      </div>
    );
  };

  // ── Module router ─────────────────────────────────────────────────────
  const renderContent = () => {
    if (!user) return null;
    if (activeItem === 'Dashboard') return renderDashboard();

    if (!checkAccess(activeItem))
      return <div className="p-20 text-red-500">Access Restricted: Insufficient Permissions</div>;

    switch (activeItem) {
      case 'Project':
        return <Project projects={projects} setProjects={setProjects} user={user} />;
      case 'Customer':
        return (
          <Customer
            user={user}
            onProjectCreated={(p) => {
              setProjects([...projects, p]);
              setActiveItem('Project');
            }}
          />
        );
      case 'Inventory':
        return (
          <Inventory
            user={user}
            activeSubItem={activeSubItem}
            setActiveSubItem={setActiveSubItem}
          />
        );
      case 'Setting':
        return (
          <ControlCenter
            user={user}
            activeSubItem={activeSubItem}
            setActiveSubItem={setActiveSubItem}
          />
        );
      default:
        return <div className="p-20">Module Under Development</div>;
    }
  };

  // ── Reset password page ───────────────────────────────────────────────
  if (window.location.pathname === '/reset-password') {
    return (
      <div className="app-container bg-gray-50">
        <Toaster position="top-right" />
        <ResetPassword />
      </div>
    );
  }

  // ── Loading spinner ───────────────────────────────────────────────────
  // Shown while verifying auth state on page load.
  // Only appears when has_session is present and we're waiting on /api/user.
  // When has_session is absent, authReady is set immediately with no spinner.
  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
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
          error:   { style: { borderLeft: '5px solid #F56565' } },
        }}
      />

      <Sidebar
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        activeSubItem={activeSubItem}
        setActiveSubItem={setActiveSubItem}
        checkAccess={checkAccess}
      />

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