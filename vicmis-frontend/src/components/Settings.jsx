import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './Settings.css'; 

const Settings = ({ user }) => {
  const [currentView, setCurrentView] = useState('menu'); 
  const [users, setUsers] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]); 
  const [activities, setActivities] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [showPassword, setShowPassword] = useState(false);

  // ─── ACTIVITY FILTER STATES ───────────────────────────────────────────
  const [activitySearch, setActivitySearch] = useState('');
  const [activityModule, setActivityModule] = useState('All');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales_employee',
    department: 'Sales',
  });

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/system-logs');
      setErrorLogs(res.data.logs);
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/activities');
      setActivities(res.data);
    } catch (err) {
      console.error("Fetch activities error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && currentView === 'users') fetchUsers();
    if (isSuperAdmin && currentView === 'logs') fetchLogs();
    if (isSuperAdmin && currentView === 'activity') fetchActivities();
  }, [isSuperAdmin, currentView]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '', role: 'sales_employee', department: 'Sales' });
    setIsModalOpen(true);
  };

  const openEditModal = (userToEdit) => {
    setEditingUserId(userToEdit.id);
    setShowPassword(false);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '', 
      role: userToEdit.role,
      department: userToEdit.department,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const res = await api.put(`/admin/users/${editingUserId}`, formData);
        setUsers(prev => prev.map(u => (u.id === editingUserId ? res.data.user : u)));
        alert("User account updated successfully!");
      } else {
        const res = await api.post('/admin/users', formData);
        setUsers(prev => [...prev, res.data.user]);
        alert("User account created successfully!");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save user error:", err);
      alert("Failed to save user. Email might already exist.");
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (id === user.id) {
      alert("You cannot delete your own account!");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete ${name}'s account?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      alert("Account deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete user.");
    }
  };

  const groupedUsers = users.reduce((acc, current_user) => {
    const dept = current_user.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(current_user);
    return acc;
  }, {});

  const uniqueModules = ['All', ...new Set(activities.map(a => a.module))];

  const filteredActivities = activities.filter(act => {
    const matchesSearch = 
      act.user_name.toLowerCase().includes(activitySearch.toLowerCase()) || 
      act.description.toLowerCase().includes(activitySearch.toLowerCase());
    const matchesModule = activityModule === 'All' || act.module === activityModule;
    return matchesSearch && matchesModule;
  });

  if (!isSuperAdmin) {
    return (
      <div className="customer-container">
        <div className="no-leads-container">
          <div className="no-leads-icon">🔒</div>
          <h3>Access Denied</h3>
          <p>Only the Super Admin has access to the System Settings.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MENU
  // ==========================================
  if (currentView === 'menu') {
    return (
      <div className="customer-container">
        <div className="customer-header"><h1>System Settings</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
          
          <div className="lead-card" onClick={() => setCurrentView('users')} style={{ cursor: 'pointer', textAlign: 'center', padding: '30px 20px', transition: 'transform 0.2s' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👥</div>
            <h3 style={{ color: '#221F1F', margin: '10px 0 5px 0' }}>User Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage employee accounts, roles, departments, and system access.</p>
          </div>
          
          <div className="lead-card" onClick={() => setCurrentView('logs')} style={{ cursor: 'pointer', textAlign: 'center', padding: '30px 20px', transition: 'transform 0.2s' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ color: '#221F1F', margin: '10px 0 5px 0' }}>System Error Logs</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>View live backend errors, API crashes, and system diagnostics.</p>
          </div>

          <div className="lead-card" onClick={() => setCurrentView('activity')} style={{ cursor: 'pointer', textAlign: 'center', padding: '30px 20px', transition: 'transform 0.2s' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🕒</div>
            <h3 style={{ color: '#221F1F', margin: '10px 0 5px 0' }}>Activity Tracker</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Chronological timeline of system actions, updates, and user activity.</p>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACTIVITY TRACKER
  // ==========================================
  if (currentView === 'activity') {
    return (
      <div className="customer-container">
        <div className="customer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn-cancel" onClick={() => setCurrentView('menu')} style={{ padding: '8px 15px' }}>← Back</button>
            <h1>Activity Tracker</h1>
          </div>
          <button className="btn-add-lead" onClick={fetchActivities} style={{ backgroundColor: '#497B97' }}>🔄 Refresh</button>
        </div>
        
        {isLoading ? (
          <div className="spinner-container"><div className="loading-circle"></div></div>
        ) : (
          <div className="activity-container-card">
            
            {/* ─── FILTER BAR ────────────────────────────────────────────────── */}
            <div className="activity-filter-bar">
              <input 
                type="text" 
                placeholder="Search user or action (e.g., SM Megamall)..." 
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="activity-search-input"
              />
              <select 
                value={activityModule}
                onChange={(e) => setActivityModule(e.target.value)}
                className="activity-module-select"
              >
                {uniqueModules.map(m => (
                  <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>
                ))}
              </select>
            </div>

            {/* ─── RESPONSIVE TABLE ──────────────────────────────────────────── */}
            <div className="activity-table-wrapper">
              {filteredActivities.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                  <p>{activities.length === 0 ? 'No system activity recorded yet.' : 'No activity matches your filters.'}</p>
                </div>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>User</th>
                      <th>Module</th>
                      <th>Action Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((act) => (
                      <tr key={act.id}>
                        <td data-label="Date & Time">
                          {new Date(act.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td data-label="User" style={{ fontWeight: 'bold', color: '#1e293b' }}>
                          {act.user_name}
                        </td>
                        <td data-label="Module">
                          <span className="activity-module-badge">{act.module}</span>
                        </td>
                        <td data-label="Action Description" style={{ color: '#334155' }}>
                          {act.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: ERROR LOGS TERMINAL
  // ==========================================
  if (currentView === 'logs') {
    return (
      <div className="customer-container">
        <div className="customer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn-cancel" onClick={() => setCurrentView('menu')} style={{ padding: '8px 15px' }}>← Back</button>
            <h1>System Diagnostics</h1>
          </div>
          <button className="btn-add-lead" onClick={fetchLogs} style={{ backgroundColor: '#497B97' }}>🔄 Refresh Logs</button>
        </div>
        {isLoading ? (
          <div className="spinner-container"><div className="loading-circle"></div></div>
        ) : (
          <div style={{ backgroundColor: '#1e1e1e', color: '#4af626', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', height: '65vh', overflowY: 'auto', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)', fontSize: '0.85rem', lineHeight: '1.4' }}>
            {errorLogs.length === 0 ? (
              <div>No error logs found. System is running perfectly!</div>
            ) : (
              errorLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '4px', borderBottom: '1px solid #333', paddingBottom: '4px', wordWrap: 'break-word', color: log.includes('local.ERROR') || log.includes('Stack trace:') ? '#ff5555' : '#4af626' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: USERS LIST
  // ==========================================
  return (
    <div className="customer-container">
      <div className="customer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-cancel" onClick={() => setCurrentView('menu')} style={{ padding: '8px 15px' }}>← Back</button>
          <h1>User Management</h1>
        </div>
        <button className="btn-add-lead" onClick={openCreateModal}>+ Create New Account</button>
      </div>

      {isLoading ? (
        <div className="spinner-container"><div className="loading-circle"></div></div>
      ) : (
        <div className="departments-list">
          {Object.keys(groupedUsers).map(department => (
            <div key={department} className="department-card">
              <div className="department-header">{department} Department</div>
              <div className="department-table-container">
                <table className="users-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th className="action-column">Actions</th></tr>
                  </thead>
                  <tbody>
                    {groupedUsers[department].map(emp => (
                      <tr key={emp.id}>
                        <td className="user-name">{emp.name}</td>
                        <td className="user-email">{emp.email}</td>
                        <td><span className="status-badge project-created">{emp.role.replace('_', ' ')}</span></td>
                        <td className="action-column">
                          <button className="btn-delete-small" style={{ color: '#497B97', borderColor: '#e2e8f0', marginRight: '10px' }} onClick={() => openEditModal(emp)}>Edit</button>
                          {emp.id !== user.id && (<button className="btn-delete-small" onClick={() => handleDeleteUser(emp.id, emp.name)}>Delete</button>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD/EDIT USER MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content compact-modal">
            <div className="modal-header-compact">
              <h2>{editingUserId ? 'Edit Account' : 'Create New Account'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="lead-form-compact">
              <div className="compact-grid">
                <div className="form-group-compact full-width">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group-compact full-width">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                
                <div className="form-group-compact full-width">
                  <label>Password {editingUserId && <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Leave blank to keep current)</span>}</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      required={!editingUserId} 
                      minLength="6" 
                      style={{ paddingRight: '45px' }}
                    />
                    <button type="button" className="password-toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                <div className="form-group-compact">
                  <label>Department</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} required>
                    <option value="IT">IT</option>
                    <option value="Management">Management</option>
                    <option value="Sales">Sales</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Procurement">Procurement</option>
                    <option value="HR">Human Resources</option>
                  </select>
                </div>
                <div className="form-group-compact">
                  <label>Role / Access Level</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="dept_head">Department Head</option>
                    <option value="sales_employee">Sales Employee</option>
                    <option value="engineering_employee">Engineering Employee</option>
                    <option value="logistics_employee">Logistics Employee</option>
                    <option value="accounting_employee">Procurement Employee</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer-compact" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save-lead">{editingUserId ? 'Update User' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;