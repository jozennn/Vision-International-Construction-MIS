/**
 * materialRequestService.js
 *
 * Handles all API calls related to the engineer → logistics material request flow.
 * Routes match api.php: /projects/{id}/material-requests and /material-requests/{id}
 */
import api from '@/api/axios';

const materialRequestService = {
  /**
   * Engineer submits a material request from the PhaseCommandCenter.
   *
   * POST /projects/{id}/material-requests
   *
   * Body: {
   *   requested_by_name: string,
   *   engineer_name:     string,
   *   destination:       string,
   *   items: [
   *     {
   *       description:   string,
   *       product_code:  string,
   *       unit:          string,
   *       requested_qty: number,
   *       unit_cost:     number,  // optional
   *       total_cost:    number,  // optional
   *     }
   *   ]
   * }
   */
  create: (projectId, payload) => 
    api.post(`/projects/${projectId}/material-requests`, payload),

  /**
   * Get all material requests for a specific project.
   *
   * GET /projects/{id}/material-requests
   */
  getProjectRequests: (projectId) => 
    api.get(`/projects/${projectId}/material-requests`),

  /**
   * Logistics fetches all pending requests across all projects.
   *
   * GET /material-requests/pending
   */
  getPending: (params = {}) => 
    api.get('/material-requests/pending', { params }),

  /**
   * Logistics updates a request status (dispatch, reorder, reject).
   *
   * PATCH /material-requests/{id}
   *
   * Body: { action: 'dispatch' | 'reorder' | 'reject', ...other fields }
   */
  updateStatus: (id, payload) => 
    api.patch(`/material-requests/${id}`, payload),
};

export default materialRequestService;