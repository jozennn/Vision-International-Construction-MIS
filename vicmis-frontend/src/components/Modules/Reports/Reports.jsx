import React, { useState, useEffect } from 'react';
import './css/Reports.css';

import { EndingInventory, LowStock, StockMovement, ExportAllInventoryReports } from './InventoryReports.jsx';
import { ProjectStatus, MaterialRequests }                                       from './ProjectReports.jsx';
import { LeadConversion, ConvertedProjects, CustomerActivity, ExportAllCustomerReports } from './CustomerReports.jsx';

const SECTIONS = {
  'inventory-reports': {
    label: 'Inventory Reports', icon: '📦', color: '#497B97',
    reports: [
      { id: 'ending-inventory', label: 'Monthly Ending Inventory', component: EndingInventory },
      { id: 'low-stock',        label: 'Low Stock / Reorder',      component: LowStock        },
      { id: 'stock-movement',   label: 'Stock Movement Summary',   component: StockMovement   },
    ],
  },
  'project-reports': {
    label: 'Project Reports', icon: '📝', color: '#6366f1',
    reports: [
      { id: 'project-status',    label: 'Project Status Summary',  component: ProjectStatus    },
    ],
  },
  'customer-reports': {
    label: 'Customer Reports', icon: '👤', color: '#C20100',
    reports: [
      { id: 'lead-conversion',    label: 'Lead Conversion Report',    component: LeadConversion    },
      { id: 'converted-projects', label: 'Converted Projects Report', component: ConvertedProjects },
      { id: 'customer-activity',  label: 'Customer Activity Summary', component: CustomerActivity  },
    ],
  },
};

const Reports = ({ user, activeSubItem }) => {
  const currentSection  = SECTIONS[activeSubItem] || SECTIONS['inventory-reports'];
  const [activeReport, setActiveReport] = useState(currentSection.reports[0].id);
  const isInventory = (activeSubItem || 'inventory-reports') === 'inventory-reports';
  const isCustomer = (activeSubItem || '') === 'customer-reports';

  useEffect(() => {
    const sec = SECTIONS[activeSubItem] || SECTIONS['inventory-reports'];
    setActiveReport(sec.reports[0].id);
  }, [activeSubItem]);

  const currentReport   = currentSection.reports.find(r => r.id === activeReport) || currentSection.reports[0];
  const ReportComponent = currentReport.component;

  return (
    <div className="rpt-wrapper">

      {/* Page Header */}
      <div className="rpt-page-header">
        <div className="rpt-page-header-left">
          <div className="rpt-page-icon" style={{ background: `${currentSection.color}22` }}>
            <span style={{ fontSize: '1.5rem' }}>{currentSection.icon}</span>
          </div>
          <div>
            <h1 className="rpt-page-title">{currentSection.label}</h1>
            <p className="rpt-page-sub">Vision International Construction OPC · VICMIS</p>
          </div>
        </div>
        <div className="rpt-page-right">
          {/* Export All button — shown on Inventory Reports and Customer Reports sections */}
          {isInventory && <ExportAllInventoryReports />}
          {isCustomer && <ExportAllCustomerReports />}
          <div className="rpt-live-pill"><span className="rpt-live-dot" />Reports</div>
          <span className="rpt-page-date">
            {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rpt-tabs-bar">
        {currentSection.reports.map(r => (
          <button
            key={r.id}
            className={`rpt-tab ${activeReport === r.id ? 'active' : ''}`}
            style={{ '--tab-color': currentSection.color }}
            onClick={() => setActiveReport(r.id)}
          >
            {r.label}
            {activeReport === r.id && <span className="rpt-tab-indicator" style={{ background: currentSection.color }} />}
          </button>
        ))}
      </div>

      {/* Active Report */}
      <div className="rpt-content-area">
        <ReportComponent user={user} />
      </div>

    </div>
  );
};

export default Reports;