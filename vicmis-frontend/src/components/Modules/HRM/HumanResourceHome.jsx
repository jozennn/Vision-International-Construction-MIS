import React from 'react';
import './CSS/HRM.css'; // Import the new CSS file

const HumanResourceHome = ({ onSelectModule }) => {
  const menuOptions = [
    { id: 'employee', title: 'Employee Management', icon: '👤' },
    { id: 'payroll', title: 'Payroll Management', icon: '💰' },
    { id: 'attendance', title: 'Attendance', icon: '📅' },
    { id: 'hiring', title: 'Job Hiring', icon: '🤝' },
    { id: 'posting', title: 'Post Job Hiring', icon: '📢' },
  ];

  return (
    <div className="hrm-grid">
      {menuOptions.map((item) => (
        <div 
          key={item.id}
          className="hrm-card"
          onClick={() => onSelectModule(item.id)}
        >
          <div className="card-icon">{item.icon}</div>
          <div className="card-title">{item.title}</div>
        </div>
      ))}
    </div>
  );
};

export default HumanResourceHome;