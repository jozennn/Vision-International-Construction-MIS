import React, { useState, useEffect } from 'react';
import api from '@/api/axios'; 
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import '../CSS/Attendance.css';

const Attendance = ({ 
    attendance = {}, 
    setAttendance, 
    selectedMonth, 
    setSelectedMonth, 
    selectedYear, 
    setSelectedYear,
    onBack 
}) => {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // 1. Fetch Employees
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await api.get('/employees'); 
                const uniqueData = Array.from(
                    new Map(response.data.map(item => [item.id, item])).values()
                );
                setEmployees(uniqueData);
            } catch (err) {
                console.error("Failed to fetch employees.");
            }
        };
        fetchEmployees();
    }, []);

    // 2. NEW: Fetch existing Attendance records for the selected month/year
    // This fixes the 404/500 issue by ensuring we call the correct backend route
    useEffect(() => {
        const fetchAttendanceData = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/attendance/get-month`, {
                    params: { year: selectedYear, month: selectedMonth }
                });

                // Transform the array of records from Laravel into the key-value 
                // format your frontend uses: { "empId-year-month-day": "status" }
                const formattedData = {};
                response.data.forEach(record => {
                    const key = `${record.user_id}-${record.year}-${record.month}-${record.day}`;
                    formattedData[key] = record.status;
                });

                setAttendance(formattedData);
            } catch (err) {
                console.error("Failed to sync attendance records:", err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendanceData();
    }, [selectedYear, selectedMonth, setAttendance]);

    const getDaysInMonth = (year, month) => {
        const date = new Date(year, month - 1, 1);
        const days = [];
        while (date.getMonth() === month - 1) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                days.push({
                    dayNum: date.getDate(),
                    dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
                });
            }
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const daysArray = getDaysInMonth(selectedYear, selectedMonth);

    const handleStatusChange = async (empId, day, status) => {
        if (!selectedYear || !selectedMonth) return;

        const key = `${empId}-${selectedYear}-${selectedMonth}-${day}`;
        
        // Optimistic UI Update
        setAttendance(prev => ({ ...prev, [key]: status }));

        try {
            await api.post('/attendance/save-single', {
                user_id: empId, 
                year: selectedYear, 
                month: selectedMonth, 
                day: day, 
                status: status
            });
        } catch (error) {
            console.error("Manual save failed:", error.response?.data || error.message);
            // Revert on failure could be added here
        }
    };

    const filteredEmployees = employees.filter(emp => 
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredEmployees.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

    return (
        <div className="attendance-page-wrapper">
            <div className="attendance-main-card">
                <div className="attendance-header">
                    <div className="header-left">
                        <button className="btn-back-vision" onClick={onBack}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="title-group">
                            <h1>Attendance Sheet</h1>
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
                                className="vision-search-input"
                                placeholder="Search staff..."
                                value={searchTerm}
                                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                            />
                        </div>
                        <select className="vision-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={`month-opt-${i + 1}`} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select className="vision-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                            {[2024, 2025, 2026].map(y => <option key={`year-opt-${y}`} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="vision-loading-state">
                            <div className="vision-spinner"></div>
                            <p>Loading Attendance Data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-scroll-area">
                                <table className="attendance-data-table">
                                    <thead>
                                        <tr>
                                            <th className="sticky-column header-emp">Employee Name</th>
                                            {daysArray.map(day => (
                                                <th key={`th-day-${day.dayNum}`} className="day-header">
                                                    <span className="day-n">{day.dayNum}</span>
                                                    <span className="day-s">{day.dayName}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRows.map((emp, idx) => (
                                            <tr key={`row-${emp.id}-${idx}`}>
                                                <td className="sticky-column emp-name-cell">
                                                    <div className="emp-flex">
                                                        <div className="emp-avatar-small">{(emp.name || "U").charAt(0)}</div>
                                                        <span>{emp.name}</span>
                                                    </div>
                                                </td>
                                                {daysArray.map(day => {
                                                    const statusKey = `${emp.id}-${selectedYear}-${selectedMonth}-${day.dayNum}`;
                                                    const currentStatus = attendance[statusKey] || "";
                                                    
                                                    return (
                                                        <td key={`cell-${emp.id}-${day.dayNum}`} className="status-cell">
                                                            <select 
                                                                className={`attendance-dropdown status-${currentStatus}`}
                                                                value={currentStatus}
                                                                onChange={(e) => handleStatusChange(emp.id, day.dayNum, e.target.value)}
                                                            >
                                                                <option value="">-</option>
                                                                <option value="P">P</option>
                                                                <option value="A">A</option>
                                                                <option value="L">L</option>
                                                                <option value="OT">OT</option>
                                                            </select>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="attendance-footer">
                                <p className="pagination-info">
                                    Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredEmployees.length)} of {filteredEmployees.length} staff
                                </p>
                                <div className="pagination-controls">
                                    <button 
                                        className="pag-btn"
                                        disabled={currentPage === 1} 
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        <ChevronLeft size={18}/>
                                    </button>
                                    <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                                    <button 
                                        className="pag-btn"
                                        disabled={currentPage === totalPages || totalPages === 0} 
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        <ChevronRight size={18}/>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Attendance;