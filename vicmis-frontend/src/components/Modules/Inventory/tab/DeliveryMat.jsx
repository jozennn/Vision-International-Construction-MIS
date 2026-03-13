import React, { useState, useEffect } from 'react';
import api from '@/api/axios'; 
import '../css/Construction.css';

const DeliveryMat = ({ onBack }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Added 'quantity' to sync with backend inventory decrementing logic
  const [formData, setFormData] = useState({
    trucking_service: '',
    product_category: '',
    consumables: '',
    project_name: '',
    driver_name: '',
    destination: '',
    date_of_delivery: '',
    quantity: 1 
  });

  const fetchDeliveries = async () => {
    try {
      setLoading(true); 
      // Pointing to the new LogisticsController@getLogisticsHistory route
      const res = await api.get('/inventory/logistics');
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setDeliveries(data);
    } catch (err) {
      console.error("Error fetching logistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const handleDelivered = async (id) => {
    if (!window.confirm("Mark this item as delivered?")) return;
    try {
      // Pointing to LogisticsController@markAsDelivered
      await api.patch(`/inventory/logistics/${id}/delivered`);
      await fetchDeliveries(); 
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      // Pointing to LogisticsController@stockOut
      await api.post('/inventory/stock-out', formData);
      
      // Reset form
      setFormData({ 
        trucking_service: '', product_category: '', consumables: '', 
        project_name: '', driver_name: '', destination: '', date_of_delivery: '',
        quantity: 1
      });
      
      setShowModal(false);
      await fetchDeliveries(); 
      alert("Delivery scheduled successfully!");
    } catch (err) {
      alert(`Dispatch Failed: ${err.response?.data?.message || "Error"}`);
    }
  };

  return (
    <div className="construction-container">
      <div className="table-header-box">
        <div className="left-side">
          <button className="back-nav-btn" onClick={onBack}>← Back</button>
          <h2>Delivery Logistics</h2>
        </div>
        <button className="add-material-btn" onClick={() => setShowModal(true)}>
          + Schedule Delivery
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Schedule New Delivery</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSchedule}>
              <div className="modal-form-grid">
                <div className="form-group-dispatch">
                  <label>Trucking Service</label>
                  <input type="text" required value={formData.trucking_service} onChange={(e) => setFormData({...formData, trucking_service: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Product Category</label>
                  <input type="text" required value={formData.product_category} onChange={(e) => setFormData({...formData, product_category: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Consumables (Item Name)</label>
                  <input type="text" required value={formData.consumables} onChange={(e) => setFormData({...formData, consumables: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Quantity to Deduct</label>
                  <input type="number" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Project Name</label>
                  <input type="text" required value={formData.project_name} onChange={(e) => setFormData({...formData, project_name: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Driver Name</label>
                  <input type="text" required value={formData.driver_name} onChange={(e) => setFormData({...formData, driver_name: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Destination</label>
                  <input type="text" required value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
                </div>
                <div className="form-group-dispatch">
                  <label>Date of Delivery</label>
                  <input type="date" required value={formData.date_of_delivery} onChange={(e) => setFormData({...formData, date_of_delivery: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="confirm-dispatch-btn">Confirm Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Trucking Service</th>
              <th>Product Category</th>
              <th>Consumables</th>
              <th>Project Name</th>
              <th>Driver Name</th>
              <th>Destination</th>
              <th>Expected Date</th>
              <th>Date Delivered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="loading-text">Updating feed...</td></tr>
            ) : deliveries.length > 0 ? (
              deliveries.map(d => (
                <tr key={d.id}>
                  <td className="font-bold">{d.trucking_service}</td> 
                  <td>{d.product_category}</td>
                  <td>{d.consumables}</td>
                  <td>{d.project_name}</td>
                  <td>{d.driver_name}</td>
                  <td>{d.destination}</td>
                  <td className="time-text">{d.date_of_delivery}</td>
                  <td className="time-text">
                    {/* Formats the timestamp nicely if it exists */}
                    {d.date_delivered ? new Date(d.date_delivered).toLocaleDateString() : '---'}
                  </td>
                  <td>
                    {d.status !== 'Delivered' ? (
                      <button 
                        className="delivered-action-btn" 
                        onClick={() => handleDelivered(d.id)}
                      >
                        Mark Delivered
                      </button>
                    ) : (
                      <span className="status-pill delivered">Delivered</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="9" className="empty-state">No active deliveries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryMat;