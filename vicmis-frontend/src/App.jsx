import React, { useState, useCallback, useEffect } from 'react';
import api, { initCsrf, setSuppressRedirect } from '@/api/axios';
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
const getCookie = (name) =>
  document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1] ?? null;

const App = () => {
  // null      = not yet checked (show loading spinner)
  // false     = checked, not authenticated (show login)
  // {...}     = checked, authenticated (show app)
  //
  // KEY CHANGE: We use `false` (not null) to represent "logged out after
  // checking" so we can distinguish it from `null` = "not yet checked".
  const [user, setUser]                   = useState(null);
  const [authReady, setAuthReady]         = useState(false);

  const [activeItem, setActiveItem]       = useState('Dashboard');
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [projects, setProjects]           = useState([]);

  // ── Session restore on every page load / refresh ──────────────────────────
  //
  // Boot flow (revised):
  //
  //   1. Suppress the axios interceptor's auto-redirect so it doesn't race
  //      ahead and send the user to /login during our own boot sequence.
  //
  //   2. Always init CSRF first (required for POST /refresh to work).
  //
  //   3. Try GET /api/user — if the Laravel session is still alive, this
  //      returns the user immediately. Done.
  //
  //   4. If that 401s, try POST /api/refresh regardless of has_session.
  //      WHY: has_session is a same-site Strict cookie. Browsers sometimes
  //      don't send it on the very first navigation request after a tab
  //      restore, making getCookie() return null even when the refresh_token
  //      HttpOnly cookie is perfectly valid. Skipping refresh based on
  //      has_session was the root cause of the kick-on-refresh bug.
  //
  //   5. If refresh succeeds, set user from the response. Done.
  //
  //   6. If both fail, user stays null → login screen shown.
  //
  //   7. Re-enable interceptor redirects in the finally block.
  //
  useEffect(() => {
    const restoreSession = async () => {
      // Step 1 — suppress interceptor redirects during boot
      setSuppressRedirect(true);

      try {
        // Step 2 — always init CSRF before any mutating request
        await initCsrf();

        try {
          // Step 3 — try existing Laravel session first (cheapest check)
          const res = await api.get('/user');
          setUser(res.data);
          return; // session alive, we're done
        } catch {
          // Session expired or missing — fall through to refresh attempt
        }

        try {
          // Step 4 — attempt silent token refresh
          // We do NOT check has_session here. The HttpOnly refresh_token
          // cookie is sent automatically by the browser regardless of whether
          // has_session is readable via JS. This is the key fix.
          await initCsrf(); // re-fetch CSRF — may have expired with the session
          const res = await api.post('/refresh');
          setUser(res.data.user);
        } catch {
          // Both session and refresh token exhausted — show login
          setUser(null);
        }

      } catch {
        // initCsrf() itself failed (network down, server unreachable)
        setUser(null);
      } finally {
        // Step 7 — always re-enable redirects and unblock the UI
        setSuppressRedirect(false);
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  // ── Access control ────────────────────────────────────────────────────────
  const checkAccess = useCallback((moduleName) => {
    if (!user) return false;
    if (moduleName === 'Setting' && user.role !== 'super_admin') return false;
    if (['super_admin', 'admin', 'manager'].includes(user.role)) return true;
    return user.permissions?.includes(moduleName) || false;
  }, [user]);

  // ── Login success ──────────────────────────────────────────────────────────
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveItem('Dashboard');
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Even if the backend call fails, clear local state
    } finally {
      setUser(null);
      setActiveItem('Dashboard');
      setActiveSubItem(null);
    }
  };

  // ── Dashboard router ───────────────────────────────────────────────────────
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

  // ── Module router ──────────────────────────────────────────────────────────
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

  // ── Reset password page ────────────────────────────────────────────────────
  if (window.location.pathname === '/reset-password') {
    return (
      <div className="app-container bg-gray-50">
        <Toaster position="top-right" />
        <ResetPassword />
      </div>
    );
  }

  // ── Loading spinner ────────────────────────────────────────────────────────
  // Shown while verifying auth state on page load.
  // Now always shown on refresh (no has_session skip) — but only for the
  // brief moment it takes for /api/user or /api/refresh to respond.
  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!user) return <Login onEnterSystem={handleLoginSuccess} />;

  // ── Main app ───────────────────────────────────────────────────────────────
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