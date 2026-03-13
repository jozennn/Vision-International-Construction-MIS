import React from "react";
import "./css/ProjectManagement.css"; 

const ProjectManagementHome = ({ onSelectModule }) => {
  const activeModules = [
    { id: 'construction', title: 'Construction Project', icon: '🏗️' },
    { id: 'storyboard', title: 'Story Board', icon: '📋' },
  ];

  return (
    <div className="pm-grid">
      {activeModules.map((item) => (
        <div 
          key={item.id} 
          className="pm-card" 
          onClick={() => onSelectModule(item.id)} 
        >
          <div className="card-icon">{item.icon}</div>
          <div className="card-title">{item.title}</div>
        </div>
      ))}
      
      <div 
        className="pm-card add-card"
        onClick={() => alert("Logic to add a new project/module would go here!")}
      >
        <div className="card-icon">➕</div>
        <div className="card-title">Add New Module</div>
      </div>
    </div>
  );
};

export default ProjectManagementHome;