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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestItems, setRequestItems]         = useState([]);   // items selected in the modal
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // ── Issues state (unchanged from original) ─────────────────────────────────
  const [issueLog, setIssueLog]           = useState({ problem: '', solution: '' });
  const [issuesHistory, setIssuesHistory] = useState([]);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // ── Item qty change ────────────────────────────────────────────────────────
  const handleRequestQtyChange = useCallback((item, value) => {
    setRequestItems(prev => {
      const exists = prev.find(i => i.description === item.description);
      if (!exists) return prev;
      return prev.map(i =>
        i.description === item.description
          ? { ...i, requestedQty: value }
          : i
      );
    });
  }, []);

  // ── Toggle item in/out of the request list ─────────────────────────────────
  const handleRequestToggle = useCallback((item, checked) => {
    setRequestItems(prev => {
      if (checked) {
        // Add with empty qty so user is forced to fill it
        return [...prev, { ...item, requestedQty: '' }];
      }
      return prev.filter(i => i.description !== item.description);
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
        items: validItems.map(i => ({
          description:   i.description,
          product_code:  i.product_code  || '',   // from finalBOQ if available
          unit:          i.unit          || '',
          requested_qty: parseFloat(i.requestedQty),
        })),
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

  // ── Issue submit (unchanged logic, just moved here for completeness) ────────
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
