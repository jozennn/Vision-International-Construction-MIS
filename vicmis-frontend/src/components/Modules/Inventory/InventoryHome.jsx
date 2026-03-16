import React from "react";
import "./css/InventoryHome.css";

// Check this line! It must be named InventoryHome, not Inventory
const InventoryHome = ({ onSelectCategory }) => {
  
  const inventoryModules = [
    { id: 'stock_list', title: 'Construction Materials', icon: '📦' },
    { id: 'suppliers', title: 'Incoming Shipment', icon: '🚚' },
    { id: 'delivery', title: 'Delivery Materials', icon: '🚚' },
  ];

  return (
    <div className="inv-grid">
      {inventoryModules.map((item) => (
        <div 
          key={item.id} 
          className="inv-card" 
          onClick={() => onSelectCategory(item.title)}
        >
          <div className="card-icon">{item.icon}</div>
          <div className="card-title">{item.title}</div>
        </div>
      ))}
    </div>
  );
};

export default InventoryHome; // Ensure this matches the name above