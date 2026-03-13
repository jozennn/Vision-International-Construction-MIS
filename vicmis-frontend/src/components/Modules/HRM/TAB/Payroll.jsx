import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Download, Send, Search, Eye, ArrowLeft, ChevronLeft, ChevronRight, Printer, Loader2, AlertCircle } from 'lucide-react';
import "../CSS/Payroll.css";

const PayrollManagement = ({ attendance = {}, selectedMonth, selectedYear, onBack }) => {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFinalizing, setIsFinalizing] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 7;

    // 1. Fetch Employees - Cleaned up to use your Axios Interceptor
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                // Your interceptor handles the Bearer token from sessionStorage automatically
                const response = await api.get('/employees');
                setEmployees(response.data);
            } catch (error) {
                console.error("Error fetching employees:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    const getDaysPresent = (empId) => {
        const data = attendance || {}; 
        return Object.keys(data).filter(key => {
            const [id, yr, mo] = key.split('-');
            return parseInt(id) === empId && 
                   parseInt(yr) === parseInt(selectedYear) && 
                   parseInt(mo) === parseInt(selectedMonth) && 
                   data[key] === "P";
        }).length;
    };

    // 2. Finalize Logic - Matches your Route::prefix('payroll')
const handleFinalizeAll = async () => {
    const payrollPayload = filteredEmployees.map(emp => {
        const days = getDaysPresent(emp.id);
        const dailyRate = parseFloat(emp.rate_per_day || 0);
        
        return {
            // Ensure this is 'user_id' exactly to match the validator
            user_id: emp.user_id || emp.id,
            month: selectedMonth,
            year: selectedYear,
            days_present: days,
            total_amount: days * dailyRate
        };
    });

    if (payrollPayload.length === 0) {
        alert("No employees with attendance found for this period.");
        return;
    }

    const confirmFinalize = window.confirm(`Finalize payroll for ${payrollPayload.length} employees? This will notify Accounting.`);
    
    if (confirmFinalize) {
        setIsFinalizing(true);
        try {
            // Note: We send the whole 'payrolls' array
            const response = await api.post('/payroll/finalize', { payrolls: payrollPayload });
            alert(response.data.message || "Payroll successfully sent to Accounting!");
            if (onBack) onBack();
        } catch (error) {
            console.error("Finalize Error:", error);
            // This will show the specific Laravel error if validation fails
            alert(error.response?.data?.message || "Failed to finalize payroll.");
        } finally {
            setIsFinalizing(false);
        }
    }
};

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const days = getDaysPresent(emp.id);
        return matchesSearch && days > 0;
    });

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredEmployees.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage) || 1;

    return (
        <div className="payroll-page-wrapper">
            <div className="payroll-main-card">
                <div className="payroll-header">
                    <div className="header-left">
                        <button className="btn-back-vision" onClick={onBack}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="title-group">
                            <h1>Payroll Summary</h1>
                            <p className="current-period">
                                {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="header-right-actions">
                        <div className="search-input-wrapper">
                            <Search size={16} className="icon-search-inner"/>
                            <input 
                                type="text" 
                                placeholder="Search active payroll..."
                                value={searchTerm}
                                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                            />
                        </div>
                        <button className="btn-outline-vision"> <Download size={16}/> Export </button>
                        
                        <button 
                            className="btn-solid-vision" 
                            onClick={handleFinalizeAll}
                            disabled={isFinalizing || filteredEmployees.length === 0}
                        > 
                            {isFinalizing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                            {isFinalizing ? "Processing..." : "Finalize All"}
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="vision-loading-state">
                            <div className="vision-spinner"></div>
                            <p>Syncing Ledger Data...</p>
                        </div>
                    ) : (
                        <>
                            <table className="payroll-data-table">
                                <thead>
                                    <tr>
                                        <th>Staff Member</th>
                                        <th>Department</th>
                                        <th>Daily Rate</th>
                                        <th className="cell-center">Days Present</th>
                                        <th className="cell-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRows.length > 0 ? (
                                        currentRows.map(emp => {
                                            const days = getDaysPresent(emp.id);
                                            const dailyRate = parseFloat(emp.rate_per_day || 0);
                                            const totalGross = days * dailyRate;

                                            return (
                                                <tr key={emp.id} className="fade-in-row">
                                                    <td>
                                                        <div className="emp-info-cell">
                                                            <div className="emp-avatar-box">{emp.name.charAt(0)}</div>
                                                            <div>
                                                                <p className="emp-name-text">{emp.name}</p>
                                                                <p className="emp-sub-text">{emp.position}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className="dept-badge-vision">{emp.department}</span></td>
                                                    <td className="currency-font">₱{dailyRate.toLocaleString()}</td>
                                                    <td className="cell-center bold-text">{days} Days</td>
                                                    <td className="cell-center">
                                                        <button 
                                                            className="btn-details-vision" 
                                                            onClick={() => setSelectedEmployee({...emp, days, totalGross})}
                                                        >
                                                            <Eye size={14}/> View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="empty-table-note">
                                                No attendance recorded for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="payroll-footer">
                                <p className="pagination-info">
                                    Showing {filteredEmployees.length > 0 ? indexOfFirstRow + 1 : 0} to {Math.min(indexOfLastRow, filteredEmployees.length)} of {filteredEmployees.length} entries
                                </p>
                                <div className="pagination-controls">
                                    <button className="pag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                                        <ChevronLeft size={18}/>
                                    </button>
                                    <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                                    <button className="pag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                                        <ChevronRight size={18}/>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {selectedEmployee && (
                <div className="payroll-modal-overlay" onClick={() => setSelectedEmployee(null)}>
                    <div className="payroll-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Salary Computation</h2>
                                <span className="id-badge">ID: {selectedEmployee.id}</span>
                            </div>
                        </div>
                        
                        <div className="modal-profile-strip">
                            <div className="modal-avatar">{selectedEmployee.name.charAt(0)}</div>
                            <div className="profile-info">
                                <h3>{selectedEmployee.name}</h3>
                                <p>{selectedEmployee.position} • {selectedEmployee.department}</p>
                            </div>
                        </div>

                        <div className="computation-card">
                            <div className="ledger-item">
                                <span>Daily Rate</span>
                                <span>₱{parseFloat(selectedEmployee.rate_per_day).toLocaleString()}</span>
                            </div>
                            <div className="ledger-item">
                                <span>Days Present</span>
                                <span>× {selectedEmployee.days}</span>
                            </div>
                            <div className="ledger-item total">
                                <span>GROSS TOTAL</span>
                                <span className="total-amount">₱{selectedEmployee.totalGross.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-back-vision" onClick={() => setSelectedEmployee(null)}>
                                Close
                            </button>
                            <button className="btn-print" onClick={() => window.print()}>
                                <Printer size={16} /> Print Payslip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollManagement;