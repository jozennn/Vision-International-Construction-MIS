import React from 'react';



const Settings = () => {
  const headers = [
    
  ];

  return (
    <div className="inventory-section">
      <h2 className="section-title">Settings</h2>

      <div className="table-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Quick search" />
        </div>
        <div className="action-buttons">
          <button className="add-button">+ Add Material</button>
          <button className="filter-button">Filter ⌄</button>
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          
        </table>
      </div>
    </div>
  );
};

export default Settings;