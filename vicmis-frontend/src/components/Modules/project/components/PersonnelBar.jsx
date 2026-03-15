import React from 'react';

const PersonnelBar = ({ project, userDeptMode }) => (
  <div className="pm-personnel-bar no-print">
    <div className="pm-personnel-left">
      <span>👤 Client: <strong>{project.client_name || '—'}</strong></span>
      <span className="pm-personnel-sep">
        🧑‍💼 Sales:{' '}
        <strong className={project.created_by_name ? '' : 'pm-personnel-missing'}>
          {project.created_by_name || 'Not set'}
        </strong>
      </span>
      <span className="pm-personnel-sep">
        🔧 Engineer(s):{' '}
        <strong className={project.assigned_engineers ? '' : 'pm-personnel-missing'}>
          {project.assigned_engineers || 'Not assigned'}
        </strong>
      </span>
    </div>
    <span className="pm-mode-badge">{userDeptMode} MODE</span>
  </div>
);

export default PersonnelBar;
