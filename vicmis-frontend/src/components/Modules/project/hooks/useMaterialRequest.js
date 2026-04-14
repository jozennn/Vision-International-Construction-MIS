/**
 * useMaterialRequest.js
 *
 * Hook that manages the full material request state for PhaseCommandCenter.
 * Drop-in replacement — all existing cc spread props are preserved,
 * plus new `submittingRequest` flag.
 *
 * Usage in your parent component / page that renders PhaseCommandCenter:
 *
 *   const cc = useMaterialRequest({ project, user, boqData });
 *   <PhaseCommandCenter cc={cc} ... />
 */
import { useState, useCallback } from 'react';
import materialRequestService from '@/api/materialRequestService';

const useMaterialRequest = ({ project, user, boqData }) => {
  // ── Request modal state ────────────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal]     = useState(false);
  const [requestItems, setRequestItems]             = useState([]);
  const [submittingRequest, setSubmittingRequest]   = useState(false);

  // ── Issues state ───────────────────────────────────────────────────────────
  const [issueLog, setIssueLog]                     = useState({ problem: '', solution: '' });
  const [issuesHistory, setIssuesHistory]           = useState([]);
  const [isSubmittingIssue, setIsSubmittingIssue]   = useState(false);

  // ── Item qty change — keyed by product_code ────────────────────────────────
  const handleRequestQtyChange = useCallback((item, value) => {
    setRequestItems(prev =>
      prev.map(i =>
        i.product_code === item.product_code
          ? { ...i, requestedQty: value }
          : i
      )
    );
  }, []);

  // ── Toggle item in/out — keyed by product_code ─────────────────────────────
  const handleRequestToggle = useCallback((item, checked) => {
    setRequestItems(prev => {
      if (checked) {
        // Add with empty qty so user is forced to fill it
        return [...prev, { ...item, requestedQty: '' }];
      }
      return prev.filter(i => i.product_code !== item.product_code);
    });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
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
      await materialRequestService.create({
        project_id:        project.id,
        project_name:      project.project_name,
        location:          project.location || '',
        destination:       project.location || project.address || '',
        requested_by_id:   currentUser?.id,
        requested_by_name: currentUser?.name || currentUser?.username || '',
        engineer_name:     project.engineer_name || currentUser?.name || '',
        items: validItems.map(i => {
          const unitCost     = parseFloat(i.unitCost) || 0;
          const requestedQty = parseFloat(i.requestedQty);
          return {
            description:   i.description || i.product_code || '',
            product_code:  i.product_code  || '',
            unit:          i.unit          || '',
            requested_qty: requestedQty,
            unit_cost:     unitCost,
            total_cost:    unitCost * requestedQty,
          };
        }),
      });

      // Reset selection after successful submit
      setRequestItems([]);
      setShowRequestModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send material request. Please try again.');
      throw err; // re-throw so caller can decide whether to show banner
    } finally {
      setSubmittingRequest(false);
    }
  }, [requestItems, project]);

  // ── Issue submit ───────────────────────────────────────────────────────────
  const handleIssueSubmit = useCallback(async () => {
    if (!issueLog.problem?.trim()) {
      alert('Please describe the problem.');
      return;
    }
    setIsSubmittingIssue(true);
    try {
      // Replace with your actual issues API call
      // await projectIssueService.create({ project_id: project.id, ...issueLog });
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
    // Request modal
    showRequestModal,
    setShowRequestModal,
    requestItems,
    handleRequestQtyChange,
    handleRequestToggle,
    submitMaterialRequest,
    submittingRequest,

    // Issues
    issueLog,
    setIssueLog,
    issuesHistory,
    isSubmittingIssue,
    handleIssueSubmit,
  };
};

export default useMaterialRequest;