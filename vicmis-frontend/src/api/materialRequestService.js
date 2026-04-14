/**
 * materialRequestService.js
 *
 * Handles all API calls related to the engineer → logistics material request flow.
 * Base URL assumed: /api  (adjust to match your axios instance base URL)
 */
import api from '@/api/axios';

const materialRequestService = {
  /**
   * Engineer submits a material request from the PhaseCommandCenter.
   *
   * POST /inventory/material-requests
   *
   * Body: {
   *   project_id:        number,
   *   project_name:      string,
   *   location:          string,
   *   requested_by_id:   number,    // user.id
   *   requested_by_name: string,    // user.name
   *   engineer_name:     string,
   *   destination:       string,    // project site address
   *   items: [
   *     {
   *       description:   string,    // from finalBOQ
   *       product_code:  string,    // from finalBOQ / warehouse
   *       unit:          string,
   *       requested_qty: number,
   *     }
   *   ]
   * }
   *
   * Response: { id, status: 'pending', ...request }
   */
  create: (payload) => api.post('/inventory/material-requests', payload),

  /**
   * Logistics fetches all material requests (with enriched stock info).
   *
   * GET /inventory/material-requests
   * Query params: { status?, project_id?, page?, per_page? }
   *
   * Response: { data: [...requests], total, last_page, ... }
   * Each request.items[] includes:
   *   stock_status:  'ON STOCK' | 'LOW STOCK' | 'NO STOCK'
   *   current_stock: number
   *   (matched via product_code against warehouse_inventories table)
   */
  getAll: (params = {}) => api.get('/inventory/material-requests', { params }),

  /**
   * Get single request.
   *
   * GET /inventory/material-requests/:id
   */
  getOne: (id) => api.get(`/inventory/material-requests/${id}`),

  /**
   * Logistics dispatches the request → creates a delivery record.
   *
   * POST /inventory/material-requests/:id/dispatch
   *
   * Body: {
   *   trucking_service: string,
   *   driver_name:      string,
   *   destination:      string,
   *   date_of_delivery: string,   // 'YYYY-MM-DD'
   * }
   *
   * Server side:
   *   1. Updates material_request.status → 'dispatched'
   *   2. Creates one logistics_deliveries row per item in the request
   *      (linked via material_request_id FK)
   *   3. Returns the created delivery records
   */
  dispatch: (id, payload) => api.post(`/inventory/material-requests/${id}/dispatch`, payload),

  /**
   * Logistics triggers a reorder when stock is insufficient.
   *
   * POST /inventory/material-requests/:id/reorder
   *
   * Body: {
   *   quantity_needed: number,
   *   notes:           string | null,
   * }
   *
   * Server side:
   *   1. Updates material_request.status → 'reordering'
   *   2. Creates a procurement_reorders row (same as existing ReorderModal flow)
   *      linked to material_request_id
   *   3. Notifies Procurement (existing notification channel)
   */
  reorder: (id, payload) => api.post(`/inventory/material-requests/${id}/reorder`, payload),

  /**
   * Logistics rejects the request.
   *
   * PATCH /inventory/material-requests/:id/reject
   *
   * Body: { reason?: string }
   *
   * Server side: Updates material_request.status → 'rejected'
   * (Optionally sends notification back to the requesting engineer)
   */
  reject: (id, reason = null) => api.patch(`/inventory/material-requests/${id}/reject`, { reason }),
};

export default materialRequestService;
