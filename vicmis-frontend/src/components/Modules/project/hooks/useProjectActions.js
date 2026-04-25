import { useState } from 'react';
import api from '@/api/axios';

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

  const uploadAndAdvance = async (
    nextStatus,
    fileKey,
    uploadFile,
    awardDetails = {},
    secondaryFile = null,
    secondaryFileKey = 'work_order_document',
  ) => {
    if (fileKey && !uploadFile && !secondaryFile) {
      return alert('Please select a file first to proceed!');
    }

    try {
      const fd = new FormData();
      fd.append('status', nextStatus);
      fd.append('_method', 'PATCH');

      if (fileKey && uploadFile)  fd.append(fileKey,          uploadFile);
      if (secondaryFile)          fd.append(secondaryFileKey, secondaryFile);
      if (awardDetails.name)      fd.append('subcontractor_name', awardDetails.name);
      if (awardDetails.amount)    fd.append('contract_amount',    awardDetails.amount);

      // ── DEBUG: log exactly what is being sent ──
      console.log('=== uploadAndAdvance DEBUG ===');
      console.log('nextStatus:', nextStatus);
      console.log('fileKey:', fileKey);
      console.log('uploadFile:', uploadFile);
      for (let [key, val] of fd.entries()) {
        console.log(`  FormData → ${key}:`, val);
      }
      console.log('==============================');

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
        status:          rejectTargetPhase,
        rejection_notes: rejectionReason,
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