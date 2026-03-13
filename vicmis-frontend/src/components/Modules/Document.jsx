import React, { useState } from 'react';
import Tabs from '../../Tabs/Tabs.jsx';

const Document= () => {
  const [activeTab, setActiveTab] = useState('Project Documents');

  const tabs = [
    'Project Documents',
    'Client Documents',
    'Human Resource & Workforce',
    'Inventory and Assets',
  ];

  const headers = [
    'Material ID',
    'Material Name',
    'Category',
    'Quantity',
    'Status',
    'Action',
    'Description',
  ];

  return (
    <div className="inventory-section">

      {/* Yellow Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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

      {/* Tab Content */}
      <div className="tab-content">

        {activeTab === 'Project Documents' && (
          <div className="data-table">
            <h3>Project Documents</h3>
            <table>
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#7676</td>
                  <td>Wood</td>
                  <td>Vision Floor</td>
                  <td>100/100</td>
                  <td>In Stock</td>
                  <td>Edit</td>
                  <td>Lorem</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Client Documents' && (
          <div>
            <h3>Client Documents</h3>
            <p>Manage office supplies such as papers, pens, printers, and furniture.</p>
          </div>
        )}

        {activeTab === 'Human Resource & Workforce' && (
          <div>
            <h3>Human Resource & Workforce</h3>
            <p>Track outgoing and incoming deliveries for projects.</p>
          </div>
        )}

        {activeTab === 'Inventory and Assets' && (
          <div>
            <h3>Inventory and Assets</h3>
            <p>View vehicle usage, fuel consumption, and maintenance reports.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Document;
