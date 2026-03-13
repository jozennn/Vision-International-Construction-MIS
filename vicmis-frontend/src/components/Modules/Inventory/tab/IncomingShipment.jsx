import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Edit, X, Loader2, Package, CheckCircle } from 'lucide-react'; // Added CheckCircle
import '../css/IncomingShipment.css';

const IncomingShipment = ({ onBack, onStockArrival }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/shipments');
      setShipments(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShipments(); }, []);

  // New function to handle quick "Received" action
const handleMarkAsReceived = async (shipment) => {
    if (!window.confirm(`Mark Shipment #${shipment.shipment_number} as RECEIVED?`)) return;

    setUpdateLoading(true);
    try {
        const updatedData = {
            ...shipment,
            shipment_status: 'ARRIVED',
            status: 'ON STOCK',
            location: 'WAREHOUSE'
        };
        await api.put(`/inventory/shipments/${shipment.id}`, updatedData);
        
        // Pass the shipment data to the parent/ConstructionMat
        if (onStockArrival) {
          onStockArrival(shipment); 
        }
        
        alert("Shipment Received! Redirecting to Warehouse Inventory...");
        fetchShipments();
    } catch (err) {
        alert("Failed to mark as received.");
    } finally {
        setUpdateLoading(false);
    }

    setUpdateLoading(true);
    try {
        const updatedData = {
            ...shipment,
            shipment_status: 'ARRIVED',
            status: 'ON STOCK',
            location: 'WAREHOUSE'
        };
        await api.put(`/inventory/shipments/${shipment.id}`, updatedData);
        alert("Shipment Received and Stock Updated!");
        fetchShipments();
    } catch (err) {
        alert("Failed to mark as received.");
    } finally {
        setUpdateLoading(false);
    }
  };

  const openEditModal = (shipment) => {
    setSelectedShipment({ ...shipment });
    setIsEditModalOpen(true);
  };

  const openProjectModal = (shipment) => {
    setSelectedShipment(shipment);
    setIsProjectModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      await api.put(`/inventory/shipments/${selectedShipment.id}`, selectedShipment);
      alert("Shipment Updated!");
      setIsEditModalOpen(false);
      fetchShipments();
    } catch (err) {
      alert("Update failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  

  return (
    <div className="construction-container">
      <div className="table-header-box">
        <div className="left-side">
          <button className="back-nav-btn" onClick={onBack}>← Back</button>
          <h2>Incoming Shipments Master Tracker</h2>
        </div>
        <button className="add-material-btn" onClick={fetchShipments}>Refresh List</button>
      </div>

      <div className="table-wrapper">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Shipment#</th>
              <th>Supplier</th>
              <th>Container</th>
              <th>Projects Included</th>
              <th>Production Status</th>
              <th>Location</th>
              <th>Arrival (Tentative)</th>
              <th>Shipment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && shipments.map(s => (
              <tr key={s.id}>
                <td className="font-bold col-shipment-no">{s.shipment_number}</td>
                <td className="col-supplier">{s.origin_type}</td> 
                <td className="col-container">{s.container_type}</td>
                <td>
                  <button className="project-detail-link" onClick={() => openProjectModal(s)}>
                    <Package size={14} /> View {s.projects?.length || 0} Projects
                  </button>
                </td>
                <td><span className="v-tag-status">{s.status}</span></td>
                <td>{s.location || '---'}</td>
                <td>
                  {s.tentative_arrival ? (
                    <span className="v-date-badge">{s.tentative_arrival}</span>
                  ) : (
                    <span className="v-tba">TBA</span>
                  )}
                </td>
                <td>
                  <span className={`status-pill ${s.shipment_status === 'ARRIVED' ? 'received' : 'on-the-way'}`}>
                    {s.shipment_status}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="edit-action-btn" onClick={() => openEditModal(s)}>
                        <Edit size={14} /> Update
                    </button>
                    
                    {/* Only show 'Received' button if it's not already arrived */}
                    {s.shipment_status !== 'ARRIVED' && (
                        <button 
                            className="received-action-btn" 
                            onClick={() => handleMarkAsReceived(s)}
                            disabled={updateLoading}
                        >
                            <CheckCircle size={14} /> Received
                        </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PROJECT DETAILS MODAL - No changes needed here */}
      {isProjectModalOpen && selectedShipment && (
        <div className="v-modal-overlay">
          <div className="v-modal-content project-info-modal">
            <div className="v-modal-header">
              <div className="header-title">
                  <h3>Project Allocation</h3>
                  <p>Shipment: {selectedShipment.shipment_number}</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="project-details-body">
              <table className="mini-details-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Product Category</th>
                    <th>Quantity</th> {/* Added Header */}
                    <th>Area (SQM)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShipment.projects?.map((proj, i) => (
                    <tr key={i}>
                      <td className="font-bold">{proj.project_name}</td>
                      <td>{proj.product_category}</td>
                      {/* Display individual quantity */}
                      <td className="font-bold">{parseInt(proj.quantity || 0).toLocaleString()} pcs</td>
                      <td>{parseFloat(proj.coverage_sqm || 0).toLocaleString()} SQM</td>
                    </tr>
                  ))}
                </tbody>
                {/* Added Footer for Totals */}
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: '800' }}>
                    <td colSpan="2" style={{ textAlign: 'right', padding: '12px' }}>Total Shipment Volume:</td>
                    <td style={{ color: '#2563eb' }}>
                      {selectedShipment.projects?.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0).toLocaleString()} pcs
                    </td>
                    <td>
                      {selectedShipment.projects?.reduce((sum, p) => sum + parseFloat(p.coverage_sqm || 0), 0).toLocaleString()} SQM
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODAL - Added ARRIVED to the options if not present */}
      {isEditModalOpen && selectedShipment && (
        <div className="v-modal-overlay">
          <div className="v-modal-content">
            <div className="v-modal-header">
              <h3>Edit Shipment Logistics</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="v-modal-form">
              <div className="v-modal-grid">
                <div className="v-field">
                  <label>Shipment Status</label>
                  <select 
                    className="v-input"
                    value={selectedShipment.shipment_status}
                    onChange={(e) => setSelectedShipment({...selectedShipment, shipment_status: e.target.value})}
                  >
                    <option value="WAITING">WAITING</option>
                    <option value="DEPARTURE">DEPARTURE</option>
                  </select>
                </div>
                {/* Rest of the form remains the same */}
                <div className="v-field">
                  <label>Tentative Arrival Date</label>
                  <input 
                    type="date" 
                    className="v-input"
                    value={selectedShipment.tentative_arrival || ''}
                    onChange={(e) => setSelectedShipment({...selectedShipment, tentative_arrival: e.target.value})}
                  />
                </div>
                <div className="v-field">
                  <label>Production Progress</label>
                  <input 
                    type="text" 
                    className="v-input"
                    placeholder="e.g. READY FOR PICKUP"
                    value={selectedShipment.status}
                    onChange={(e) => setSelectedShipment({...selectedShipment, status: e.target.value})}
                  />
                </div>
                <div className="v-field">
                  <label>Current Location</label>
                  <input 
                    type="text" 
                    className="v-input"
                    placeholder="Port / Warehouse Name"
                    value={selectedShipment.location || ''}
                    onChange={(e) => setSelectedShipment({...selectedShipment, location: e.target.value})}
                  />
                </div>
              </div>
              <div className="v-modal-footer">
                <button type="submit" className="v-btn-save" disabled={updateLoading}>
                  {updateLoading ? <Loader2 className="animate-spin" /> : 'Save Logistics Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingShipment;