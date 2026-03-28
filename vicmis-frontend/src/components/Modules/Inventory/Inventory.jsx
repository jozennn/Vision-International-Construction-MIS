import React, { useState, useEffect } from 'react';
import ConstructionMat  from './tab/ConstructionMat';
import IncomingShipment from './tab/IncomingShipment';
import DeliveryMat      from './tab/DeliveryMat';

/**
 * Inventory
 *
 * Props:
 *  activeSubItem      – the currently selected sub-menu id coming from Sidebar
 *  setActiveSubItem   – setter so Inventory can change the selection if needed
 */
const Inventory = ({ activeSubItem, setActiveSubItem }) => {
  const [arrivalData, setArrivalData] = useState(null);

  // When an incoming shipment is confirmed as arrived, switch to Construction Materials
  const handleStockArrival = (shipment) => {
    setArrivalData(shipment);
    if (setActiveSubItem) setActiveSubItem('Construction Materials');
  };

  const clearArrival = () => setArrivalData(null);

  // Default to Construction Materials if nothing is selected yet
  const view = activeSubItem ?? 'Construction Materials';

  return (
    <div className="inventory-wrapper">
      {view === 'Construction Materials' && (
        <ConstructionMat
          newArrivalData={arrivalData}
          clearArrivalData={clearArrival}
        />
      )}

      {view === 'Incoming Shipment' && (
        <IncomingShipment onStockArrival={handleStockArrival} />
      )}

      {view === 'Delivery Materials' && (
        <DeliveryMat />
      )}
    </div>
  );
};

export default Inventory;