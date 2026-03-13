import React, { useState } from 'react';
import HumanResourceHome from './HumanResourceHome';
import EmployeeManagement from './TAB/Employee.jsx'; 
import PayrollManagement from './TAB/Payroll.jsx';
import Attendance from './TAB/Attendance.jsx';
import './CSS/HRM.css';

const Workforce = ({ attendance, setAttendance }) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleModuleSelect = (moduleId) => {
    const mapping = {
      employee: 'Employee Management',
      payroll: 'Payroll Management',
      attendance: 'Attendance',
      hiring: 'Job Hiring',
      posting: 'Post Job Hiring',
    };
    setActiveTab(mapping[moduleId] || 'menu');
  };

  // Shared back function
  const goBackToMenu = () => setActiveTab('menu');

  return (
    <div className="hrm-container bg-gray-50 min-h-screen">
      {activeTab === 'menu' ? (
        <HumanResourceHome onSelectModule={handleModuleSelect} />
      ) : (
        <div className="content-view p-6">
          <div className="mt-2">
            {activeTab === 'Employee Management' && (
              <EmployeeManagement onBack={goBackToMenu} />
            )}
            
            {activeTab === 'Payroll Management' && ( 
              <PayrollManagement 
                attendance={attendance} 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear}
                onBack={goBackToMenu} // Optional: add back btn to other tabs too
              />
            )}
            
            {activeTab === 'Attendance' && (
              <Attendance 
                attendance={attendance} 
                setAttendance={setAttendance}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onBack={goBackToMenu}
              />
            )}

            {(activeTab === 'Job Hiring' || activeTab === 'Post Job Hiring') && (
              <div className="p-10 text-center bg-white rounded-xl border-2 border-dashed">
                <p className="text-gray-400 mb-4">Hiring Module coming soon...</p>
                <button onClick={goBackToMenu} className="text-blue-500 underline">Return to Menu</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Workforce;