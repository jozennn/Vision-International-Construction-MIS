import { useState, useRef } from 'react';
import api from '@/api/axios';

/**
 * useCommandCenter
 * Manages daily log submission, issue logging, and material requisition.
 */
export const useCommandCenter = (selectedProject) => {
  const fileInputRef  = useRef(null);
  const teamPhoto1Ref = useRef(null);
  const teamPhoto2Ref = useRef(null);

  const [dailyLog, setDailyLog] = useState({
    date: new Date().toISOString().split('T')[0],
    leadMan: '', totalArea: '', completion: '', notes: '',
    clientStartDate: '', clientEndDate: '',
  });
  const [installers,        setInstallers]        = useState([{ id: 1, name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
  const [teamPhoto1,        setTeamPhoto1]        = useState(null);
  const [teamPhoto2,        setTeamPhoto2]        = useState(null);
  const [uploadFile,        setUploadFile]        = useState(null);
  const [dailyLogsHistory,  setDailyLogsHistory]  = useState([]);
  const [isSubmittingLog,   setIsSubmittingLog]   = useState(false);
  const [showHistory,       setShowHistory]       = useState(true);
  const [historyFilter,     setHistoryFilter]     = useState('');

  const [issueLog,          setIssueLog]          = useState({ problem: '', solution: '' });
  const [issuesHistory,     setIssuesHistory]     = useState([]);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const [requestItems,            setRequestItems]            = useState([]);
  const [materialRequestsHistory, setMaterialRequestsHistory] = useState([]);
  const [showMaterialHistory,     setShowMaterialHistory]     = useState(true);
  const [materialHistoryFilter,   setMaterialHistoryFilter]   = useState('');
  const [showRequestModal,        setShowRequestModal]        = useState(false);
  const [submittingRequest,       setSubmittingRequest]       = useState(false); // 👈 Added

  const fetchCommandCenterData = async (projectId) => {
    try {
      const [logsRes, issuesRes, matReqRes] = await Promise.all([
        api.get(`/projects/${projectId}/daily-logs`),
        api.get(`/projects/${projectId}/issues`),
        api.get(`/projects/${projectId}/material-requests`),
      ]);
      setDailyLogsHistory(logsRes.data);
      setIssuesHistory(issuesRes.data);
      setMaterialRequestsHistory(matReqRes.data);
    } catch (err) { console.error('Command center fetch error:', err); }
  };

  const resetLogForm = () => {
    setUploadFile(null); setTeamPhoto1(null); setTeamPhoto2(null);
    if (fileInputRef.current)  fileInputRef.current.value  = '';
    if (teamPhoto1Ref.current) teamPhoto1Ref.current.value = '';
    if (teamPhoto2Ref.current) teamPhoto2Ref.current.value = '';
    setDailyLog(d => ({ ...d, completion: '', notes: '' }));
  };

  const handleSaveDailyLog = async (user) => {
    if (!dailyLog.date || !dailyLog.leadMan || !dailyLog.totalArea || !dailyLog.completion || !uploadFile)
      return alert('Please fill in all required fields and upload the main progress photo.');
    try {
      setIsSubmittingLog(true);
      const fd = new FormData();
      fd.append('log_date',               dailyLog.date);
      fd.append('lead_man',               dailyLog.leadMan);
      fd.append('total_area',             dailyLog.totalArea);
      fd.append('accomplishment_percent', dailyLog.completion);
      fd.append('remarks',                dailyLog.notes);
      fd.append('client_start_date',      dailyLog.clientStartDate);
      fd.append('client_end_date',        dailyLog.clientEndDate);
      fd.append('installers_data',        JSON.stringify(installers));
      fd.append('photo',                  uploadFile);
      if (teamPhoto1) fd.append('team_photo_1', teamPhoto1);
      if (teamPhoto2) fd.append('team_photo_2', teamPhoto2);
      await api.post(`/projects/${selectedProject.id}/daily-logs`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Daily report saved successfully!');
      fetchCommandCenterData(selectedProject.id);
      resetLogForm();
    } catch (err) {
      alert(`Error saving report: ${err.response?.data?.message || err.message}`);
    } finally { setIsSubmittingLog(false); }
  };

  const handleIssueSubmit = async () => {
    if (!issueLog.problem.trim()) return alert('Please enter the problem encountered.');
    try {
      setIsSubmittingIssue(true);
      await api.post(`/projects/${selectedProject.id}/issues`, issueLog);
      alert('Issue logged successfully!');
      setIssueLog({ problem: '', solution: '' });
      fetchCommandCenterData(selectedProject.id);
    } catch (err) { alert(`Failed to log issue: ${err.message}`); }
    finally { setIsSubmittingIssue(false); }
  };

  // 👇 FIXED: Use product_code instead of description for matching
  const handleRequestQtyChange = (item, qty) => {
    setRequestItems(prev => {
      const exists = prev.find(i => i.product_code === item.product_code);
      return exists 
        ? prev.map(i => i.product_code === item.product_code ? { ...i, requestedQty: qty } : i)
        : [...prev, { ...item, requestedQty: qty }];
    });
  };

  // 👇 FIXED: Use product_code instead of description for matching
  const handleRequestToggle = (item, checked) => {
    if (checked) {
      setRequestItems(p => 
        p.find(i => i.product_code === item.product_code) 
          ? p 
          : [...p, { ...item, requestedQty: 0 }]
      );
    } else {
      setRequestItems(p => p.filter(i => i.product_code !== item.product_code));
    }
  };

  // 👇 FIXED: Send correct payload format
  const submitMaterialRequest = async (user) => {
    const selected = requestItems.filter(i => parseFloat(i.requestedQty) > 0);
    if (!selected.length) {
        alert('Please select at least one item and enter a quantity > 0.');
        return;
    }
    
    setSubmittingRequest(true);
    try {
        const items = selected.map(item => {
            const requestedQty = parseFloat(item.requestedQty) || 0;
            const unitCost = parseFloat(item.unitCost) || 0;
            
            return {
                description:      item.description || item.name || item.product_code || 'Material Item',
                product_code:     item.product_code || '',
                product_category: item.product_category || '', // 👈 ADDED
                unit:             item.unit || 'pcs',
                requested_qty:    requestedQty,
                unit_cost:        unitCost,
                total_cost:       unitCost * requestedQty,
            };
        });

        const payload = {
            requested_by_name: user?.name || 'System User',
            engineer_name: selectedProject?.assigned_engineers || user?.name || '',
            destination: selectedProject?.location || '',
            items: items,
        };

        console.log('📤 Sending material request:', payload);

        await api.post(
            `/projects/${selectedProject.id}/material-requests`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        alert('✅ Material Requisition sent to Logistics! 🚀');
        setShowRequestModal(false);
        setRequestItems([]);
        fetchCommandCenterData(selectedProject.id);
    } catch (err) {
        console.error('Failed:', err.response?.data);
        const errors = err.response?.data?.errors;
        if (errors) {
            const msg = Object.entries(errors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n');
            alert(`❌ Failed:\n${msg}`);
        } else {
            alert(`❌ Failed: ${err.response?.data?.message || err.message}`);
        }
    } finally {
        setSubmittingRequest(false);
    }
};

  const updateInstaller = (idx, field, value) => {
    setInstallers(prev => { const a = [...prev]; a[idx][field] = value; return a; });
  };

  const addInstaller = () => setInstallers(p => [...p, { id: Date.now(), name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
  const removeInstaller = (idx) => setInstallers(p => p.filter((_, i) => i !== idx));

  return {
    fileInputRef, teamPhoto1Ref, teamPhoto2Ref,
    dailyLog, setDailyLog,
    installers, updateInstaller, addInstaller, removeInstaller,
    teamPhoto1, setTeamPhoto1, teamPhoto2, setTeamPhoto2,
    uploadFile, setUploadFile,
    dailyLogsHistory, isSubmittingLog, showHistory, setShowHistory, historyFilter, setHistoryFilter,
    issueLog, setIssueLog, issuesHistory, isSubmittingIssue,
    requestItems, materialRequestsHistory, showMaterialHistory, setShowMaterialHistory,
    materialHistoryFilter, setMaterialHistoryFilter, showRequestModal, setShowRequestModal,
    fetchCommandCenterData, handleSaveDailyLog, handleIssueSubmit,
    handleRequestQtyChange, handleRequestToggle, submitMaterialRequest,
    submittingRequest,  // 👈 Added
  };
};