import React, { useState, useEffect } from 'react';
import inventoryService from '@/api/inventoryService'; 
import { X, Loader2, PackageCheck } from 'lucide-react';
import '../css/Construction.css';

const ConstructionMat = ({ onBack, newArrivalData, clearArrivalData }) => {
  const [materials, setMaterials] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false); 
  
  const [currentId, setCurrentId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Track which project from the shipment is currently selected
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);

  const [categories] = useState([
    "Antibac roll vinyl",
    "Homogenous vinyl",
    "Heterogenous vinyl",
    "LVT (Luxury Vinyl Tile)",
    "Wall Cladding",
    "Adhesives/Fixatives"
  ]);

  const [formData, setFormData] = useState({
    product_category: "Antibac roll vinyl", 
    product_code: '', 
    item_name: '', 
    production_date: '', 
    quantity: '', 
    condition: 'Good',
    is_consumable: false 
  });

  // Handle data transfer from Incoming Shipment
  useEffect(() => {
    if (newArrivalData && newArrivalData.projects?.length > 0) {
      setIsNewArrival(true);
      setIsModalOpen(true);
      
      // Load specific project data based on the dropdown selection
      const activeProj = newArrivalData.projects[selectedProjectIndex];
      
      setFormData({
        product_category: activeProj.product_category || "Antibac roll vinyl",
        product_code: newArrivalData.shipment_number || '', 
        item_name: activeProj.project_name || '',
        production_date: new Date().toISOString().split('T')[0], 
        quantity: activeProj.quantity || '',
        condition: 'Good',
        is_consumable: false
      });
    }
  }, [newArrivalData, selectedProjectIndex]);

  const fetchMaterials = async () => {
    try {
        setLoading(true);
        const res = await inventoryService.getConstruction();
        setMaterials(res.data);
    } catch (err) {
        console.error("Error loading inventory:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
        if (isEditing) {
            await inventoryService.updateMaterial(currentId, formData);
        } else {
            await inventoryService.stockIn(formData);
        }
        alert(isNewArrival ? "Arrival Stock successfully registered to Warehouse!" : "Product Saved!");
        closeModal();
        fetchMaterials();
    } catch (err) {
        alert("Failed to save data.");
    } finally {
        setSaveLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setIsNewArrival(false);
    setSelectedProjectIndex(0); // Reset project selection
    
    if (clearArrivalData) clearArrivalData();

    setFormData({ 
        product_category: "Antibac roll vinyl", 
        product_code: '', item_name: '', production_date: '', 
        quantity: '', condition: 'Good', is_consumable: false 
    });
  };

  return (
    <div className="construction-container">
      <div className="table-header-box">
        <div className="left-side">
          <button className="back-nav-btn" onClick={onBack}>← Back</button>
          <h2>Warehouse Inventory</h2>
        </div>
        <button className="add-material-btn" onClick={() => setIsModalOpen(true)}>+ Add Product</button>
      </div>

      <div className="table-wrapper">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Product Category</th>
              <th>Product Code</th>
              <th>Item Name</th>
              <th>Production Date</th>
              <th>Quantity</th>
              <th>Condition</th>
              <th>Consumables</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center">Loading Inventory...</td></tr>
            ) : materials.map((item) => (
              <tr key={item.id}>
                <td><span className="category-badge">{item.product_category}</span></td>
                <td className="font-mono">{item.product_code}</td>
                <td className="font-bold">{item.item_name}</td>
                <td>{item.production_date}</td>
                <td>{item.quantity}</td>
                <td>
                  <span className={`condition-tag ${item.condition?.toLowerCase()}`}>
                    {item.condition}
                  </span>
                </td>
                <td>
                  <span className={item.is_consumable ? "consumable-pill" : "main-product-pill"}>
                    {item.is_consumable ? "YES" : "NO"}
                  </span>
                </td>
                <td className="action-btns">
                  <button className="edit-action" onClick={() => {
                    setIsEditing(true);
                    setCurrentId(item.id);
                    setFormData(item);
                    setIsModalOpen(true);
                  }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isNewArrival && <PackageCheck size={24} color="#2563eb" />}
                {isNewArrival ? 'New Arrival Stock' : (isEditing ? 'Update Product' : 'Register New Product')}
              </h2>
              <button className="close-x" onClick={closeModal}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="material-form">
              
              {/* PROJECT SELECTOR (Only shows if shipment has multiple projects) */}
              {isNewArrival && newArrivalData.projects?.length > 1 && (
                <div className="form-group" style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px dashed #2563eb', marginBottom: '20px' }}>
                   <label style={{ fontWeight: 'bold', color: '#1e40af' }}>Shipment Content Picker</label>
                   <select 
                    className="form-select" 
                    value={selectedProjectIndex}
                    onChange={(e) => setSelectedProjectIndex(parseInt(e.target.value))}
                   >
                     {newArrivalData.projects.map((p, idx) => (
                       <option key={idx} value={idx}>{p.project_name} — {p.quantity} units</option>
                     ))}
                   </select>
                   <p style={{ fontSize: '12px', marginTop: '5px', color: '#60a5fa' }}>
                     Pick the specific project items you want to save to inventory now.
                   </p>
                </div>
              )}

              <div className="form-group">
                <label>Product Category</label>
                <select 
                  className="form-select"
                  value={formData.product_category} 
                  onChange={(e) => setFormData({...formData, product_category: e.target.value})}
                >
                  {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Product Code</label>
                <input type="text" required value={formData.product_code} 
                  onChange={(e) => setFormData({...formData, product_code: e.target.value})} 
                  placeholder="e.g. 182062" />
              </div>

              <div className="form-group">
                <label>Item Name</label>
                <input type="text" required value={formData.item_name} 
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})} 
                  placeholder="e.g. Homogenous vinyl" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Production Date</label>
                  <input type="date" required value={formData.production_date} 
                    onChange={(e) => setFormData({...formData, production_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" required value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Condition</label>
                <select 
                  className="form-select"
                  value={formData.condition} 
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                >
                  <option value="Good">Good</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={formData.is_consumable} 
                    onChange={(e) => setFormData({...formData, is_consumable: e.target.checked})} 
                  />
                  This is a Consumable Material
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-save-material" disabled={saveLoading}>
                  {saveLoading ? <Loader2 className="animate-spin" size={16}/> : (isNewArrival ? 'Save New Stock' : 'Save Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionMat;