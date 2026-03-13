import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import { 
  Truck, Ship, MapPin, Package, Plus, X, Loader2, RefreshCw, Layers, Trash2, Globe, Building2
} from 'lucide-react';
import './AccountingDashboard.css';

const AccountingDashboard = ({ user }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [shipmentForm, setShipmentForm] = useState({
    origin_type: 'INTERNATIONAL',
    shipment_number: '',
    container_type: '20 FOOTER',
    // Added quantity here
    projects: [{ project_name: '', product_category: '', coverage_sqm: '', quantity: '' }],
    status: 'ONGOING PRODUCTION',
    location: '',
    shipment_status: 'WAITING'
  });

  const fetchSupplyChainData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (isSilent) setIsRefreshing(true);
      
      const [delRes, shipRes] = await Promise.all([
        api.get('/inventory/logistics'), 
        api.get('/inventory/shipments')
      ]);
      
      setDeliveries(delRes.data.slice(0, 10)); 
      setShipments(shipRes.data.slice(0, 10));
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplyChainData();
  }, [fetchSupplyChainData]);

  const addProjectRow = () => {
    setShipmentForm({
      ...shipmentForm,
      // Added quantity to new rows
      projects: [...shipmentForm.projects, { project_name: '', product_category: '', coverage_sqm: '', quantity: '' }]
    });
  };

  const removeProjectRow = (index) => {
    if (index > 0) {
        const updatedProjects = shipmentForm.projects.filter((_, i) => i !== index);
        setShipmentForm({ ...shipmentForm, projects: updatedProjects });
    }
  };

  const updateProjectData = (index, field, value) => {
    const updatedProjects = [...shipmentForm.projects];
    updatedProjects[index][field] = value;
    setShipmentForm({ ...shipmentForm, projects: updatedProjects });
  };

  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/inventory/shipments', shipmentForm);
      alert("Shipment Registered Successfully!");
      setShipmentForm({
        origin_type: 'INTERNATIONAL',
        shipment_number: '',
        container_type: '20 FOOTER',
        // Reset with quantity
        projects: [{ project_name: '', product_category: '', coverage_sqm: '', quantity: '' }],
        status: 'ONGOING PRODUCTION',
        location: '',
        shipment_status: 'WAITING'
      });
      fetchSupplyChainData();
    } catch (err) {
      alert("Error saving shipment.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="vision-accounting-wrapper">
      <header className="v-dashboard-header">
        <div>
          <h1>Logistics Control Center</h1>
          <p>Vision Procurement & International Shipping</p>
        </div>
        <button className={`v-refresh-btn ${isRefreshing ? 'spinning' : ''}`} onClick={() => fetchSupplyChainData()}>
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="vision-stats-grid">
        <div className="vision-stat-card border-navy">
          <div className="v-stat-icon navy-bg"><Ship size={24} /></div>
          <div className="v-stat-info">
            <span className="v-label">Total Shipments</span>
            <span className="v-value">{shipments.length} Active</span>
          </div>
        </div>
        <div className="vision-stat-card border-blue">
          <div className="v-stat-icon blue-bg"><Truck size={24} /></div>
          <div className="v-stat-info">
            <span className="v-label">Local Deliveries</span>
            <span className="v-value">{deliveries.length} Records</span>
          </div>
        </div>
      </div>

      <div className="vision-main-layout">
        <div className="vision-left-col">
          <div className="vision-card">
            <div className="v-card-header">
              <h3><Layers size={18} /> Register Incoming Shipment</h3>
            </div>
            <form className="v-quick-form" onSubmit={handleShipmentSubmit}>
              
              <div className="v-origin-section">
                <div className="v-form-row">
                  <div className="v-input-group">
                    <label className="v-tiny-label">Logistics Type</label>
                    <select 
                      className="v-input v-select-dropdown" 
                      value={shipmentForm.origin_type} 
                      onChange={(e) => setShipmentForm({...shipmentForm, origin_type: e.target.value})}
                    >
                      <option value="INTERNATIONAL">INTERNATIONAL</option>
                      <option value="LOCAL">LOCAL</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="v-form-row">
                <div className="v-input-group">
                  <label className="v-tiny-label">Shipment Number</label>
                  <input className="v-input" placeholder="e.g. #SHIP-101" value={shipmentForm.shipment_number} onChange={(e) => setShipmentForm({...shipmentForm, shipment_number: e.target.value})} required />
                </div>
                <div className="v-input-group">
                  <label className="v-tiny-label">Container Type</label>
                  <select className="v-input v-select-dropdown" value={shipmentForm.container_type} onChange={(e) => setShipmentForm({...shipmentForm, container_type: e.target.value})}>
                    <option value="20 FOOTER">20 FOOTER</option>
                    <option value="40 FOOTER">40 FOOTER</option>
                  </select>
                </div>
              </div>

              <div className="v-project-repeater">
                <label className="v-tiny-label">Project Allocation</label>
                {shipmentForm.projects.map((proj, idx) => (
                  <div key={idx} className="v-project-row">
                    <div className="v-row-header">
                        <span className="v-project-count">Project {idx + 1}</span>
                        {idx > 0 && (
                          <button type="button" className="v-btn-remove" onClick={() => removeProjectRow(idx)}>
                              <Trash2 size={14} /> Remove
                          </button>
                        )}
                    </div>
                    <input className="v-input mb-5" placeholder="Project Name" value={proj.project_name} onChange={(e) => updateProjectData(idx, 'project_name', e.target.value)} required />
                    <div className="v-form-row">
                      <input className="v-input" placeholder="Product Category" value={proj.product_category} onChange={(e) => updateProjectData(idx, 'product_category', e.target.value)} />
                      
                      {/* Quantity Input */}
                      <input 
                        className="v-input" 
                        placeholder="Qty" 
                        type="number" 
                        value={proj.quantity} 
                        onChange={(e) => updateProjectData(idx, 'quantity', e.target.value)} 
                      />

                      <div className="v-sqm-input-wrapper">
                        <input className="v-input" placeholder="Area" type="number" value={proj.coverage_sqm} onChange={(e) => updateProjectData(idx, 'coverage_sqm', e.target.value)} />
                        <span className="v-unit-tag">SQM</span>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="v-btn-add-project" onClick={addProjectRow}>
                  <Plus size={14} /> Add Other Project
                </button>
              </div>

              <div className="v-logistics-meta">
                <div className="v-form-row">
                  <div className="v-input-group">
                    <label className="v-tiny-label">Production Status</label>
                    <select className="v-input" value={shipmentForm.status} onChange={(e) => setShipmentForm({...shipmentForm, status: e.target.value})}>
                      <option>ONGOING PRODUCTION</option>
                      <option>ON STOCK</option>
                      <option>READY FOR SHIPMENT</option>
                    </select>
                  </div>
                  <div className="v-input-group">
                    <label className="v-tiny-label">Material Location</label>
                    <input className="v-input" placeholder="Current Warehouse" value={shipmentForm.location} onChange={(e) => setShipmentForm({...shipmentForm, location: e.target.value})} />
                  </div>
                </div>
                <div className="v-form-row mt-10">
                  <div className="v-input-group">
                    <label className="v-tiny-label">Shipment Progress</label>
                    <select className="v-input" value={shipmentForm.shipment_status} onChange={(e) => setShipmentForm({...shipmentForm, shipment_status: e.target.value})}>
                      <option value="WAITING">WAITING</option>
                      <option value="DEPARTURE">DEPARTURE</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className="v-btn-navy-action w-full mt-10" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Register Logistics Shipment'}
              </button>
            </form>
          </div>
        </div>

        <div className="vision-right-col">
          <div className="vision-card">
            <div className="v-card-header">
              <h3><Package size={18} /> Procurement Activity</h3>
            </div>
            <div className="v-timeline-feed">
              {shipments.map(ship => (
                <div key={ship.id} className="v-timeline-item">
                  <div className="v-t-icon">
                    {ship.origin_type === 'INTERNATIONAL' ? <Globe size={14} /> : <Building2 size={14} />}
                  </div>
                  <div className="v-t-content">
                    <strong>{ship.shipment_number}</strong>
                    <span className="v-origin-label">{ship.origin_name || ship.container_type}</span>
                    <div className="v-mini-project-list">
                      {ship.projects?.map((p, i) => (
                        <span key={i} className="v-tiny-project-tag">{p.project_name}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`v-status-tag ${ship.shipment_status === 'ARRIVED' ? 'success' : 'pending'}`}>{ship.shipment_status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingDashboard;