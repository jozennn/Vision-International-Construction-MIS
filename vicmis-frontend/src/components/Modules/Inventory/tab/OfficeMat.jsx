import React, { useState } from 'react';
import '../css/Construction.css'; // Reusing the high-end styles

const OfficeMat = ({ onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState([
    { id: 1, name: 'Bond Paper A4', description: 'Hard Copy, 80gsm, 500 sheets', quantity: 25, unit: 'reams', unit_price: 220 },
    { id: 2, name: 'Ink Cartridge - Black', description: 'HP 682 Original Ink Advantage', quantity: 5, unit: 'pcs', unit_price: 480 },
    { id: 3, name: 'Whiteboard Marker', description: 'Fine point, Black, Refillable', quantity: 12, unit: 'pcs', unit_price: 45 },
  ]);

  const [formData, setFormData] = useState({
    name: '', description: '', quantity: '', unit: '', unit_price: ''
  });

  const filteredMaterials = materials.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (e) => {
    e.preventDefault();
    setMaterials([...materials, { ...formData, id: Date.now() }]);
    setIsModalOpen(false);
    setFormData({ name: '', description: '', quantity: '', unit: '', unit_price: '' });
  };

  return (
    <div className="construction-container">
      <div className="table-header-box">
        <div className="left-side">
          <button className="back-nav-btn" onClick={onBack}>← Back</button>
          <h2>Office Materials Inventory</h2>
        </div>
        
        <div className="action-area">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search office supplies..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="add-material-btn" onClick={() => setIsModalOpen(true)}>
            + Add Item
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th style={{ width: '30%' }}>Specifications</th>
              <th>Stock</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((item) => (
              <tr key={item.id}>
                <td className="font-bold">{item.name}</td>
                <td className="desc-text">{item.description}</td>
                <td>
                  <span className={`status-badge ${item.quantity < 10 ? 'low' : 'ok'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td>{item.unit}</td>
                <td>₱{item.unit_price.toLocaleString()}</td>
                <td className="action-btns">
                  <button className="edit-action">Edit</button>
                  <button className="delete-action">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reusing your screenshot-perfect modal design */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Office Item</h2>
              <button className="close-x" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="material-form">
              <div className="form-group">
                <label>Item Name</label>
                <input type="text" value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Specifications / Description</label>
                <textarea value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3"></textarea>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input type="text" placeholder="reams, boxes" value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Price (₱)</label>
                <input type="number" value={formData.unit_price} 
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save-material">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeMat;