// src/hooks/useMaterialRequest.js

import { useState, useCallback } from 'react';
import api from '@/api/axios';

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
        const items = validItems.map(i => {
            const unitCost = parseFloat(i.unitCost) || 0;
            const requestedQty = parseFloat(i.requestedQty) || 0;
            const totalCost = unitCost * requestedQty;
            
            return {
                description:      i.description || i.name || i.product_code || 'Material Item',
                product_code:     i.product_code || '',
                product_category: i.product_category || '', // 👈 ADDED
                unit:             i.unit || 'pcs',
                requested_qty:    requestedQty,
                unit_cost:        unitCost,
                total_cost:       totalCost,
            };
        });

        const payload = {
            requested_by_name: currentUser?.name || user?.name || 'System User',
            engineer_name: project?.assigned_engineers || currentUser?.name || '',
            destination: project?.location || '',
            items: items,
        };

        console.log('[MaterialRequest] Sending payload:', payload);

        const response = await api.post(
            `/projects/${project.id}/material-requests`,
            payload,
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                } 
            }
        );

        console.log('[MaterialRequest] Success:', response.data);

        const totalValue = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
        const valueStr = totalValue > 0 
            ? `\nTotal value: ₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
            : '';

        setRequestItems([]);
        setShowRequestModal(false);
        alert(`✅ Material request sent to Logistics!${valueStr}`);
    } catch (err) {
        console.error('[MaterialRequest] Error:', err);
        console.error('[MaterialRequest] Response data:', err.response?.data);
        
        if (err.response?.data?.errors) {
            const errorMessages = Object.entries(err.response.data.errors)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('\n');
            alert(`❌ Validation errors:\n${errorMessages}`);
        } else {
            const errorMsg = err.response?.data?.message || 'Failed to send material request.';
            alert(`❌ ${errorMsg}`);
        }
        throw err;
    } finally {
        setSubmittingRequest(false);
    }
}, [requestItems, project, user]);

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