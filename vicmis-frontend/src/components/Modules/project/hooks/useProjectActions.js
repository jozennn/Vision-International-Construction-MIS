import { useState } from 'react';
import api from '@/api/axios';

/**
 * useProjectActions
 * Provides all project status-transition actions.
 * Call refreshProject after each action to update the UI.
 */
export const useProjectActions = (selectedProject, refreshProject) => {
  const [goBackLoading, setGoBackLoading] = useState(false);

  const advanceStatus = async (nextStatus) => {
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, { status: nextStatus });
      alert(`Project successfully advanced to: ${nextStatus}`);
      await refreshProject();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  /**
   * uploadAndAdvance
   *
   * Supports two modes:
   *
   * 1. Single-file (original behaviour):
   *    onUploadAdvance(nextStatus, fileKey, file)
   *
   * 2. Dual-file — P.O + Work Order together:
   *    onUploadAdvance(nextStatus, 'po_document', poFile, {}, workOrderFile)
   *    Pass the Work Order file as the 5th argument; the hook appends it automatically.
   */
  const uploadAndAdvance = async (
    nextStatus,
    fileKey,
    uploadFile,
    awardDetails = {},
    secondaryFile = null,          // ← new: optional second file
    secondaryFileKey = 'work_order_document', // ← new: key for the second file
  ) => {
    // At least one file must be provided when a fileKey is given
    if (fileKey && !uploadFile && !secondaryFile) {
      return alert('Please select a file first to proceed!');
    }

    try {
      const fd = new FormData();
      fd.append('status', nextStatus);
      fd.append('_method', 'PATCH');

      if (fileKey && uploadFile)           fd.append(fileKey,           uploadFile);
      if (secondaryFile)                   fd.append(secondaryFileKey,  secondaryFile);
      if (awardDetails.name)               fd.append('subcontractor_name', awardDetails.name);
      if (awardDetails.amount)             fd.append('contract_amount',    awardDetails.amount);

      await api.post(`/projects/${selectedProject.id}/status`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert(`Status advanced to: ${nextStatus}`);
      await refreshProject();
    } catch (err) {
      alert(`Upload Failed: ${err.message}`);
    }
  };

  const executeRejection = async (rejectTargetPhase, rejectionReason) => {
    if (!rejectionReason.trim()) return alert('Please provide a specific reason for rejection.');
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, {
        status:           rejectTargetPhase,
        rejection_notes:  rejectionReason,
      });
      alert(`Project rejected and sent back to: ${rejectTargetPhase}`);
      await refreshProject();
    } catch (err) {
      alert(`Failed to reject project: ${err.message}`);
    }
  };

  const handleGoBackPhase = async (targetPhase) => {
    if (!window.confirm(
      `Go back to "${targetPhase}"?\n\nThis will reopen that phase for editing.`
    )) return;
    setGoBackLoading(true);
    try {
      await api.patch(`/projects/${selectedProject.id}/status`, {
        status:          targetPhase,
        rejection_notes: null,
      });
      await refreshProject();
    } catch (err) {
      alert(`Failed to go back: ${err.message}`);
    } finally {
      setGoBackLoading(false);
    }
  };

  return { advanceStatus, uploadAndAdvance, executeRejection, handleGoBackPhase, goBackLoading };
};