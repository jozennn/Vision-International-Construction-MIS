import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './css/UserManagement.css';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setFormData({ name: u.name, email: u.email, password: '', role: u.role, department: u.department });
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
    if (id === user.id) { alert('You cannot delete your own account!'); return; }
    if (!window.confirm(`Permanently delete ${name}'s account?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const groupedUsers = users.reduce((acc, u) => {
    const dept = u.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(u);
    return acc;
  }, {});

  const ROLE_COLORS = {
    super_admin: '#DC2626', admin: '#D97706', manager: '#7C3AED',
    dept_head: '#2563EB', sales_employee: '#059669', engineering_employee: '#0891B2',
    logistics_employee: '#EA580C', accounting_employee: '#6366F1',
  };

  return (
    <div className="vcc-module">
      <div className="vcc-module-header">
        <div>
          <h2 className="vcc-module-title">User Management</h2>
          <p className="vcc-module-subtitle">
            {users.length} accounts across {Object.keys(groupedUsers).length} departments
          </p>
        </div>
        <button className="vcc-btn-primary" onClick={openCreateModal}>
          <span>+</span> Create Account
        </button>
      </div>

      {isLoading ? (
        <div className="vcc-loader"><div className="vcc-spinner" /></div>
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
                      <td className="um-td-name">{emp.name}</td>
                      <td className="um-td-email">{emp.email}</td>
                      <td>
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
                      <td className="um-td-actions">
                        <button className="um-btn-edit" onClick={() => openEditModal(emp)}>Edit</button>
                        {emp.id !== user.id && (
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
                <div className="um-field half">
                  <label>Department</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} required>
                    {['IT','Management','Sales','Logistics','Engineering','Accounting/Procurement','HR']
                      .map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="um-field half">
                  <label>Role / Access Level</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="dept_head">Department Head</option>
                    <option value="sales_employee">Sales Employee</option>
                    <option value="engineering_employee">Engineering Employee</option>
                    <option value="logistics_employee">Logistics Employee</option>
                    <option value="accounting_employee">Accounting Employee</option>
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