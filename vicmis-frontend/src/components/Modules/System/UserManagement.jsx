import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './css/UserManagement.css';

// 1. Define Department to Roles mapping for auto-filtering
const ROLE_MAPPING = {
  'Management': [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'dept_head', label: 'Department Head' }
  ],
  'Sales': [
    { value: 'dept_head', label: 'Department Head' },
    { value: 'sales_employee', label: 'Sales Employee' }
  ],
  'Logistics': [
    { value: 'dept_head', label: 'Department Head' },
    { value: 'logistics_employee', label: 'Logistics Employee' }
  ],
  'Engineering': [
    { value: 'dept_head', label: 'Department Head' },
    { value: 'engineering_employee', label: 'Engineering Employee' }
  ],
  'Procurement': [
    { value: 'dept_head', label: 'Department Head' },
    // Keeping backend value as 'accounting_employee' to avoid breaking DB, but showing as 'Procurement'
    { value: 'accounting_employee', label: 'Procurement Employee' }
  ]
};

const DEPARTMENTS = Object.keys(ROLE_MAPPING);

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All'); // Added Department Filter state
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'sales_employee', department: 'Sales',
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-filter roles when department changes
    if (name === 'department') {
      const availableRoles = ROLE_MAPPING[value] || [];
      const firstRole = availableRoles.length > 0 ? availableRoles[0].value : '';
      setFormData(prev => ({ ...prev, department: value, role: firstRole }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '', role: 'sales_employee', department: 'Sales' });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUserId(u.id);
    setShowPassword(false);
    
    // Fallback in case a legacy user has a department not in our new list
    const currentDept = DEPARTMENTS.includes(u.department) ? u.department : 'Sales';
    
    setFormData({ 
      name: u.name, 
      email: u.email, 
      password: '', 
      role: u.role, 
      department: currentDept 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const res = await api.put(`/admin/users/${editingUserId}`, formData);
        setUsers(prev => prev.map(u => u.id === editingUserId ? res.data.user : u));
        alert('User account updated successfully!');
      } else {
        const res = await api.post('/admin/users', formData);
        setUsers(prev => [...prev, res.data.user]);
        alert('User account created successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save user. Email might already exist.');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (id === user?.id) { alert('You cannot delete your own account!'); return; }
    if (!window.confirm(`Permanently delete ${name}'s account?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  // Filter users based on search query AND department filter
  const filteredUsers = users.filter(u => {
    // 1. Search Logic
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term))
    );

    // 2. Department Filter Logic (including legacy mapping logic)
    let dept = u.department || 'Unassigned';
    if (dept === 'Accounting/Procurement') dept = 'Procurement';
    if (dept === 'IT' || dept === 'HR') dept = 'Legacy/Archived';
    
    const matchesDept = filterDept === 'All' || dept === filterDept;

    return matchesSearch && matchesDept;
  });

  const groupedUsers = filteredUsers.reduce((acc, u) => {
    // If a legacy user has 'Accounting/Procurement', map it to 'Procurement' in the UI
    let dept = u.department || 'Unassigned';
    if (dept === 'Accounting/Procurement') dept = 'Procurement';
    if (dept === 'IT' || dept === 'HR') dept = 'Legacy/Archived'; // Handle legacy records cleanly

    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(u);
    return acc;
  }, {});

  const ROLE_COLORS = {
    super_admin: '#DC2626', manager: '#7C3AED',
    dept_head: '#2563EB', sales_employee: '#059669', engineering_employee: '#0891B2',
    logistics_employee: '#EA580C', accounting_employee: '#6366F1',
  };

  // Helper to get available roles for the currently selected department in the form
  const availableRolesForForm = ROLE_MAPPING[formData.department] || [];

  return (
    <div className="vcc-module">
      <div className="vcc-module-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="vcc-module-title">User Management</h2>
          <p className="vcc-module-subtitle">
            {filteredUsers.length} accounts found across {Object.keys(groupedUsers).length} departments
          </p>
        </div>
        
        {/* Search Bar, Filter & Action Button */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>⚲</span>
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 12px 10px 32px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '220px', fontSize: '0.875rem' }}
            />
          </div>

          <div className="um-filter-wrap">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              
              <option value="Legacy/Archived">Legacy/Archived</option>
            </select>
          </div>

          <button className="vcc-btn-primary" onClick={openCreateModal}>
            <span>+</span> Create Account
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="vcc-loader"><div className="vcc-spinner" /></div>
      ) : Object.keys(groupedUsers).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <p>No users found matching your search and filter criteria.</p>
        </div>
      ) : (
        <div className="um-dept-grid">
          {Object.entries(groupedUsers).map(([dept, members]) => (
            <div key={dept} className="um-dept-card">
              <div className="um-dept-label">
                <span className="um-dept-dot" />
                {dept}
                <span className="um-dept-count">{members.length}</span>
              </div>
              <table className="um-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {members.map(emp => (
                    <tr key={emp.id}>
                      <td data-label="Name" className="um-td-name">{emp.name}</td>
                      <td data-label="Email" className="um-td-email">{emp.email}</td>
                      <td data-label="Role">
                        <span
                          className="um-role-badge"
                          style={{
                            background: `${ROLE_COLORS[emp.role] || '#64748b'}18`,
                            color: ROLE_COLORS[emp.role] || '#64748b',
                            borderColor: `${ROLE_COLORS[emp.role] || '#64748b'}30`,
                          }}
                        >
                          {emp.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td data-label="Actions" className="um-td-actions">
                        <button className="um-btn-edit" onClick={() => openEditModal(emp)}>Edit</button>
                        {emp.id !== user?.id && (
                          <button className="um-btn-delete" onClick={() => handleDeleteUser(emp.id, emp.name)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="um-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-head">
              <h3>{editingUserId ? 'Edit Account' : 'Create New Account'}</h3>
              <button className="um-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="um-form">
              <div className="um-form-row">
                <div className="um-field full">
                  <label>Full Name</label>
                  <input
                    type="text" name="name" value={formData.name}
                    onChange={handleInputChange} required placeholder="Juan dela Cruz"
                  />
                </div>
                <div className="um-field full">
                  <label>Email Address</label>
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleInputChange} required placeholder="juan@vision.com"
                  />
                </div>
                <div className="um-field full">
                  <label>
                    Password{' '}
                    {editingUserId && <span className="um-hint">(leave blank to keep current)</span>}
                  </label>
                  <div className="um-pass-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'} name="password"
                      value={formData.password} onChange={handleInputChange}
                      required={!editingUserId} minLength="6"
                    />
                    <button type="button" className="um-pass-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>
                
                {/* Department Dropdown */}
                <div className="um-field half">
                  <label>Department</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} required>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                {/* Filtered Role Dropdown */}
                <div className="um-field half">
                  <label>Role / Access Level</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    {availableRolesForForm.map(roleOption => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
              <div className="um-modal-foot">
                <button type="button" className="vcc-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="vcc-btn-primary">
                  {editingUserId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;