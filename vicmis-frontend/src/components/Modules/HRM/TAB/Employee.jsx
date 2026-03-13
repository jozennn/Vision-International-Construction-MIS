import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Search, Plus, ArrowLeft, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import '../CSS/Employee.css';

const EmployeeManagement = ({ onBack }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [notification, setNotification] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, id: null });

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    // 1. Updated Initial State to include birthday as empty string
    const initialFormState = { 
        name: '', 
        email: '', 
        position: '', 
        department: '',
        status: 'Active',
        rate_per_day: '',
        birthday: '' // Always initialize to avoid React warnings
    };

    const [formData, setFormData] = useState(initialFormState);

    const triggerToast = (title, msg, type = 'success') => {
        setNotification({ title, msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => { 
        fetchEmployees(); 
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get('/employees'); 
            setEmployees(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            triggerToast("Fetch Error", "Failed to access employee records", "error");
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (employee = null) => {
        if (employee && employee.id) {
            setIsEditing(true);
            setCurrentId(employee.id);
            // 2. Ensure birthday falls back to empty string if null in DB
            setFormData({ 
                name: employee.name || '', 
                email: employee.email || '', 
                position: employee.position || '', 
                department: employee.department || '',
                status: employee.status || 'Active',
                rate_per_day: employee.rate_per_day || '',
                birthday: employee.birthday || '' 
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData(initialFormState);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing && currentId) {
                await api.put(`/employees/${currentId}`, formData);
                triggerToast("Update Successful", `${formData.name}'s record has been updated.`);
            } else {
                await api.post('/employees', formData);
                triggerToast("Registration Success", "New employee has been added.");
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err) { 
            const errorMsg = err.response?.data?.message || "Error saving data.";
            triggerToast("Operation Failed", errorMsg, "error");
        }
    };

    const executeDelete = async () => {
        try {
            await api.delete(`/employees/${confirmDialog.id}`);
            triggerToast("Record Deleted", "Removed successfully.");
            setConfirmDialog({ show: false, id: null });
            fetchEmployees();
        } catch (err) { 
            triggerToast("Delete Failed", "Record is in use.", "error");
            setConfirmDialog({ show: false, id: null });
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);

    return (
        <div className="emp-container">
            {/* TOASTS & CONFIRM DIALOGS - Identical to your code */}
            {notification && (
                <div className="toast-container">
                    <div className={`toast ${notification.type}`}>
                        <div className="toast-content">
                            <span className="toast-title">{notification.title}</span>
                            <span className="toast-msg">{notification.msg}</span>
                        </div>
                        <button className="toast-close" onClick={() => setNotification(null)}><X size={18}/></button>
                    </div>
                </div>
            )}

            {confirmDialog.show && (
                <div className="modal-overlay">
                    <div className="professional-modal modal-confirm">
                        <div style={{ padding: '40px' }}>
                            <div className="confirm-icon-container">
                                <AlertTriangle size={32} />
                            </div>
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure? This action cannot be undone.</p>
                            <div className="confirm-footer">
                                <button className="btn-secondary" onClick={() => setConfirmDialog({ show: false, id: null })}>Cancel</button>
                                <button className="btn-primary-brand" onClick={executeDelete}>Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card">
                <div className="emp-header">
                    <div className="header-left-group">
                        <button className="btn-back-vision" onClick={onBack}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="title-section">
                            <h2>Staff Management</h2>
                            <p className="subtitle">{employees.length} Total Employees</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <div className="search-input-wrapper">
                            <Search size={16} className="icon-search-inner"/>
                            <input 
                                type="text" 
                                placeholder="Search staff..." 
                                className="vision-search-input" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <button className="btn-add-vision" onClick={() => handleOpenModal()}>
                            <Plus size={18} /> Add Employee
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loader-container"><div className="spinner"></div></div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="emp-table">
                                <thead>
                                    <tr>
                                        <th>Employee & Position</th>
                                        <th>Department</th>
                                        <th>Daily Rate</th>
                                        <th>Status</th>
                                        <th style={{textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRecords.map((emp) => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div className="avatar-cell">
                                                    <div className="avatar-circle">{emp.name?.charAt(0)}</div>
                                                    <div>
                                                        <div className="emp-name">{emp.name}</div>
                                                        <div className="emp-pos">{emp.position}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="dept-badge">{emp.department}</span></td>
                                            <td>₱{parseFloat(emp.rate_per_day || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td><div className={`status-indicator ${emp.status?.toLowerCase().replace(/\s+/g, '-')}`}>{emp.status}</div></td>
                                            <td style={{textAlign: 'right'}}>
                                                <div className="ops-btns">
                                                    <button className="btn-edit" onClick={() => handleOpenModal(emp)}>Edit</button>
                                                    <button className="btn-delete" onClick={() => setConfirmDialog({show: true, id: emp.id})}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredEmployees.length)} of {filteredEmployees.length} staff
                            </div>
                            <div className="pagination-btns">
                                <button className="page-nav" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="page-indicator">Page {currentPage} of {totalPages || 1}</span>
                                <button className="page-nav" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="professional-modal">
                        <div className="modal-header-brand">
                            <div className="header-text">
                                <h2>{isEditing ? 'Update Employee' : 'Register New Employee'}</h2>
                                <p>Enter the identity and payroll baseline details below.</p>
                            </div>
                            <button className="close-x" onClick={() => setShowModal(false)}><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="modal-form-wrapper">
                            <div className="modal-body">
                                <div className="form-section-grid">
                                    <div className="form-group full-width">
                                        <label>Full Name</label>
                                        <input 
                                            placeholder="e.g. John Doe"
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Email (Login ID)</label>
                                        <input 
                                            type="email"
                                            placeholder="name@vision.com"
                                            value={formData.email} 
                                            onChange={e => setFormData({...formData, email: e.target.value})} 
                                            disabled={isEditing} 
                                            required 
                                        />
                                    </div>

                                    {/* 3. BIRTHDAY FIELD with || '' to prevent controlled/uncontrolled warning */}
                                    <div className="form-group">
                                        <label>Birthday</label>
                                        <input 
                                            type="date"
                                            value={formData.birthday || ''} 
                                            onChange={e => setFormData({...formData, birthday: e.target.value})} 
                                            required 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Department</label>
                                        <select 
                                            value={formData.department} 
                                            onChange={e => setFormData({...formData, department: e.target.value})} 
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            <option value="Management">Management</option>
                                            <option value="Engineering">Engineering</option>
                                            <option value="HR">HR</option>
                                            <option value="Sales">Sales</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Logistics">Logistics</option>
                                            <option value="IT">IT</option>
                                            <option value="Accounting">Accounting</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Position</label>
                                        <input 
                                            placeholder="e.g. Manager"
                                            value={formData.position} 
                                            onChange={e => setFormData({...formData, position: e.target.value})} 
                                            required 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Rate Per Day (₱)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={formData.rate_per_day} 
                                            onChange={e => setFormData({...formData, rate_per_day: e.target.value})} 
                                            required 
                                        />
                                    </div>

                                    {/* 4. Optional Status Field only shown when editing */}
                                    {isEditing && (
                                        <div className="form-group">
                                            <label>Status</label>
                                            <select 
                                                value={formData.status}
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="On Leave">On Leave</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary-brand">
                                    {isEditing ? 'Update Record' : 'Create Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;