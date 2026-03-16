import React, { useState } from 'react';
import InventoryHome from './InventoryHome';
import ConstructionMat from './tab/ConstructionMat';
import IncomingShipment from './tab/IncomingShipment';
import DeliveryMat from './tab/DeliveryMat';
import MaterialRequest from './tab/MaterialRequest';

const Inventory = () => {
  const [currentView, setCurrentView] = useState('home');
  
  // New state to hold data for the transfer
  const [arrivalData, setArrivalData] = useState(null);

  // Logic to handle the transfer and view switch
  const handleStockArrival = (shipment) => {
    setArrivalData(shipment); 
    setCurrentView('Construction Materials'); 
  };

  return (
    <div className="inventory-wrapper">
      {currentView === 'home' && (
        <InventoryHome onSelectCategory={setCurrentView} />
      )}
      
      {currentView === 'Construction Materials' && (
        <ConstructionMat 
          onBack={() => setCurrentView('home')} 
          newArrivalData={arrivalData} 
          clearArrivalData={() => setArrivalData(null)}
        />
      )}
      
      {currentView === 'Incoming Shipment' && (
        <IncomingShipment 
          onBack={() => setCurrentView('home')} 
          onStockArrival={handleStockArrival} 
        />
      )}
      
      {currentView === 'Delivery Materials' && (
        <DeliveryMat onBack={() => setCurrentView('home')} />
      )}
      
    </div>
  );
};

export default Inventory;