// Add these methods to your existing inventoryService.js (or api service file)
// Adjust the axios instance import to match your project's setup.

import axios from '@/api/axios'; // adjust path if needed

const warehouseInventoryService = {

  getMeta() {
    return axios.get('/warehouse-inventory/meta');
  },

  getAll(params = {}) {
    // params: { type: 'main'|'consumable'|'', category: string, availability: string, search: string }
    return axios.get('/warehouse-inventory', { params });
  },

  getOne(id) {
    return axios.get(`/warehouse-inventory/${id}`);
  },

  create(data) {
    return axios.post('/warehouse-inventory', data);
  },

  update(id, data) {
    return axios.put(`/warehouse-inventory/${id}`, data);
  },

  remove(id) {
    return axios.delete(`/warehouse-inventory/${id}`);
  },
};

export default warehouseInventoryService;
