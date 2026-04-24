import React, { useState, useEffect, useMemo } from 'react';
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
  const [filterDept, setFilterDept] = useState('All'); 
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'sales_employee', department: 'Sales', newDepartment: '', newRole: ''
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

  // Compute available departments dynamically
  const dynamicDepartments = useMemo(() => {
    const depts = new Set([...DEPARTMENTS]);
    users.forEach(u => {
      let dept = u.department || 'Unassigned';
      if (dept === 'Accounting/Procurement') dept = 'Procurement';
      if (dept !== 'IT' && dept !== 'HR' && dept !== 'Unassigned' && dept !== 'Legacy/Archived') {
        depts.add(dept);
      }
    });
    return Array.from(depts);
  }, [users]);

  // Compute available roles for the currently selected department dynamically
  const dynamicRolesForForm = useMemo(() => {
    let baseRoles = ROLE_MAPPING[formData.department];
    
    // Fallback for custom departments
    if (!baseRoles || formData.department === 'ADD_NEW') {
      const displayDeptName = formData.department === 'ADD_NEW' && formData.newDepartment 
        ? formData.newDepartment 
        : (formData.department !== 'ADD_NEW' ? formData.department : 'Department');
        
      baseRoles = [
        { value: 'dept_head', label: 'Department Head' },
        { value: 'department_employee', label: `${displayDeptName} Employee` }
      ];
    } else {
      baseRoles = [...baseRoles]; // Clone to avoid mutating constant
    }

    // Add any custom roles that exist in the database for this department
    const existingRolesInDept = new Set(baseRoles.map(r => r.value));
    
    users.forEach(u => {
      if (u.department === formData.department && u.role && !existingRolesInDept.has(u.role)) {
        existingRolesInDept.add(u.role);
        // Format the custom role for display (e.g., "marketing_lead" -> "Marketing Lead")
        const label = u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        baseRoles.push({ value: u.role, label: label });
      }
    });

    return baseRoles;
  }, [formData.department, formData.newDepartment, users]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'department') {
      // Auto-select the first role when department changes, unless it's ADD_NEW
      // We need to look up what the roles WILL BE for this new department
      let availableRoles = ROLE_MAPPING[value];
      if (!availableRoles || value === 'ADD_NEW') {
        availableRoles = [{ value: 'dept_head' }]; // Safe default
      }
      setFormData(prev => ({ ...prev, department: value, role: availableRoles[0].value, newRole: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '', role: 'sales_employee', department: 'Sales', newDepartment: '', newRole: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUserId(u.id);
    setShowPassword(false);
    
    let currentDept = u.department || 'Sales';
    if (currentDept === 'Accounting/Procurement') currentDept = 'Procurement';
    if (currentDept === 'IT' || currentDept === 'HR') currentDept = 'Legacy/Archived';
    
    setFormData({ 
      name: u.name, 
      email: u.email, 
      password: '', 
      role: u.role, 
      department: currentDept,
      newDepartment: '',
      newRole: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // 1. Process Custom Department
      if (submitData.department === 'ADD_NEW') {
        if (!submitData.newDepartment.trim()) return alert('Please enter a department name.');
        submitData.department = submitData.newDepartment.trim();
      }
      
      // 2. Process Custom Role
      if (submitData.role === 'ADD_NEW_ROLE') {
        if (!submitData.newRole.trim()) return alert('Please enter a role name.');
        // Format to snake_case for consistency in DB (optional but recommended)
        submitData.role = submitData.newRole.trim().toLowerCase().replace(/\s+/g, '_');
      }

      delete submitData.newDepartment;
      delete submitData.newRole;

      if (editingUserId) {
        const res = await api.put(`/admin/users/${editingUserId}`, submitData);
        setUsers(prev => prev.map(u => u.id === editingUserId ? res.data.user : u));
        alert('User account updated successfully!');
      } else {
        const res = await api.post('/admin/users', submitData);
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

  const filteredUsers = users.filter(u => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term))
    );

    let dept = u.department || 'Unassigned';
    if (dept === 'Accounting/Procurement') dept = 'Procurement';
    if (dept === 'IT' || dept === 'HR') dept = 'Legacy/Archived';
    
    const matchesDept = filterDept === 'All' || dept === filterDept;

    return matchesSearch && matchesDept;
  });

  const groupedUsers = filteredUsers.reduce((acc, u) => {
    let dept = u.department || 'Unassigned';
    if (dept === 'Accounting/Procurement') dept = 'Procurement';
    if (dept === 'IT' || dept === 'HR') dept = 'Legacy/Archived';

    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(u);
    return acc;
  }, {});

  // Generate a random-ish color for custom roles based on their string length
  const getRoleColor = (roleStr) => {
    const ROLE_COLORS = {
      super_admin: '#DC2626', manager: '#7C3AED', dept_head: '#2563EB', 
      sales_employee: '#059669', engineering_employee: '#0891B2',
      logistics_employee: '#EA580C', accounting_employee: '#6366F1',
    };
    if (ROLE_COLORS[roleStr]) return ROLE_COLORS[roleStr];
    
    const fallbacks = ['#059669', '#0891B2', '#4F46E5', '#D97706', '#DB2777'];
    return fallbacks[roleStr.length % fallbacks.length];
  };

  return (
    <div className="vcc-module">
      <div className="vcc-module-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="vcc-module-title">User Management</h2>
          <p className="vcc-module-subtitle">
            {filteredUsers.length} accounts found across {Object.keys(groupedUsers).length} departments
          </p>
        </div>
        
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
              {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
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
                  {members.map(emp => {
                    const color = getRoleColor(emp.role);
                    return (
                      <tr key={emp.id}>
                        <td data-label="Name" className="um-td-name">{emp.name}</td>
                        <td data-label="Email" className="um-td-email">{emp.email}</td>
                        <td data-label="Role">
                          <span
                            className="um-role-badge"
                            style={{
                              background: `${color}18`,
                              color: color,
                              borderColor: `${color}30`,
                            }}
                          >
                              {emp.role === 'accounting_employee' 
                                  ? 'Procurement Employee' 
                                  : emp.role === 'department_employee'
                                    ? `${emp.department || 'Department'} Employee`
                                    : emp.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td data-label="Actions" className="um-td-actions">
                          <button className="um-btn-edit" onClick={() => openEditModal(emp)}>Edit</button>
                          {emp.id !== user?.id && (
                            <button className="um-btn-delete" onClick={() => handleDeleteUser(emp.id, emp.name)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
                    {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="ADD_NEW" style={{ fontWeight: 'bold', color: '#2563EB' }}>+ Create New Department</option>
                  </select>
                </div>

                {/* Filtered Role Dropdown */}
                <div className="um-field half">
                  <label>Role / Access Level</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    {dynamicRolesForForm.map(roleOption => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                    <option value="ADD_NEW_ROLE" style={{ fontWeight: 'bold', color: '#059669' }}>+ Create New Role</option>
                  </select>
                </div>

                {/* New Department Text Input */}
                {formData.department === 'ADD_NEW' && (
                  <div className="um-field full" style={{ marginTop: '4px' }}>
                    <label>New Department Name</label>
                    <input
                      type="text" name="newDepartment" value={formData.newDepartment}
                      onChange={handleInputChange} required placeholder="e.g. Marketing"
                    />
                  </div>
                )}

                {/* New Role Text Input */}
                {formData.role === 'ADD_NEW_ROLE' && (
                  <div className="um-field full" style={{ marginTop: '4px' }}>
                    <label>New Role Name</label>
                    <input
                      type="text" name="newRole" value={formData.newRole}
                      onChange={handleInputChange} required placeholder="e.g. Senior Auditor"
                    />
                  </div>
                )}

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