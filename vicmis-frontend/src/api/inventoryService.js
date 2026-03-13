import api from '@/api/axios';

const inventoryService = {

    
    // Also add this to fix your "Receive" button 404 error
  receiveShipment: (id) => api.patch(`/inventory/shipments/${id}/receive`),
  getConstruction: () => api.get('/inventory/construction'),
  updateMaterial: (id, data) => api.put(`/inventory/materials/${id}`, data),
  deleteMaterial: (id) => api.delete(`/inventory/materials/${id}`),
  getShipments: () => api.get('/inventory/shipments'),
  getPendingActions: () => api.get('/inventory/pending'),
  approveAction: (type, id) => api.post(`/inventory/approve/${type}/${id}`),
  rejectAction: (type, id) => api.post(`/inventory/reject/${type}/${id}`),
  // in your inventoryService.js
    stockIn: (data) => api.post('/inventory/stock-in', data),
    stockOut: (data) => api.post('/inventory/stock-out', data),
  getAlerts: () => api.get('/inventory/alerts'),
  // Construction
  getConstruction: () => api.get('/inventory/construction'),
  addConstruction: (data) => api.post('/inventory/construction', data),

  // Office
  getOffice: () => api.get('/inventory/office'),
  addOffice: (data) => api.post('/inventory/office', data),

  // Incoming (Procurement)
  getIncoming: () => api.get('/inventory/incoming'),
  addIncoming: (data) => api.post('/inventory/incoming', data),

  // Delivery
  getDelivery: () => api.get('/inventory/delivery'),
  addDelivery: (data) => api.post('/inventory/delivery', data),

  // Requests
  getRequests: () => api.get('/inventory/requests'),
  addRequests: (data) => api.post('/inventory/requests', data),

  // Generic Delete
  deleteItem: (type, id) => api.delete(`/inventory/${type}/${id}`),
};

export default inventoryService;