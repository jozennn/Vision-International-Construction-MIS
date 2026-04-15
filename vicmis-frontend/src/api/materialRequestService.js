/**
 * materialRequestService.js
 *
 * Handles all API calls related to the engineer → logistics material request flow.
 * Routes match api.php: /projects/{id}/material-requests and /inventory/material-requests/{id}
 */
import api from '@/api/axios';

const materialRequestService = {
  /**
   * Engineer submits a material request from the PhaseCommandCenter.
   *
   * POST /projects/{id}/material-requests
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
   * GET /inventory/material-requests (or /material-requests/pending - both work)
   */
  getPending: (params = {}) => 
    api.get('/inventory/material-requests', { params }),

  /**
   * Logistics updates a request status (dispatch, reorder, reject).
   *
   * POST /inventory/material-requests/{id}/dispatch
   * POST /inventory/material-requests/{id}/reorder
   * PATCH /inventory/material-requests/{id}/reject
   */
  dispatch: (id, payload) => 
    api.post(`/inventory/material-requests/${id}/dispatch`, payload),

  reorder: (id, payload) => 
    api.post(`/inventory/material-requests/${id}/reorder`, payload),

  reject: (id, reason) => 
    api.patch(`/inventory/material-requests/${id}/reject`, { reason }),
};

export default materialRequestService;