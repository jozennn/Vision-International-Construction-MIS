// src/hooks/useMaterialRequest.js

import { useState, useCallback } from 'react';
import materialRequestService from '@/api/materialRequestService';

const useMaterialRequest = ({ project, user, boqData }) => {
  const [showRequestModal, setShowRequestModal]     = useState(false);
  const [requestItems, setRequestItems]             = useState([]);
  const [submittingRequest, setSubmittingRequest]   = useState(false);
  const [issueLog, setIssueLog]                     = useState({ problem: '', solution: '' });
  const [issuesHistory, setIssuesHistory]           = useState([]);
  const [isSubmittingIssue, setIsSubmittingIssue]   = useState(false);

  const handleRequestQtyChange = useCallback((item, value) => {
    setRequestItems(prev =>
      prev.map(i =>
        i.product_code === item.product_code
          ? { ...i, requestedQty: value }
          : i
      )
    );
  }, []);

  const handleRequestToggle = useCallback((item, checked) => {
    setRequestItems(prev => {
      if (checked) {
        return [...prev, { ...item, requestedQty: '' }];
      }
      return prev.filter(i => i.product_code !== item.product_code);
    });
  }, []);

  const submitMaterialRequest = useCallback(async (currentUser) => {
    const validItems = requestItems.filter(
      i => i.requestedQty && parseFloat(i.requestedQty) > 0
    );

    if (validItems.length === 0) {
      alert('Please select at least one item and specify a quantity.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const payload = {
        requested_by_name: currentUser?.name || currentUser?.username || 'Unknown',
        engineer_name: project?.assigned_engineers || currentUser?.name || '',
        destination: project?.location || project?.address || '',
        items: validItems.map(i => {
          const unitCost = parseFloat(i.unitCost) || 0;
          const requestedQty = parseFloat(i.requestedQty) || 0;
          const totalCost = unitCost * requestedQty;
          
          return {
            description:   i.description || i.product_code || '—',
            product_code:  i.product_code || '',
            unit:          i.unit || 'pcs',
            requested_qty: requestedQty,
            unit_cost:     unitCost,      // 👈 Now sent to backend
            total_cost:    totalCost,     // 👈 Now sent to backend
          };
        }),
      };

      console.log('[MaterialRequest] Sending payload:', payload);

      await materialRequestService.create({
        project_id: project.id,
        project_name: project.project_name,
        location: project.location || '',
        ...payload,
      });

      // Calculate total for success message
      const totalValue = payload.items.reduce((sum, item) => sum + item.total_cost, 0);
      const valueStr = totalValue > 0 
        ? `\nTotal value: ₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
        : '';

      setRequestItems([]);
      setShowRequestModal(false);
      alert(`✅ Material request sent to Logistics!${valueStr}`);
    } catch (err) {
      console.error('[MaterialRequest] Error:', err.response?.data);
      const errorMsg = err.response?.data?.message 
        || err.response?.data?.errors
          ? JSON.stringify(err.response?.data?.errors)
          : 'Failed to send material request.';
      alert(`❌ ${errorMsg}`);
      throw err;
    } finally {
      setSubmittingRequest(false);
    }
  }, [requestItems, project]);

  const handleIssueSubmit = useCallback(async () => {
    if (!issueLog.problem?.trim()) {
      alert('Please describe the problem.');
      return;
    }
    setIsSubmittingIssue(true);
    try {
      setIssuesHistory(prev => [
        { id: Date.now(), ...issueLog },
        ...prev,
      ]);
      setIssueLog({ problem: '', solution: '' });
    } catch (err) {
      alert('Failed to log issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  }, [issueLog]);

  return {
    showRequestModal,
    setShowRequestModal,
    requestItems,
    handleRequestQtyChange,
    handleRequestToggle,
    submitMaterialRequest,
    submittingRequest,
    issueLog,
    setIssueLog,
    issuesHistory,
    isSubmittingIssue,
    handleIssueSubmit,
  };
};

export default useMaterialRequest;