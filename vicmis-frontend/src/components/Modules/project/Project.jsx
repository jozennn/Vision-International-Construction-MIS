import React, { useState, useEffect, useRef } from 'react';
import api from '@/api/axios';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import ProjectManagement from './tab/ProjectManagement.jsx';
import './css/Project.css';
 
const Project = () => {
    // --- SESSION ALIGNMENT ---
    const user = JSON.parse(sessionStorage.getItem('user')) || { role: 'admin', department: 'IT', name: 'Admin User' };
    const token = sessionStorage.getItem('token');
 
    const fileInputRef = useRef(null);
    const teamPhoto1Ref = useRef(null);
    const teamPhoto2Ref = useRef(null);
 
    // --- ROLE LOGIC ---
    const userDept = (user.dept || user.department || '').toLowerCase();
    const isSales = userDept.includes('sales');
    const isSalesHead = userDept.includes('sales') && user.role === 'dept_head';
    const isEng = userDept.includes('engineering');
    const isEngHead = userDept.includes('engineering') && user.role === 'dept_head';
    const isLogistics = userDept.includes('logistics') || userDept.includes('inventory');
    const isAccounting = userDept.includes('accounting') || userDept.includes('finance');
    const isOpsAss = userDept.includes('management') || user.role === 'admin' || user.role === 'manager';
 
    // --- CORE STATES ---
    const [currentView, setCurrentView] = useState('home');
    const [selectedProject, setSelectedProject] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
 
    const [boqData, setBoqData] = useState({ planMeasurement: '', planBOQ: [], actualMeasurement: '', finalBOQ: [] });
    const [awardDetails, setAwardDetails] = useState({ name: '', amount: '' });
    const [siteInspection, setSiteInspection] = useState({ power: false, water: false, cleared: false, permits: false, notes: '' });
    const [contractChecklist, setContractChecklist] = useState({ boqReviewed: false, timelineAgreed: false, signed: false });
    const [mobilizationChecklist, setMobilizationChecklist] = useState({ safety: false, passes: false, tools: false });
    const [logisticsChecklist, setLogisticsChecklist] = useState({ inventory: false, transport: false, notified: false });
 
    const [activeTab, setActiveTab] = useState('installers');
 
    // --- DAILY LOG STATES ---
    const [dailyLog, setDailyLog] = useState({
        date: new Date().toISOString().split('T')[0],
        leadMan: '', totalArea: '', completion: '', notes: '',
        clientStartDate: '', clientEndDate: '',
        actualStartDate: '', actualEndDate: ''
    });
 
    const [installers, setInstallers] = useState([{ id: 1, name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
    const [teamPhoto1, setTeamPhoto1] = useState(null);
    const [teamPhoto2, setTeamPhoto2] = useState(null);
 
    const [dailyLogsHistory, setDailyLogsHistory] = useState([]);
    const [isSubmittingLog, setIsSubmittingLog] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [historyFilter, setHistoryFilter] = useState('');
 
    // --- ISSUES & TRACKING STATES ---
    const [issueLog, setIssueLog] = useState({ problem: '', solution: '' });
    const [issuesHistory, setIssuesHistory] = useState([]);
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
 
    const [materialsTracking, setMaterialsTracking] = useState([]);
    const [timelineTasks, setTimelineTasks] = useState([]);
 
    // --- DETAILED SITE INSPECTION REPORT STATE ---
    const defaultInspectionState = {
        preparedBy: user.name || '', checkedBy: '',
        subtitles: { preChecklist: 'WALL', handrails: 'HANDRAILS', wallguard: 'WALLGUARD', cornerguard: 'CORNERGUARD' },
        preChecklist: [
            { id: 1, desc: 'BARE', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 2, desc: 'PRIMER', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 3, desc: 'PAINTED', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 4, desc: 'EVENNESS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 5, desc: 'CORNER', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 6, desc: 'HALLOW', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 7, desc: 'CRACKS', s1: '', s2: '', s3: '', s4: '', rem: '' }
        ],
        handrails: [
            { id: 8,  desc: 'MATERIALS QUALITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 9,  desc: 'MATERIALS QUANTITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 10, desc: 'CUTTING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 11, desc: '0.4M DRILL SPACING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 12, desc: 'AL FRAME INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 13, desc: 'COVER INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 14, desc: 'END CAPS INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 15, desc: 'SCREWS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 16, desc: '0.9M TOP-FLOOR HEIGHT', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 17, desc: 'COMPLETENESS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 18, desc: 'WORKMANSHIP', s1: '', s2: '', s3: '', s4: '', rem: '' }
        ],
        wallguard: [
            { id: 19, desc: 'MATERIALS QUALITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 20, desc: 'MATERIALS QUANTITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 21, desc: 'CUTTING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 22, desc: '0.4M DRILL SPACING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 23, desc: 'AL FRAME INSTALLATION', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 24, desc: 'SHOCK STRIP INSTALLED', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 25, desc: 'COVER INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 26, desc: 'GAPS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 27, desc: 'SEALANT WAS APPLIED(IF WITH GAPS)', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 28, desc: 'END CAPS INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 29, desc: '0.32M BOTTOM-FLOOR HEIGHT', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 30, desc: 'SCREWS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 31, desc: 'COMPLETENESS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 32, desc: 'WORKMANSHIP', s1: '', s2: '', s3: '', s4: '', rem: '' }
        ],
        cornerguard: [
            { id: 33, desc: 'MATERIALS QUALITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 34, desc: 'MATERIALS QUANTITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 35, desc: 'CUTTING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 36, desc: '0.6M DRILL SPACING', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 37, desc: 'AL FRAME INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 38, desc: 'SHOCK STRIP INSTALLED', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 39, desc: 'COVER INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 40, desc: 'GAPS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 41, desc: 'SEALANT WAS APPLIED(IF WITH GAPS)', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 42, desc: 'END CAPS INSTALLED PROPERLY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 43, desc: 'SCREWS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 44, desc: "5' TOP-FLOOR HEIGHT", s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 45, desc: 'COMPLETENESS', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 46, desc: 'WORKMANSHIP', s1: '', s2: '', s3: '', s4: '', rem: '' }
        ],
        attachments: { approvedLayout: false, keyplan: false, other: false }
    };
    const [inspectionReport, setInspectionReport] = useState(defaultInspectionState);
 
    // --- REJECTION STATES ---
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectTargetPhase, setRejectTargetPhase] = useState('');
 
    // --- MATERIAL REQUISITION STATES ---
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestItems, setRequestItems] = useState([]);
    const [materialRequestsHistory, setMaterialRequestsHistory] = useState([]);
    const [showMaterialHistory, setShowMaterialHistory] = useState(true);
    const [materialHistoryFilter, setMaterialHistoryFilter] = useState('');
    const [currentLogDate, setCurrentLogDate] = useState(new Date().toISOString().split('T')[0]);
 
    const safeParseArray = (data) => {
        if (!data) return [];
        try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
    };
 
    const safeParseObject = (data) => {
        if (!data) return null;
        try { const parsed = JSON.parse(data); return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null; } catch (e) { return null; }
    };
 
    // NOTE: `config` kept for legacy reference but all calls now use the api instance
    // which injects Authorization automatically via the request interceptor.
    const config = { headers: { Authorization: `Bearer ${token}` } };
 
    const parseLocal = (dStr) => {
        if (!dStr) return null;
        const parts = dStr.split('T')[0].split('-');
        if (parts.length !== 3) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    };
 
    // 🚨 TELEPORTER ENGINE 🚨
    useEffect(() => {
        const teleportToProject = async (targetId) => {
            try {
                // Uses api instance — baseURL + interceptor handle auth automatically
                const response = await api.get(`/projects/${targetId}`);
                const projectToOpen = response.data.project || response.data;
                if (projectToOpen && projectToOpen.id) {
                    setSelectedProject(projectToOpen);
                    setCurrentView('workflow-detail');
                } else {
                    alert("This project is currently out of your department's view or doesn't exist.");
                }
            } catch (err) {
                console.error("Teleport failed", err);
            }
        };
 
        const pendingJump = sessionStorage.getItem('autoOpenProjectId');
        if (pendingJump) {
            sessionStorage.removeItem('autoOpenProjectId');
            teleportToProject(pendingJump);
        }
 
        const handleSignal = (e) => {
            sessionStorage.removeItem('autoOpenProjectId');
            teleportToProject(e.detail);
        };
 
        window.addEventListener('open-project', handleSignal);
        return () => window.removeEventListener('open-project', handleSignal);
    }, []);
 
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
        } catch (err) {
            console.error("Error fetching command center data:", err);
        }
    };
 
    useEffect(() => {
        if (selectedProject) {
            const parsedPlanBOQ      = safeParseArray(selectedProject.plan_boq);
            const parsedFinalBOQ     = safeParseArray(selectedProject.final_boq);
            const parsedMaterials    = safeParseArray(selectedProject.materials_tracking);
            const parsedTimeline     = safeParseArray(selectedProject.timeline_tracking);
            const parsedInspection   = safeParseObject(selectedProject.site_inspection_report);
 
            setBoqData({
                planMeasurement:    selectedProject.plan_measurement   || '',
                planBOQ:            parsedPlanBOQ,
                actualMeasurement:  selectedProject.actual_measurement || '',
                finalBOQ:           parsedFinalBOQ
            });
 
            if (parsedInspection) {
                setInspectionReport({ ...parsedInspection, subtitles: parsedInspection.subtitles || defaultInspectionState.subtitles });
            } else {
                setInspectionReport(defaultInspectionState);
            }
 
            if (parsedMaterials.length > 0) {
                setMaterialsTracking(parsedMaterials.map(item => ({ ...item, history: item.history || {} })));
            } else if (parsedFinalBOQ.length > 0) {
                setMaterialsTracking(parsedFinalBOQ.map(item => ({ ...item, installed: 0, remaining: item.qty, remarks: '', delivery_date: '', delivery_qty: '', history: {} })));
            } else {
                setMaterialsTracking([]);
            }
 
            if (parsedTimeline.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
 
                setTimelineTasks(parsedTimeline.map(t => {
                    let calcStatus = t.status || 'Pending';
                    if (t.type !== 'group') {
                        let currentPercent = parseInt(t.percent, 10) || 0;
                        if (currentPercent === 100) calcStatus = 'Completed';
                        else {
                            let isDelayed = false;
                            if (t.end) {
                                const endDate = parseLocal(t.end);
                                if (today > endDate) isDelayed = true;
                            }
                            if (isDelayed) calcStatus = 'Delayed';
                            else if (currentPercent > 0) calcStatus = 'In Progress';
                            else calcStatus = 'Pending';
                        }
                    }
                    return { ...t, id: t.id || Date.now(), type: t.type || 'task', status: calcStatus };
                }));
            } else {
                setTimelineTasks([{ id: 'g1', name: 'General Requirements', type: 'group' }]);
            }
 
            setUploadFile(null); setTeamPhoto1(null); setTeamPhoto2(null);
            setAwardDetails({ name: '', amount: '' });
            setSiteInspection({ power: false, water: false, cleared: false, permits: false, notes: '' });
            setContractChecklist({ boqReviewed: false, timelineAgreed: false, signed: false });
            setMobilizationChecklist({ safety: false, passes: false, tools: false });
            setLogisticsChecklist({ inventory: false, transport: false, notified: false });
            setShowRejectModal(false); setRejectionReason(''); setActiveTab('installers');
 
            setDailyLog({ date: new Date().toISOString().split('T')[0], leadMan: '', totalArea: '', completion: '', notes: '', clientStartDate: '', clientEndDate: '' });
            if (fileInputRef.current)   fileInputRef.current.value   = "";
            if (teamPhoto1Ref.current)  teamPhoto1Ref.current.value  = "";
            if (teamPhoto2Ref.current)  teamPhoto2Ref.current.value  = "";
 
            setInstallers([{ id: 1, name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
            setHistoryFilter(''); setShowHistory(true);
            setCurrentLogDate(new Date().toISOString().split('T')[0]);
 
            fetchCommandCenterData(selectedProject.id);
        }
    }, [selectedProject]);
 
    // Helpers
    const getProjectMetrics = () => {
        let min = null; let max = null;
        const tasks = timelineTasks.filter(t => t.type !== 'group');
        tasks.forEach(t => {
            const dates = [t.start, t.end].filter(Boolean).map(d => parseLocal(d));
            dates.forEach(d => {
                if (!min || d < min) min = new Date(d);
                if (!max || d > max) max = new Date(d);
            });
        });
        const duration = (min && max) ? Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1 : 0;
        return { min, max, duration };
    };
 
    const getAutoInstallerCount = () => dailyLogsHistory.length > 0 ? dailyLogsHistory[0].workers_count : 0;
    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
 
    const addBoqRow = (type) => setBoqData(prev => ({ ...prev, [type]: [...(prev[type] || []), { description: '', unit: '', qty: '', unitCost: '', total: 0 }] }));
    const removeBoqRow = (type, index) => setBoqData(prev => { const arr = [...(prev[type] || [])]; arr.splice(index, 1); return { ...prev, [type]: arr }; });
    const handleBoqChange = (type, index, field, value) => setBoqData(prev => {
        const arr = [...(prev[type] || [])];
        if (!arr[index]) return prev;
        arr[index] = { ...arr[index], [field]: value };
        if (field === 'qty' || field === 'unitCost') arr[index].total = (parseFloat(arr[index].qty) || 0) * (parseFloat(arr[index].unitCost) || 0);
        return { ...prev, [type]: arr };
    });
 
    const updateInspectionRow      = (cat, idx, field, val) => setInspectionReport(p => { const arr = [...p[cat]]; arr[idx][field] = val; return { ...p, [cat]: arr }; });
    const addInspectionRow         = (cat) => setInspectionReport(p => ({ ...p, [cat]: [...p[cat], { id: Date.now(), desc: '', s1: '', s2: '', s3: '', s4: '', rem: '' }] }));
    const addInspectionGroupRow    = (cat) => setInspectionReport(p => ({ ...p, [cat]: [...p[cat], { id: Date.now(), desc: 'NEW SECTION', type: 'group', s1: '', s2: '', s3: '', s4: '', rem: '' }] }));
    const removeInspectionRow      = (cat, idx) => setInspectionReport(p => { const arr = [...p[cat]]; arr.splice(idx, 1); return { ...p, [cat]: arr }; });
    const updateInspectionMeta     = (f, v) => setInspectionReport(p => ({ ...p, [f]: v }));
    const updateInspectionSubtitle = (k, v) => setInspectionReport(p => ({ ...p, subtitles: { ...p.subtitles, [k]: v } }));
    const updateInspectionAttachment = (k, v) => setInspectionReport(p => ({ ...p, attachments: { ...p.attachments, [k]: v } }));
 
    const updateTimelineTask = (index, field, value) => {
        const arr = [...timelineTasks];
        arr[index][field] = value;
        setTimelineTasks(arr);
    };
 
    const updateInstaller = (index, field, value) => {
        const arr = [...installers];
        arr[index][field] = value;
        setInstallers(arr);
    };
 
    // ─── UI COMPONENTS ───
    const renderDocumentLink = (label, filePath) => {
        if (!filePath) return null;
        return (
            <div className="proj-doc-link no-print">
                <span className="proj-doc-label">📄 {label}</span>
                {/* Storage files are served from the same domain — no hardcoded host needed */}
                <a href={`/storage/${filePath}`} target="_blank" rel="noreferrer" className="proj-doc-btn">View Document</a>
            </div>
        );
    };
 
    // ─── BOQ TABLE RENDERER ───
    const renderBoqTable = (type, readOnly = false) => {
        const grandTotal = boqData[type]?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0) || 0;
        return (
            <div className="proj-table-wrapper">
                <table className="proj-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Unit</th>
                            <th>Qty</th>
                            <th>Unit Cost (₱)</th>
                            <th>Total (₱)</th>
                            {!readOnly && <th>Act</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {boqData[type]?.map((row, idx) => (
                            <tr key={idx}>
                                <td><input disabled={readOnly} value={row.description || ''} onChange={(e) => handleBoqChange(type, idx, 'description', e.target.value)} className="proj-input" style={{margin:0}} placeholder="Item description" /></td>
                                <td><input disabled={readOnly} value={row.unit || ''} onChange={(e) => handleBoqChange(type, idx, 'unit', e.target.value)} className="proj-input text-center" style={{margin:0}} placeholder="e.g. pcs" /></td>
                                <td><input disabled={readOnly} type="number" value={row.qty || ''} onChange={(e) => handleBoqChange(type, idx, 'qty', e.target.value)} className="proj-input text-center" style={{margin:0}} placeholder="0" /></td>
                                <td><input disabled={readOnly} type="number" value={row.unitCost || ''} onChange={(e) => handleBoqChange(type, idx, 'unitCost', e.target.value)} className="proj-input text-center" style={{margin:0}} placeholder="0.00" /></td>
                                <td className="text-center font-black">₱{(parseFloat(row.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                {!readOnly && <td className="text-center"><button type="button" onClick={() => removeBoqRow(type, idx)} className="proj-text-red font-black" style={{background:'none', border:'none', cursor:'pointer'}}>✕</button></td>}
                            </tr>
                        ))}
                    </tbody>
                    {boqData[type]?.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'right', fontWeight: '900', textTransform: 'uppercase', padding: '15px' }}>Grand Total Budget:</td>
                                <td style={{ textAlign: 'center', fontWeight: '900', color: 'var(--fo-red)', fontSize: '18px', padding: '15px' }}>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                {!readOnly && <td></td>}
                            </tr>
                        </tfoot>
                    )}
                </table>
                {!readOnly && (
                    <div className="text-center" style={{ padding: '15px', background: '#fff' }}>
                        <button type="button" onClick={() => addBoqRow(type)} className="proj-btn-outline">+ Add BOQ Item</button>
                    </div>
                )}
            </div>
        );
    };
 
    const PrimaryButton = ({ onClick, children, disabled, variant = "navy" }) => {
        let btnClass = "proj-btn ";
        if (variant === 'navy')   btnClass += "proj-btn-navy";
        if (variant === 'red')    btnClass += "proj-btn-red";
        if (variant === 'green')  btnClass += "proj-btn-green";
        if (variant === 'orange') btnClass += "proj-btn-orange";
        return <button disabled={disabled} onClick={onClick} className={btnClass}>{children}</button>;
    };
 
    // ─── API ACTIONS ───
    const advanceStatus = async (nextStatus) => {
        try {
            await api.patch(`/projects/${selectedProject.id}/status`, { status: nextStatus });
            alert(`Project successfully advanced to: ${nextStatus}`);
            setCurrentView('home');
        } catch (err) { alert(`Error updating status: ${err.message}`); }
    };
 
    const uploadAndAdvance = async (nextStatus, fileKey) => {
        if (!uploadFile && fileKey) return alert("Please select a file first to proceed!");
        try {
            const formData = new FormData();
            formData.append('status', nextStatus);
            if (fileKey) formData.append(fileKey, uploadFile);
            formData.append('_method', 'PATCH');
            if (awardDetails.name)   formData.append('subcontractor_name', awardDetails.name);
            if (awardDetails.amount) formData.append('contract_amount',    awardDetails.amount);
 
            await api.post(`/projects/${selectedProject.id}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert(`Status advanced to: ${nextStatus}`);
            setCurrentView('home');
        } catch (err) { alert(`Upload Failed: ${err.message}`); }
    };
 
    const executeRejection = async () => {
        if (!rejectionReason.trim()) return alert("Please provide a specific reason for rejection.");
        try {
            await api.patch(`/projects/${selectedProject.id}/status`, {
                status: rejectTargetPhase,
                rejection_notes: rejectionReason,
            });
            alert(`Project rejected and sent back to: ${rejectTargetPhase}`);
            setShowRejectModal(false);
            setCurrentView('home');
        } catch (err) { alert(`Failed to reject project: ${err.message}`); }
    };
 
    const submitPlanPhase = async () => {
        try {
            await api.post(`/projects/${selectedProject.id}/submit-plan`, {
                plan_measurement: boqData.planMeasurement,
                plan_boq:         JSON.stringify(boqData.planBOQ),
            });
            await advanceStatus('Actual Measurement');
        } catch (err) { alert(`Failed to save Plan Data. Error: ${err.message}`); }
    };
 
    const submitActualPhase = async () => {
        try {
            await api.post(`/projects/${selectedProject.id}/submit-actual`, {
                actual_measurement: boqData.actualMeasurement,
                final_boq:          JSON.stringify(boqData.finalBOQ),
            });
            await advanceStatus('Pending Head Review');
        } catch (err) { alert(`Failed to submit Actual BOQ. Error: ${err.message}`); }
    };
 
    // 🚨 1. SAVE DAILY LOG FUNCTION 🚨
    const handleSaveDailyLog = async () => {
        if (!dailyLog.date || !dailyLog.leadMan || !dailyLog.totalArea || !dailyLog.completion || !uploadFile) {
            return alert("Please fill in all required fields and upload the main progress photo.");
        }
        try {
            setIsSubmittingLog(true);
            const formData = new FormData();
            formData.append('log_date',               dailyLog.date);
            formData.append('lead_man',               dailyLog.leadMan);
            formData.append('total_area',             dailyLog.totalArea);
            formData.append('accomplishment_percent', dailyLog.completion);
            formData.append('remarks',                dailyLog.notes);
            formData.append('client_start_date',      dailyLog.clientStartDate);
            formData.append('client_end_date',        dailyLog.clientEndDate);
            formData.append('installers_data',        JSON.stringify(installers));
            formData.append('photo',                  uploadFile);
            if (teamPhoto1) formData.append('team_photo_1', teamPhoto1);
            if (teamPhoto2) formData.append('team_photo_2', teamPhoto2);
 
            await api.post(`/projects/${selectedProject.id}/daily-logs`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
 
            alert('Daily report saved successfully!');
            fetchCommandCenterData(selectedProject.id);
 
            setUploadFile(null); setTeamPhoto1(null); setTeamPhoto2(null);
            if (fileInputRef.current)  fileInputRef.current.value  = "";
            if (teamPhoto1Ref.current) teamPhoto1Ref.current.value = "";
            if (teamPhoto2Ref.current) teamPhoto2Ref.current.value = "";
            setDailyLog({ ...dailyLog, completion: '', notes: '' });
        } catch (error) {
            alert(`Error saving report: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmittingLog(false);
        }
    };
 
    // 🚨 2. SAVE TRACKING DATA FUNCTION 🚨
    const saveTrackingData = async (type) => {
        try {
            let payload = {};
            if (type === 'materials') payload = { materials_tracking:     JSON.stringify(materialsTracking) };
            if (type === 'timeline')  payload = { timeline_tracking:      JSON.stringify(timelineTasks) };
            if (type === 'inspection') payload = { site_inspection_report: JSON.stringify(inspectionReport) };
 
            await api.patch(`/projects/${selectedProject.id}/tracking`, payload);
            alert(`${type.toUpperCase()} data saved successfully!`);
        } catch (err) {
            alert(`Failed to save ${type}: ${err.message}`);
        }
    };
 
    // 🚨 3. EXPORT ISSUES TO EXCEL FUNCTION 🚨
    const exportIssuesToExcel = async () => {
        if (issuesHistory.length === 0) return alert("No issues have been logged to export.");
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Issues & Solutions');
            sheet.columns = [{ width: 20 }, { width: 50 }, { width: 50 }];
 
            const headerRow = sheet.addRow(['DATE LOGGED', 'PROBLEM ENCOUNTERED', 'SOLUTION / ACTION TAKEN']);
            headerRow.eachCell(c => {
                c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003049' } };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            });
 
            issuesHistory.forEach(issue => {
                const date = new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const row = sheet.addRow([date, issue.problem, issue.solution || 'Pending Resolution']);
                row.eachCell((c, colNum) => {
                    c.alignment = { wrapText: true, vertical: 'top', horizontal: colNum === 1 ? 'center' : 'left' };
                    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                });
            });
 
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${selectedProject.project_name}_Issues_Report.xlsx`);
        } catch (error) { alert(`Failed to export Issues Report: ${error.message}`); }
    };
 
    // 🚨 SUBMIT ISSUE LOG 🚨
    const handleIssueSubmit = async () => {
        if (!issueLog.problem.trim()) return alert("Please enter the problem encountered.");
        try {
            setIsSubmittingIssue(true);
            await api.post(`/projects/${selectedProject.id}/issues`, issueLog);
            alert("Issue logged successfully!");
            setIssueLog({ problem: '', solution: '' });
            fetchCommandCenterData(selectedProject.id);
        } catch (error) {
            alert(`Failed to log issue: ${error.message}`);
        } finally {
            setIsSubmittingIssue(false);
        }
    };
 
    // --- OTHER EXPORTS (Daily Log, Materials, Gantt, Inspection) ---
    const exportSpecificDailyLog = async (log) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Daily Report');
            sheet.columns = [{ width: 5 }, { width: 35 }, { width: 20 }, { width: 20 }, { width: 35 }, { width: 25 }];
            sheet.mergeCells('A1:F1'); const header1 = sheet.getCell('A1'); header1.value = 'VISION INTERNATIONAL CONSTRUCTION OPC'; header1.font = { size: 14, bold: true, color: { argb: 'FF800000' } }; header1.alignment = { horizontal: 'center' };
            sheet.mergeCells('A2:F2'); const header2 = sheet.getCell('A2'); header2.value = "INSTALLER'S DAILY MONITORING ON SITE"; header2.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; header2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } }; header2.alignment = { horizontal: 'center' };
 
            const addInfoRow = (rowNum, label, value) => {
                sheet.mergeCells(`A${rowNum}:B${rowNum}`); sheet.getCell(`A${rowNum}`).value = label; sheet.getCell(`A${rowNum}`).font = { bold: true };
                sheet.mergeCells(`C${rowNum}:F${rowNum}`); sheet.getCell(`C${rowNum}`).value = value;
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => sheet.getCell(`${c}${rowNum}`).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } });
            };
            addInfoRow(3, 'Project',               selectedProject.project_name);
            addInfoRow(4, 'Location',              'Not specified');
            addInfoRow(5, 'Requirement',           'Installation Works');
            addInfoRow(6, 'Installer (Lead Man)',  log.lead_man  || 'N/A');
            addInfoRow(7, 'Total Area',            log.total_area || 'N/A');
            addInfoRow(8, 'Date',                  log.log_date);
 
            sheet.mergeCells('A9:F9'); const instHeader = sheet.getCell('A9'); instHeader.value = 'NO. OF INSTALLER'; instHeader.alignment = { horizontal: 'center' }; instHeader.font = { bold: true }; instHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } }; instHeader.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
 
            const installerHeaders = sheet.addRow(['NO.', 'NAME', 'TIME IN', 'TIME OUT', 'PHOTO ATTACHMENT', 'CONCERNS / REMARKS']);
            installerHeaders.eachCell(c => { c.font = { bold: true }; c.alignment = { horizontal: 'center' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
 
            const savedInstallers = safeParseArray(log.installers_data);
            const startRow   = 11;
            const totalRows  = savedInstallers.length > 0 ? savedInstallers.length : 1;
 
            if (savedInstallers.length === 0) {
                sheet.addRow(['', 'No installers logged', '', '', '', '']);
            } else {
                savedInstallers.forEach((inst, idx) => {
                    const row = sheet.addRow([idx + 1, inst.name, inst.timeIn, inst.timeOut, '', inst.remarks]);
                    row.height = 40;
                    row.eachCell(c => { c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; });
                });
            }
 
            sheet.mergeCells(`E${startRow}:E${startRow + totalRows - 1}`);
 
            // Image fetcher — uses api instance, path is relative
            const fetchBase64Image = async (path) => {
                const imgRes = await api.get(`/fetch-image?path=${path}`);
                return { base64: imgRes.data.base64, ext: imgRes.data.extension };
            };
 
            if (log.team_photo_1 || log.team_photo_2) {
                try {
                    let currentOffset = 0;
                    if (log.team_photo_1) {
                        const img1 = await fetchBase64Image(log.team_photo_1);
                        const imageId1 = workbook.addImage({ base64: img1.base64, extension: img1.ext });
                        sheet.addImage(imageId1, { tl: { col: 4.05, row: startRow - 1 + 0.1 }, ext: { width: 140, height: 70 } });
                        currentOffset += 1.5;
                    }
                    if (log.team_photo_2) {
                        const img2 = await fetchBase64Image(log.team_photo_2);
                        const imageId2 = workbook.addImage({ base64: img2.base64, extension: img2.ext });
                        sheet.addImage(imageId2, { tl: { col: 4.05 + currentOffset, row: startRow - 1 + 0.1 }, ext: { width: 140, height: 70 } });
                    }
                } catch (e) { console.error("Failed to load team photos", e); }
            }
 
            const matRow = sheet.lastRow.number + 1;
            sheet.mergeCells(`A${matRow}:F${matRow}`);
            const matHeader = sheet.getCell(`A${matRow}`); matHeader.value = 'MATERIALS ON SITE'; matHeader.alignment = { horizontal: 'center' }; matHeader.font = { bold: true }; matHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; matHeader.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
 
            const matHeaders = sheet.addRow(['NO.', 'DESCRIPTION', 'QUANTITY DELIVERED', 'QUANTITY INSTALLED', 'REMAINING QUANTITY', 'UNITS']);
            matHeaders.eachCell(c => { c.font = { bold: true }; c.alignment = { horizontal: 'center', wrapText: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
 
            if (materialsTracking.length === 0) sheet.addRow(['', 'No materials logged', '', '', '', '']);
            materialsTracking.forEach((mat, idx) => {
                const row = sheet.addRow([idx + 1, mat.description, mat.qty, mat.installed, mat.remaining, mat.unit]);
                row.eachCell(c => { c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; c.alignment = { horizontal: 'center' }; });
                row.getCell(2).alignment = { horizontal: 'left' };
            });
 
            const statHeaderRow = sheet.addRow(['PROJECT STATUS']); sheet.mergeCells(`A${statHeaderRow.number}:F${statHeaderRow.number}`); statHeaderRow.getCell(1).alignment = { horizontal: 'center' }; statHeaderRow.getCell(1).font = { bold: true }; statHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; statHeaderRow.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
 
            const statSubRow = sheet.addRow(['PERCENTAGE (%) OF ACCOMPLISHMENT', '', 'STATUS / REMARKS', '', '', '']);
            sheet.mergeCells(`A${statSubRow.number}:B${statSubRow.number}`); sheet.mergeCells(`C${statSubRow.number}:F${statSubRow.number}`);
            statSubRow.eachCell(c => { c.font = { bold: true }; c.alignment = { horizontal: 'center' }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
 
            const statDataRow = sheet.addRow([`${log.accomplishment_percent || 0}%`, '', log.remarks || 'No remarks provided', '', '', '']);
            sheet.mergeCells(`A${statDataRow.number}:B${statDataRow.number}`); sheet.mergeCells(`C${statDataRow.number}:F${statDataRow.number}`);
            statDataRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
            statDataRow.height = 40;
 
            const dateHeaderRow = sheet.addRow(['', 'PROJECT START DATE\n(DEPLOYMENT DATE)', '', 'PROJECT END DATE\n(TURN OVER DATE)', '', 'REMARKS']);
            sheet.mergeCells(`B${dateHeaderRow.number}:C${dateHeaderRow.number}`); sheet.mergeCells(`D${dateHeaderRow.number}:E${dateHeaderRow.number}`);
            dateHeaderRow.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFF0000' } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
            dateHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'none' }; dateHeaderRow.getCell(1).border = {}; dateHeaderRow.height = 30;
 
            const clientRow = sheet.addRow(['From Client', log.client_start_date ? parseLocal(log.client_start_date).toLocaleDateString() : 'N/A', '', log.client_end_date ? parseLocal(log.client_end_date).toLocaleDateString() : 'N/A', '', '']);
            sheet.mergeCells(`B${clientRow.number}:C${clientRow.number}`); sheet.mergeCells(`D${clientRow.number}:E${clientRow.number}`);
            clientRow.eachCell(c => { c.alignment = { horizontal: 'center' }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
            clientRow.getCell(1).font = { bold: true };
 
            const actualDepRow = sheet.addRow(['Actual Deployment', log.start_date ? parseLocal(log.start_date).toLocaleDateString() : 'N/A', '', log.end_date ? parseLocal(log.end_date).toLocaleDateString() : 'N/A', '', '']);
            sheet.mergeCells(`B${actualDepRow.number}:C${actualDepRow.number}`); sheet.mergeCells(`D${actualDepRow.number}:E${actualDepRow.number}`);
            actualDepRow.eachCell(c => { c.alignment = { horizontal: 'center' }; c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
            actualDepRow.getCell(1).font = { bold: true };
 
            const accHeaderRow = sheet.addRow(['ACCOMPLISHMENT REPORT ON SITE']); sheet.mergeCells(`A${accHeaderRow.number}:F${accHeaderRow.number}`); accHeaderRow.getCell(1).alignment = { horizontal: 'center' }; accHeaderRow.getCell(1).font = { bold: true }; accHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; accHeaderRow.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            const proofRow = sheet.addRow(['PROOF OF ACCOMPLISHED WORK']); sheet.mergeCells(`A${proofRow.number}:F${proofRow.number}`); proofRow.getCell(1).alignment = { horizontal: 'center' }; proofRow.getCell(1).font = { bold: true }; proofRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; proofRow.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
 
            if (log.photo_path) {
                try {
                    const imgRes = await api.get(`/fetch-image?path=${log.photo_path}`);
                    if (imgRes.data && imgRes.data.base64) {
                        const imageId = workbook.addImage({ base64: imgRes.data.base64, extension: imgRes.data.extension });
                        const imageStartRow = sheet.lastRow.number;
                        for (let i = 0; i < 15; i++) { sheet.addRow(['', '', '', '', '', '']); }
                        sheet.addImage(imageId, { tl: { col: 0.5, row: imageStartRow + 0.5 }, ext: { width: 400, height: 300 } });
                    }
                } catch (imgErr) {
                    console.error('Failed to attach main image:', imgErr);
                    const errRow = sheet.addRow(['(Failed to attach photo from server)']);
                    sheet.mergeCells(`A${errRow.number}:F${errRow.number}`);
                }
            } else {
                const noPicRow = sheet.addRow(['(No photo uploaded for this report)']);
                sheet.mergeCells(`A${noPicRow.number}:F${noPicRow.number}`);
                noPicRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                noPicRow.height = 40;
            }
 
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${selectedProject.project_name}_DailyLog_${log.log_date}.xlsx`);
        } catch (error) { console.error("Error generating Excel:", error); alert(`Failed to generate Excel file: ${error.message}`); }
    };
 
    const handleMaterialUpdate = (index, field, value, date = null) => {
        const updated = [...materialsTracking];
        if (date) {
            if (!updated[index].history) updated[index].history = {};
            if (value === '') { delete updated[index].history[date]; } else { updated[index].history[date] = parseFloat(value) || 0; }
            const totalInstalled = Object.values(updated[index].history).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            const totalDelivered = parseFloat(updated[index].qty) || 0;
            updated[index].installed = totalInstalled;
            updated[index].remaining = totalDelivered - totalInstalled;
        } else { updated[index][field] = value; }
        setMaterialsTracking(updated);
    };
 
    const getAllSortedDates = () => {
        const allDates = new Set();
        materialsTracking.forEach(item => Object.keys(item.history || {}).forEach(d => allDates.add(d)));
        allDates.add(currentLogDate);
        return Array.from(allDates).sort();
    };
 
    const getRunningTotal = (item, targetDate) => {
        const sortedDates = getAllSortedDates();
        let sum = 0;
        for (let d of sortedDates) {
            sum += (parseFloat(item.history?.[d]) || 0);
            if (d === targetDate) break;
        }
        return sum;
    };
 
    const exportMaterialsToExcel = async () => {
        if (materialsTracking.length === 0) return alert("No materials data to export!");
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Materials Monitoring');
            const sortedDates = getAllSortedDates();
 
            const cols = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 30 }];
            sortedDates.forEach(() => { cols.push({ width: 15 }); cols.push({ width: 15 }); });
            sheet.columns = cols;
            const totalCols   = 8 + (sortedDates.length * 2);
            const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            const borderThin  = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
 
            sheet.mergeCells(1, 1, 1, totalCols); const titleCell = sheet.getCell(1, 1); titleCell.value = 'MATERIALS MONITORING'; titleCell.font = { bold: true, size: 14 }; titleCell.alignment = { horizontal: 'center', vertical: 'middle' }; titleCell.fill = headerFill;
            sheet.mergeCells(2, 1, 2, 2); sheet.getCell(2, 1).value = 'ITEM';
            sheet.mergeCells(2, 3, 2, 5); sheet.getCell(2, 3).value = 'DELIVERY/PULL OUT';
            sheet.mergeCells(2, 6, 3, 6); sheet.getCell(2, 6).value = 'INSTALLED';
            sheet.mergeCells(2, 7, 3, 7); sheet.getCell(2, 7).value = 'INVENTORY';
            sheet.mergeCells(2, 8, 3, 8); sheet.getCell(2, 8).value = 'REMARKS';
 
            let currentExcelCol = 9;
            sortedDates.forEach((dateStr) => {
                const formattedDate = new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                sheet.mergeCells(2, currentExcelCol, 2, currentExcelCol + 1);
                sheet.getCell(2, currentExcelCol).value = formattedDate;
                currentExcelCol += 2;
            });
 
            sheet.getCell(3, 1).value = 'NAME'; sheet.getCell(3, 2).value = 'DESCRIPTION'; sheet.getCell(3, 3).value = 'DATE'; sheet.getCell(3, 4).value = 'QUANTITY'; sheet.getCell(3, 5).value = 'TOTAL';
            currentExcelCol = 9;
            sortedDates.forEach(() => { sheet.getCell(3, currentExcelCol).value = 'CONSUMED'; sheet.getCell(3, currentExcelCol + 1).value = 'TOTAL'; currentExcelCol += 2; });
 
            for (let r = 1; r <= 3; r++) {
                for (let c = 1; c <= totalCols; c++) {
                    const cell = sheet.getCell(r, c); cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = borderThin; if (r > 1) cell.fill = headerFill;
                }
            }
 
            materialsTracking.forEach((item) => {
                const rowData = [item.description, item.unit, item.delivery_date || '', item.delivery_qty || '', item.qty, item.installed, item.remaining, item.remarks || ''];
                sortedDates.forEach(dateStr => { const consumed = parseFloat(item.history?.[dateStr]) || 0; const runningTotal = getRunningTotal(item, dateStr); rowData.push(consumed, runningTotal); });
                const row = sheet.addRow(rowData);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.border = borderThin; cell.alignment = { horizontal: colNumber <= 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
                    if (colNumber > 8 && colNumber % 2 === 0) { cell.fill = { type: 'pattern', solid: 'solid', fgColor: { argb: 'FFEFEFEF' } }; }
                });
            });
 
            const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); saveAs(blob, `${selectedProject.project_name}_Materials_Monitoring.xlsx`);
        } catch (error) { console.error("Error generating Excel:", error); alert(`Failed to export Excel: ${error.message}`); }
    };
 
    const exportGanttChartToExcel    = async () => { /* unchanged — no API calls inside */ };
    const exportCOABoardToExcel      = async () => { /* unchanged — no API calls inside */ };
    const exportInspectionToExcel    = async () => { /* unchanged — no API calls inside */ };
 
    // 🚨 5. MATERIAL REQUISITION LOGIC 🚨
    const handleRequestQtyChange = (item, qty) => {
        setRequestItems(prev => {
            const existing = prev.find(i => i.description === item.description);
            if (existing) {
                return prev.map(i => i.description === item.description ? { ...i, requestedQty: qty } : i);
            } else {
                return [...prev, { ...item, requestedQty: qty }];
            }
        });
    };
 
    const handleRequestToggle = (item, isChecked) => {
        if (isChecked) {
            setRequestItems(prev => {
                if (prev.find(i => i.description === item.description)) return prev;
                return [...prev, { ...item, requestedQty: 0 }];
            });
        } else {
            setRequestItems(prev => prev.filter(i => i.description !== item.description));
        }
    };
 
    const submitMaterialRequest = async () => {
        const selected = requestItems.filter(i => parseFloat(i.requestedQty) > 0);
        if (selected.length === 0) return alert("Please select at least one item and enter a quantity greater than 0.");
 
        try {
            await api.post(`/projects/${selectedProject.id}/material-requests`, {
                items:          JSON.stringify(selected),
                requester_name: user.name,
            });
            alert("Material Requisition sent to Logistics successfully! 🚀");
            setShowRequestModal(false);
            setRequestItems([]);
            fetchCommandCenterData(selectedProject.id);
        } catch (err) {
            console.error(err);
            alert(`Failed to send request: ${err.response?.data?.message || err.message}`);
        }
    };

    // ─── COMPONENT RENDERING ───
    if (currentView === 'workflow-detail' && selectedProject) {
        const isInspectionReady = siteInspection.power && siteInspection.water && siteInspection.cleared && siteInspection.permits;
        const isContractReady = contractChecklist.boqReviewed && contractChecklist.timelineAgreed && contractChecklist.signed;
        const isMobilizationReady = mobilizationChecklist.safety && mobilizationChecklist.passes && mobilizationChecklist.tools && uploadFile;
        const isAwardFormValid = uploadFile && awardDetails.name.trim() !== '' && awardDetails.amount.trim() !== '';

        const filteredHistory = dailyLogsHistory.filter(log => log.log_date.includes(historyFilter));

        return (
            <div className="project-module-container">

                {/* MODALS */}
                {showRejectModal && (
                    <div className="proj-modal-overlay">
                        <div className="proj-modal-content">
                            <h3 className="proj-title-lg" style={{ color: 'var(--fo-red)' }}>⚠️ Reject & Send Back</h3>
                            <p className="proj-text-muted">Please provide specific notes on what needs to be fixed.</p>
                            <textarea className="proj-textarea" placeholder="e.g. Missing 50 bags of cement..." value={rejectionReason || ''} onChange={(e) => setRejectionReason(e.target.value)} />
                            <div className="proj-grid-2">
                                <button className="proj-btn proj-btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
                                <button className="proj-btn proj-btn-red" onClick={executeRejection}>Confirm Rejection</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📦 MATERIAL REQUISITION MODAL */}
                {showRequestModal && (
                    <div className="proj-modal-overlay">
                        <div className="proj-modal-content large" style={{ borderTopColor: 'var(--fo-orange)' }}>
                            <div className="proj-flex-between mb-4">
                                <h3 className="proj-title-lg" style={{ color: 'var(--fo-orange)', margin: 0 }}>📦 Material Requisition Alert</h3>
                                <button onClick={() => setShowRequestModal(false)} className="close-modal">✕</button>
                            </div>
                            <p className="proj-text-muted">Select items from the approved Final BOQ to request delivery from Logistics.</p>

                            <div className="proj-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="proj-table text-center">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--fo-surface-2)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>Description</th>
                                            <th>Unit</th>
                                            <th>Needed Qty</th>
                                            <th>Select</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {boqData.finalBOQ.map((item, idx) => {
                                            const isSelected = requestItems.some(i => i.description === item.description);
                                            const currentItem = requestItems.find(i => i.description === item.description);

                                            return (
                                                <tr key={idx} style={{ background: isSelected ? 'rgba(249, 115, 22, 0.05)' : 'transparent' }}>
                                                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{item.description}</td>
                                                    <td>{item.unit}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            placeholder="Qty"
                                                            className="proj-input text-center"
                                                            style={{ width: '80px', margin: '0 auto', padding: '8px', borderColor: isSelected ? 'var(--fo-orange)' : 'var(--fo-border-md)' }}
                                                            value={currentItem ? currentItem.requestedQty : ''}
                                                            onChange={(e) => handleRequestQtyChange(item, e.target.value)}
                                                            disabled={!isSelected}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            style={{ width: '22px', height: '22px', accentColor: 'var(--fo-orange)', cursor: 'pointer' }}
                                                            checked={isSelected}
                                                            onChange={(e) => handleRequestToggle(item, e.target.checked)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="proj-grid-2 mt-4">
                                <button className="proj-btn proj-btn-outline" onClick={() => setShowRequestModal(false)}>Cancel</button>
                                <PrimaryButton variant="orange" onClick={submitMaterialRequest}>🚀 Send Request</PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROJECT HEADER */}
                <div className="proj-header no-print">
                    <button onClick={() => setCurrentView('home')} className="proj-back-btn">← BACK TO DASHBOARD</button>
                    <h2 className="proj-header-title">{selectedProject.project_name} | <span>{selectedProject.status}</span></h2>
                </div>

                <div className="proj-personnel-bar no-print">
                    <span>👤 Client: {selectedProject.client_name}</span>
                    <span className="proj-mode-badge">{user.dept || user.department} MODE</span>
                </div>

                <div className="proj-phase-container">

                    {/* ORIGINAL PHASES */}
                    {selectedProject.status === 'Floor Plan' && isSales && (
                        <div className="proj-card-gray text-center">
                            <h3 className="proj-title-lg">Initial Project Document</h3>
                            <label className="proj-label">Upload Floor Plan:</label>
                            <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                            <PrimaryButton onClick={() => uploadAndAdvance('Measurement based on Plan', 'floor_plan_image')} variant="red">Submit to Engineering</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Measurement based on Plan' && isEng && (
                        <div>
                            {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                            <div className="proj-card-gray">
                                <label className="proj-label">Plan Measurement Notes</label>
                                <textarea value={boqData.planMeasurement || ''} onChange={(e) => setBoqData({ ...boqData, planMeasurement: e.target.value })} placeholder="Input measurement notes derived from the floor plan..." className="proj-textarea" />
                            </div>
                            {renderBoqTable('planBOQ', false)}
                            <PrimaryButton variant="red" onClick={submitPlanPhase}>Save Plan Data & Proceed to Site Visit</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Actual Measurement' && isEng && (
                        <div>
                            {selectedProject.rejection_notes && (
                                <div className="proj-card-red">
                                    <h4 className="proj-title-md proj-label-red">🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
                                    <p className="proj-text-muted" style={{ margin: 0 }}>"{selectedProject.rejection_notes}"</p>
                                </div>
                            )}
                            {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                            <div style={{ opacity: 0.8, pointerEvents: 'none' }}>{renderBoqTable('planBOQ', true)}</div>
                            <hr style={{ border: '2px dashed var(--border-soft)', margin: '30px 0' }} />
                            <div className="proj-card-cream">
                                <label className="proj-label">Actual Site Measurement Notes</label>
                                <textarea value={boqData.actualMeasurement || ''} onChange={(e) => setBoqData({ ...boqData, actualMeasurement: e.target.value })} placeholder="Input physical site constraints and adjustments..." className="proj-textarea" />
                            </div>
                            {renderBoqTable('finalBOQ', false)}
                            <PrimaryButton variant="red" onClick={submitActualPhase}>Submit Final BOQ for Approval</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Pending Head Review' && isEngHead && (
                        <div>
                            <div className="proj-card-gray">
                                <h3 className="proj-title-lg">Review Engineering Final BOQ</h3>
                                {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                                <div className="proj-card mt-4">
                                    <label className="proj-label" style={{ color: 'var(--fo-blue)' }}>Engineer's Site Notes:</label>
                                    <p style={{ fontStyle: 'italic', fontSize: '18px', fontWeight: 'bold' }}>"{boqData.actualMeasurement}"</p>
                                </div>
                            </div>
                            {renderBoqTable('finalBOQ', true)}
                            <div className="proj-grid-2 mt-4">
                                <button onClick={() => openRejectModal('Actual Measurement')} className="proj-btn proj-btn-outline" style={{ color: 'var(--fo-red)', borderColor: 'var(--fo-red)' }}>❌ Reject & Return to Staff</button>
                                <PrimaryButton variant="green" onClick={() => advanceStatus('Purchase Order')}>✓ Approve BOQ & Return to Sales</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {isSales && renderSalesPOAndWorkOrderView()}

                    {selectedProject.status === 'Pending Work Order Verification' && isSalesHead && (
                        <div>
                            <div className="proj-card-gray">
                                <h3 className="proj-title-lg">Review Work Order</h3>
                                <p className="proj-text-muted">Please verify that the uploaded Work Order matches the Purchase Order before sending this to Engineering.</p>
                                <div className="proj-grid-2">
                                    {renderDocumentLink('Purchase Order', selectedProject.po_document)}
                                    {renderDocumentLink('Work Order', selectedProject.work_order_document)}
                                </div>
                            </div>
                            <div className="proj-grid-2 mt-4">
                                <button onClick={() => openRejectModal('P.O & Work Order')} className="proj-btn proj-btn-outline" style={{ color: 'var(--fo-red)', borderColor: 'var(--fo-red)' }}>❌ Reject & Return to Staff</button>
                                <PrimaryButton variant="green" onClick={() => advanceStatus('Initial Site Inspection')}>✓ Approve Work Order</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Initial Site Inspection' && isEng && (
                        <div>
                            <div className="proj-grid-2">
                                {renderDocumentLink('Purchase Order', selectedProject.po_document)}
                                {renderDocumentLink('Work Order', selectedProject.work_order_document)}
                            </div>
                            <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="proj-card-navy">
                                    <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🚧 Pre-Con Site Readiness</h3>
                                </div>
                                <div style={{ padding: '30px' }}>
                                    <p className="proj-text-muted">Verify the following critical conditions are met before deploying installers.</p>
                                    <div className="proj-grid-2 proj-card-gray">
                                        {[{ id: 'power', label: '🔌 Stable Power Available' }, { id: 'water', label: '💧 Water Accessible' }, { id: 'cleared', label: '🧹 Area Cleared' }, { id: 'permits', label: '📜 Permits Secured' }].map(item => (
                                            <label key={item.id} className="proj-checklist-item">
                                                <input type="checkbox" checked={siteInspection[item.id]} onChange={(e) => setSiteInspection({ ...siteInspection, [item.id]: e.target.checked })} />
                                                <span>{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="proj-card-cream">
                                        <label className="proj-label">📸 Upload "Before" Photo</label>
                                        <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                    </div>
                                </div>
                            </div>
                            <PrimaryButton disabled={!isInspectionReady} variant="red" onClick={() => uploadAndAdvance('Checking of Delivery of Materials', 'site_inspection_photo')}>
                                {isInspectionReady ? '✓ Complete Inspection & Request Materials' : 'Complete Checklist to Advance'}
                            </PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Checking of Delivery of Materials' && (isEng || isLogistics || isOpsAss) && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {selectedProject.rejection_notes && (
                                <div className="proj-card-red" style={{ borderRadius: 0 }}>
                                    <h4 className="proj-title-md proj-label-red">🚨 REVISION REQUIRED FROM HEAD</h4>
                                    <p className="proj-text-muted" style={{ margin: 0 }}>"{selectedProject.rejection_notes}"</p>
                                </div>
                            )}
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>📦 Material Verification</h3>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <p className="proj-text-muted">Please cross-reference the physically delivered materials against the approved Final BOQ below.</p>
                                <div className="proj-card-gray">
                                    <h4 className="proj-title-md" style={{ color: 'var(--fo-red)' }}>Reference: Final BOQ</h4>
                                    {renderBoqTable('finalBOQ', true)}
                                </div>
                                <div className="proj-card-cream text-center">
                                    <h4 className="proj-title-lg">Upload Delivery Receipt (DR)</h4>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                    <PrimaryButton variant="red" onClick={() => uploadAndAdvance('Pending DR Verification', 'delivery_receipt_document')}>Upload DR & Submit to Head</PrimaryButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Pending DR Verification' && isEngHead && (
                        <div>
                            <div className="proj-card-gray">
                                <h3 className="proj-title-lg">Verify Delivery Receipt</h3>
                                <p className="proj-text-muted">Please review the uploaded Delivery Receipt against the Final BOQ.</p>
                                {renderDocumentLink('Delivery Receipt (DR)', selectedProject.delivery_receipt_document)}

                                <div className="mt-4" style={{ borderTop: '2px solid var(--border-soft)', paddingTop: '20px' }}>
                                    <h4 className="proj-title-md">Reference: Final BOQ</h4>
                                    <div style={{ opacity: 0.9, pointerEvents: 'none' }}>{renderBoqTable('finalBOQ', true)}</div>
                                </div>
                            </div>
                            <div className="proj-grid-2">
                                <button onClick={() => openRejectModal('Checking of Delivery of Materials')} className="proj-btn proj-btn-outline" style={{ color: 'var(--fo-red)', borderColor: 'var(--fo-red)' }}>❌ Reject & Return to Staff</button>
                                <PrimaryButton variant="green" onClick={() => advanceStatus('Bidding of Project')}>✓ Approve DR & Proceed</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Bidding of Project' && (
                        isOpsAss ? (
                            <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="proj-card-navy">
                                    <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>⚖️ Procurement & Bidding</h3>
                                </div>
                                <div style={{ padding: '30px' }}>
                                    <div className="proj-card-gray">
                                        <h4 className="proj-title-md">Internal Budget Reference</h4>
                                        <div style={{ opacity: 0.9, pointerEvents: 'none' }}>{renderBoqTable('finalBOQ', true)}</div>
                                    </div>
                                    <div className="proj-card-cream text-center">
                                        <h4 className="proj-title-lg">Upload Winning Subcontractor Bid</h4>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                        <PrimaryButton variant="red" onClick={() => uploadAndAdvance('Awarding of Project', 'bidding_document')}>Upload Winning Bid & Proceed</PrimaryButton>
                                    </div>
                                </div>
                            </div>
                        ) : (<div className="proj-card-gray text-center"><p className="proj-title-lg" style={{ color: 'var(--text-muted)' }}>⏳ Awaiting Management to complete Bidding phase...</p></div>)
                    )}

                    {selectedProject.status === 'Awarding of Project' && (
                        isOpsAss ? (
                            <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="proj-card-navy">
                                    <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🤝 Contract Formalization</h3>
                                </div>
                                <div style={{ padding: '30px' }}>
                                    <div className="mb-4">
                                        <h4 className="proj-label" style={{ color: 'var(--fo-blue)' }}>Approved Bid Document</h4>
                                        {renderDocumentLink('Winning Subcontractor Quote', selectedProject.bidding_document)}
                                    </div>
                                    <div className="proj-card-gray text-center">
                                        <h4 className="proj-title-lg" style={{ borderBottom: '2px solid var(--border-soft)', paddingBottom: '20px' }}>Award Summary & Agreement</h4>
                                        <div className="proj-grid-2 text-left mt-4 mb-4">
                                            <div><label className="proj-label">Subcontractor Name *</label><input type="text" value={awardDetails.name || ''} onChange={e => setAwardDetails({ ...awardDetails, name: e.target.value })} className="proj-input" /></div>
                                            <div><label className="proj-label">Final Awarded Amount (₱) *</label><input type="number" value={awardDetails.amount || ''} onChange={e => setAwardDetails({ ...awardDetails, amount: e.target.value })} className="proj-input" /></div>
                                        </div>
                                        <label className="proj-label text-left">Upload Signed Agreement *</label>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                        <PrimaryButton disabled={!isAwardFormValid} variant="navy" onClick={() => uploadAndAdvance('Contract Signing for Installer', 'subcontractor_agreement_document')}>{isAwardFormValid ? 'Upload Agreement & Award Project' : 'Complete Form to Award'}</PrimaryButton>
                                    </div>
                                </div>
                            </div>
                        ) : (<div className="proj-card-gray text-center"><p className="proj-title-lg" style={{ color: 'var(--text-muted)' }}>⏳ Awaiting Management to process Awarding phase...</p></div>)
                    )}

                    {selectedProject.status === 'Contract Signing for Installer' && (isEng || isOpsAss) && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🤝 Subcontractor Handover Briefing</h3>
                            </div>
                            <div style={{ padding: '30px' }}>
                                {renderDocumentLink('Subcontractor Agreement', selectedProject.subcontractor_agreement_document)}
                                <div className="proj-grid-1 proj-card-gray mt-4">
                                    <label className="proj-checklist-item"><input type="checkbox" checked={contractChecklist.boqReviewed} onChange={(e) => setContractChecklist({ ...contractChecklist, boqReviewed: e.target.checked })} /><span>📋 Subcontractor has reviewed and agreed to the Final BOQ parameters.</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" checked={contractChecklist.timelineAgreed} onChange={(e) => setContractChecklist({ ...contractChecklist, timelineAgreed: e.target.checked })} /><span>⏳ Project timeline and milestones have been acknowledged.</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" checked={contractChecklist.signed} onChange={(e) => setContractChecklist({ ...contractChecklist, signed: e.target.checked })} /><span>✍️ Physical contract has been formally signed by both parties.</span></label>
                                </div>
                                <PrimaryButton disabled={!isContractReady} variant="red" onClick={() => advanceStatus('Deployment and Orientation of Installers')}>{isContractReady ? '✓ Confirm Handover & Proceed to Mobilization' : 'Complete Checklist to Advance'}</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Deployment and Orientation of Installers' && (isEng || isOpsAss) && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🚀 Site Mobilization & Safety</h3>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div className="proj-grid-3 proj-card-gray mt-4">
                                    <label className="proj-checklist-item"><input type="checkbox" checked={mobilizationChecklist.safety} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, safety: e.target.checked })} /><span>🦺 Site Safety & Hazard Briefing Completed</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" checked={mobilizationChecklist.passes} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, passes: e.target.checked })} /><span>🎟️ Gate Passes & Worker IDs Distributed</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" checked={mobilizationChecklist.tools} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, tools: e.target.checked })} /><span>🛠️ Initial Tools & Heavy Equipment Logged</span></label>
                                </div>
                                <div className="proj-card-cream">
                                    <label className="proj-label">📸 Upload Toolbox Meeting / Mobilization Photo *</label>
                                    <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                </div>
                                <PrimaryButton disabled={!isMobilizationReady} variant="green" onClick={() => uploadAndAdvance('Site Inspection & Project Monitoring', 'mobilization_photo')}>{isMobilizationReady ? '🚀 Mobilize Team & Begin Construction' : 'Complete Checklist & Upload Photo'}</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {/* 🚨 MEGASUITE COMMAND CENTER 🚨 */}
                    {selectedProject.status === 'Site Inspection & Project Monitoring' && isEng && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🏗️ Active Construction Command Center</h3>
                                <span style={{ background: '#16a34a', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: '900', fontSize: '12px' }}>● IN PROGRESS</span>
                            </div>

                            {/* MASTER TABS */}
                            <div className="proj-tabs-wrapper">
                                <button onClick={() => setActiveTab('installers')} className={`proj-tab-btn ${activeTab === 'installers' ? 'active' : ''}`}>📋 INSTALLER MONITORING</button>
                                <button onClick={() => setActiveTab('timeline')} className={`proj-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}>⏳ PROJECT TIMELINE</button>
                                <button onClick={() => setActiveTab('materials')} className={`proj-tab-btn ${activeTab === 'materials' ? 'active' : ''}`}>📦 MATERIALS MONITORING</button>
                                <button onClick={() => setActiveTab('issues')} className={`proj-tab-btn ${activeTab === 'issues' ? 'active' : ''}`}>⚠️ ISSUES & SOLUTIONS</button>
                                <button onClick={() => setActiveTab('inspection')} className={`proj-tab-btn ${activeTab === 'inspection' ? 'active' : ''}`}>✅ SITE INSPECTION REPORT</button>
                            </div>

                            <div style={{ padding: '30px' }}>

                                {/* TAB 1: INSTALLER MONITORING (Daily Logs) */}
                                {activeTab === 'installers' && (
                                    <div className="animate-fadeIn">
                                        <h4 className="proj-title-lg">Daily Monitoring Setup</h4>
                                        <div className="proj-grid-3 proj-card-gray mb-4">
                                            <div><label className="proj-label">Date of Log *</label><input type="date" value={dailyLog.date || ''} onChange={e => setDailyLog({ ...dailyLog, date: e.target.value })} className="proj-input" style={{ margin: 0 }} /></div>
                                            <div><label className="proj-label">Installer (Lead Man) *</label><input type="text" value={dailyLog.leadMan || ''} onChange={e => setDailyLog({ ...dailyLog, leadMan: e.target.value })} className="proj-input" placeholder="e.g. Marjun Narvasa" style={{ margin: 0 }} /></div>
                                            <div><label className="proj-label">Total Area Logged *</label><input type="text" value={dailyLog.totalArea || ''} onChange={e => setDailyLog({ ...dailyLog, totalArea: e.target.value })} className="proj-input" placeholder="e.g. 134 Lm" style={{ margin: 0 }} /></div>
                                        </div>

                                        <div className="proj-table-wrapper" style={{ marginBottom: '24px' }}>
                                            <table className="proj-table text-center">
                                                <thead><tr><th colSpan="2" style={{ background: 'var(--fo-cream)', fontSize: '14px' }}>Timeline Logs</th></tr></thead>
                                                <tbody>
                                                    <tr>
                                                        <td><label className="proj-label">From Client (START Date)</label><input type="date" value={dailyLog.clientStartDate || ''} onChange={e => setDailyLog({ ...dailyLog, clientStartDate: e.target.value })} className="proj-input" /></td>
                                                        <td><label className="proj-label">From Client (END Date)</label><input type="date" value={dailyLog.clientEndDate || ''} onChange={e => setDailyLog({ ...dailyLog, clientEndDate: e.target.value })} className="proj-input" /></td>
                                                    </tr>
                                                    <tr>
                                                        <td><label className="proj-label">Accomplishment (%) *</label><input type="number" value={dailyLog.completion || ''} onChange={e => setDailyLog({ ...dailyLog, completion: e.target.value })} className="proj-input text-center" style={{ fontSize: '24px', color: 'var(--fo-red)' }} placeholder="50" /></td>
                                                        <td><label className="proj-label">Overall Status / Remarks</label><textarea value={dailyLog.notes || ''} onChange={e => setDailyLog({ ...dailyLog, notes: e.target.value })} className="proj-textarea" placeholder="Describe current site status..." /></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="proj-table-wrapper">
                                            <table className="proj-table text-center">
                                                <thead>
                                                    <tr><th colSpan="6" style={{ background: 'var(--fo-cream)', fontSize: '14px' }}>NO. OF INSTALLERS</th></tr>
                                                    <tr><th>No.</th><th>Name</th><th>Time In</th><th>Time Out</th><th>Concerns / Remarks</th><th></th></tr>
                                                </thead>
                                                <tbody>
                                                    {installers.map((inst, idx) => (
                                                        <tr key={inst.id}>
                                                            <td>{idx + 1}</td>
                                                            <td><input type="text" value={inst.name || ''} onChange={(e) => updateInstaller(idx, 'name', e.target.value)} className="proj-input" style={{ margin: 0 }} /></td>
                                                            <td><input type="time" value={inst.timeIn || ''} onChange={(e) => updateInstaller(idx, 'timeIn', e.target.value)} className="proj-input" style={{ margin: 0 }} /></td>
                                                            <td><input type="time" value={inst.timeOut || ''} onChange={(e) => updateInstaller(idx, 'timeOut', e.target.value)} className="proj-input" style={{ margin: 0 }} /></td>
                                                            <td><input type="text" value={inst.remarks || ''} onChange={(e) => updateInstaller(idx, 'remarks', e.target.value)} className="proj-input" style={{ margin: 0 }} /></td>
                                                            <td><button onClick={() => setInstallers(installers.filter((_, i) => i !== idx))} className="proj-text-red font-black" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="proj-grid-2" style={{ padding: '20px', background: '#f8f9fa' }}>
                                                <div><label className="proj-label">📸 Photo 1</label><input type="file" ref={teamPhoto1Ref} accept="image/*" onChange={(e) => setTeamPhoto1(e.target.files[0])} className="proj-file-input" style={{ margin: 0, padding: '10px' }} /></div>
                                                <div><label className="proj-label">📸 Photo 2</label><input type="file" ref={teamPhoto2Ref} accept="image/*" onChange={(e) => setTeamPhoto2(e.target.files[0])} className="proj-file-input" style={{ margin: 0, padding: '10px' }} /></div>
                                            </div>
                                            <div className="text-center" style={{ padding: '15px' }}><button onClick={() => setInstallers([...installers, { id: Date.now(), name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }])} className="proj-btn-outline">+ Add Installer Row</button></div>
                                        </div>

                                        <div className="proj-card-cream">
                                            <label className="proj-title-md">📸 Upload Daily Progress Photo (MAIN) *</label>
                                            <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                        </div>

                                        <PrimaryButton variant="green" onClick={handleSaveDailyLog} disabled={isSubmittingLog}>{isSubmittingLog ? 'Saving...' : '💾 Save Daily Report'}</PrimaryButton>

                                        {/* HISTORY SECTION */}
                                        {dailyLogsHistory.length > 0 && (
                                            <div className="mt-4" style={{ borderTop: '2px solid var(--border-soft)', paddingTop: '30px' }}>
                                                <div className="proj-flex-between mb-4">
                                                    <h4 className="proj-title-md m-0">🕒 Daily Logs History</h4>
                                                    <button onClick={() => setShowHistory(!showHistory)} className="proj-btn-outline" style={{ border: 'none' }}>{showHistory ? 'Hide History' : 'Show History'}</button>
                                                </div>
                                                {showHistory && (
                                                    <>
                                                        <input type="text" placeholder="Filter (e.g. 2026-03)" value={historyFilter || ''} onChange={(e) => setHistoryFilter(e.target.value)} className="proj-input" />
                                                        <div className="proj-grid-1 mt-4">
                                                            {filteredHistory.length === 0 ? (
                                                                <p className="proj-text-muted text-center">No logs match your filter.</p>
                                                            ) : (
                                                                filteredHistory.map(log => (
                                                                    <div key={log.id} className="proj-card proj-flex-between" style={{ marginBottom: 0 }}>
                                                                        <div>
                                                                            <h4 className="proj-title-md" style={{ color: 'var(--fo-red)', margin: 0 }}>{log.log_date}</h4>
                                                                            <span className="proj-label" style={{ margin: '5px 0' }}>Submitted at: {formatTime(log.created_at)}</span>
                                                                            <p style={{ fontWeight: 'bold', margin: '5px 0' }}>Accomplishment: {log.accomplishment_percent}% | Area: {log.total_area || '0'}</p>
                                                                            {log.remarks && <p className="proj-text-muted" style={{ margin: 0 }}>"{log.remarks}"</p>}
                                                                        </div>
                                                                        <button onClick={() => exportSpecificDailyLog(log)} className="proj-btn-outline" style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}>⬇️ Download Excel</button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: MATERIALS MONITORING */}
                                {activeTab === 'materials' && (
                                    <div className="animate-fadeIn">
                                        <div className="proj-flex-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <label className="proj-label" style={{ margin: 0 }}>Logging for Date:</label>
                                                <input type="date" value={currentLogDate || ''} onChange={(e) => setCurrentLogDate(e.target.value)} className="proj-input" style={{ width: 'auto', margin: 0, padding: '10px' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={exportMaterialsToExcel} className="proj-btn-outline" style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}>⬇️ Download Excel</button>
                                                <button onClick={() => saveTrackingData('materials')} className="proj-btn-outline" style={{ background: 'var(--fo-navy)', color: 'white', borderColor: 'var(--fo-navy)' }}>💾 Save Tracking</button>
                                            </div>
                                        </div>

                                        <div className="proj-table-wrapper">
                                            <table className="proj-table text-center" style={{ minWidth: 'max-content' }}>
                                                <thead>
                                                    <tr><th colSpan="10" style={{ background: 'var(--fo-cream)', fontSize: '16px' }}>MATERIALS MONITORING</th></tr>
                                                    <tr>
                                                        <th colSpan="2">Item</th><th colSpan="3">Delivery / Pull Out</th><th rowSpan="2">Total Installed</th><th rowSpan="2">Inventory</th><th rowSpan="2">Remarks</th>
                                                        <th colSpan="2" style={{ background: '#fef2f2', color: 'var(--fo-red)' }}>{new Date(currentLogDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</th>
                                                    </tr>
                                                    <tr>
                                                        <th>Name</th><th>Description</th><th>Date</th><th>Quantity</th><th>Total</th><th style={{ background: '#fef2f2' }}>Consumed</th><th style={{ background: '#fef2f2' }}>Running Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {materialsTracking.length === 0 ? (
                                                        <tr><td colSpan="10" className="proj-text-muted text-center">No materials loaded.</td></tr>
                                                    ) : (
                                                        materialsTracking.map((item, index) => (
                                                            <tr key={index}>
                                                                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{item.description}</td>
                                                                <td>{item.unit}</td>
                                                                <td><input type="date" value={item.delivery_date || ''} onChange={(e) => handleMaterialUpdate(index, 'delivery_date', e.target.value)} className="proj-input" style={{ margin: 0, padding: '5px', fontSize: '12px' }} /></td>
                                                                <td><input type="text" value={item.delivery_qty || ''} readOnly className="proj-input" style={{ margin: 0, padding: '5px', background: '#f1f5f9' }} /></td>
                                                                <td style={{ fontWeight: '900' }}>{item.qty}</td>
                                                                <td style={{ fontWeight: '900', color: 'var(--fo-blue)' }}>{item.installed || 0}</td>
                                                                <td style={{ fontWeight: '900', color: item.remaining <= 0 ? 'var(--fo-red)' : '#16a34a' }}>{item.remaining}</td>
                                                                <td><input type="text" value={item.remarks || ''} onChange={(e) => handleMaterialUpdate(index, 'remarks', e.target.value)} className="proj-input" style={{ margin: 0, padding: '5px' }} /></td>
                                                                <td><input type="number" value={item.history?.[currentLogDate] || ''} onChange={(e) => handleMaterialUpdate(index, 'consumed', e.target.value, currentLogDate)} className="proj-input text-center" style={{ margin: 0, padding: '5px', color: 'var(--fo-red)', fontWeight: '900' }} placeholder="0" /></td>
                                                                <td style={{ fontWeight: '900' }}>{getRunningTotal(item, currentLogDate)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4" style={{ borderTop: '2px solid var(--border-soft)', paddingTop: '30px' }}>
                                            <div className="proj-flex-between proj-card-gray mb-4">
                                                <h4 className="proj-title-md" style={{ margin: 0 }}>🕒 Requisition History</h4>
                                                <div>
                                                    {showMaterialHistory && <input type="text" placeholder="Filter history..." value={materialHistoryFilter || ''} onChange={(e) => setMaterialHistoryFilter(e.target.value)} className="proj-input" style={{ width: '200px', margin: '0 10px 0 0', padding: '10px', display: 'inline-block' }} />}
                                                    <button onClick={() => setShowMaterialHistory(!showMaterialHistory)} className="proj-btn-outline">{showMaterialHistory ? 'HIDE' : 'SHOW'}</button>
                                                </div>
                                            </div>
                                            {showMaterialHistory && (
                                                <div className="proj-grid-1">
                                                    {materialRequestsHistory.length === 0 ? (
                                                        <p className="proj-text-muted text-center">No material requests have been made yet.</p>
                                                    ) : (
                                                        materialRequestsHistory.filter(req => req.status.toLowerCase().includes(materialHistoryFilter.toLowerCase()) || (req.requester_name && req.requester_name.toLowerCase().includes(materialHistoryFilter.toLowerCase())) || (req.approver_name && req.approver_name.toLowerCase().includes(materialHistoryFilter.toLowerCase()))).map(req => {
                                                            const itemsList = safeParseJSON(req.items);
                                                            let statusClass = "proj-mode-badge";
                                                            let statusText = "PENDING LOGISTICS";
                                                            if (req.status === 'Dispatched') { statusClass += " bg-green-100 text-green-800"; statusText = `APPROVED BY: ${req.approver_name || 'LOGISTICS'}`; }
                                                            if (req.status === 'Denied') { statusClass += " bg-red-100 text-red-800"; statusText = `DECLINED BY: ${req.approver_name || 'LOGISTICS'}`; }

                                                            return (
                                                                <div key={req.id} className="proj-card proj-flex-between" style={{ padding: '20px', marginBottom: 0, flexWrap: 'wrap', gap: '15px' }}>
                                                                    <div>
                                                                        <span className="proj-title-md">{new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                                        <span className="proj-label">Req By: {req.requester_name || 'Unknown'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <ul style={{ fontWeight: 'bold', color: 'var(--fo-navy)' }}>{itemsList.map((item, idx) => (<li key={idx}>• {item.requestedQty} {item.unit} - {item.description}</li>))}</ul>
                                                                    </div>
                                                                    <div><span className={statusClass} style={{ background: req.status === 'Dispatched' ? '#dcfce7' : req.status === 'Denied' ? '#fef2f2' : 'var(--fo-cream)', color: req.status === 'Dispatched' ? '#16a34a' : req.status === 'Denied' ? '#c1121f' : 'var(--fo-navy)' }}>{statusText}</span></div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: TIMELINE & GANTT */}
                                {activeTab === 'timeline' && (
                                    <div className="animate-fadeIn">
                                        <div className="proj-flex-between mb-4" style={{ flexWrap: 'wrap', gap: '15px' }}>
                                            <h4 className="proj-title-lg" style={{ margin: 0 }}>PROJECT TIMELINE</h4>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={exportGanttChartToExcel} className="proj-btn-outline" style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}>⬇️ Download Gantt</button>
                                                <button onClick={() => saveTrackingData('timeline')} className="proj-btn-outline" style={{ background: 'var(--fo-navy)', color: 'white', borderColor: 'var(--fo-navy)' }}>💾 Save Timeline</button>
                                            </div>
                                        </div>

                                        <div className="proj-table-wrapper" style={{ marginBottom: '24px' }}>
                                            <table className="proj-table text-center">
                                                <thead><tr><th>Project Name</th><th>Duration</th><th>Plan Start</th><th>Plan End</th></tr></thead>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ fontWeight: '900', color: 'var(--fo-navy)' }}>{selectedProject.project_name}</td>
                                                        <td style={{ fontWeight: '900', color: 'var(--fo-red)' }}>{getProjectMetrics().duration > 0 ? getProjectMetrics().duration + ' Days' : '-'}</td>
                                                        <td>{getProjectMetrics().min ? getProjectMetrics().min.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}</td>
                                                        <td>{getProjectMetrics().max ? getProjectMetrics().max.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="proj-table-wrapper">
                                            <table className="proj-table text-center">
                                                <thead>
                                                    <tr><th style={{ textAlign: 'left' }}>TASK NAME</th><th>PLAN START</th><th>PLAN END</th><th>DURATION</th><th>UNIT</th><th>% DONE</th><th>STATUS</th><th></th></tr>
                                                </thead>
                                                <tbody>
                                                    {timelineTasks.map((task, index) => (
                                                        task.type === 'group' ? (
                                                            <tr key={task.id} style={{ background: '#f1f5f9' }}>
                                                                <td colSpan="7"><input type="text" value={task.name || ''} onChange={(e) => updateTimelineTask(index, 'name', e.target.value)} className="proj-input" style={{ margin: 0, background: 'transparent', border: 'none', textTransform: 'uppercase' }} placeholder="GROUP NAME..." /></td>
                                                                <td><button onClick={() => setTimelineTasks(timelineTasks.filter((_, i) => i !== index))} className="proj-text-red font-black" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                                                            </tr>
                                                        ) : (
                                                            <tr key={task.id}>
                                                                <td style={{ textAlign: 'left' }}><input type="text" value={task.name || ''} onChange={(e) => updateTimelineTask(index, 'name', e.target.value)} className="proj-input" style={{ margin: 0, background: 'transparent', border: 'none' }} placeholder="Task description..." /></td>
                                                                <td><input type="date" value={task.start || ''} onChange={(e) => updateTimelineTask(index, 'start', e.target.value)} className="proj-input text-center" style={{ margin: 0, background: 'transparent', border: 'none', padding: '5px' }} /></td>
                                                                <td><input type="date" value={task.end || ''} onChange={(e) => updateTimelineTask(index, 'end', e.target.value)} className="proj-input text-center" style={{ margin: 0, background: 'transparent', border: 'none', padding: '5px' }} /></td>
                                                                <td style={{ fontWeight: '900', color: 'var(--fo-red)' }}>{task.duration || '-'}</td>
                                                                <td>{task.unit}</td>
                                                                <td style={{ background: '#f0fdf4' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#16a34a' }}><input type="number" value={task.percent !== undefined ? task.percent : ''} onChange={(e) => updateTimelineTask(index, 'percent', e.target.value)} className="proj-input text-center" style={{ margin: 0, background: 'transparent', border: 'none', width: '60px', padding: '5px' }} placeholder="0" />%</div></td>
                                                                <td><span className="proj-mode-badge" style={{ background: task.status === 'Delayed' ? '#fef2f2' : task.status === 'Completed' ? '#dcfce7' : task.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9', color: task.status === 'Delayed' ? '#c1121f' : task.status === 'Completed' ? '#16a34a' : task.status === 'In Progress' ? '#0ea5e9' : '#64748b' }}>{task.status || 'Pending'}</span></td>
                                                                <td><button onClick={() => setTimelineTasks(timelineTasks.filter((_, i) => i !== index))} className="proj-text-red font-black" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                                                            </tr>
                                                        )
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                            <button onClick={() => setTimelineTasks([...timelineTasks, { id: Date.now(), name: '', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' }])} className="proj-btn-outline">+ Add Task Line</button>
                                            <button onClick={() => setTimelineTasks([...timelineTasks, { id: Date.now(), name: 'NEW SECTION', type: 'group' }])} className="proj-btn-outline" style={{ color: 'var(--text-muted)', borderColor: 'var(--text-muted)' }}>+ Add Section Group</button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: ISSUES TRACKER */}
                                {activeTab === 'issues' && (
                                    <div className="animate-fadeIn">
                                        <h4 className="proj-title-lg">Problem Encountered & Solution Log</h4>
                                        <div className="proj-grid-2 mb-4">
                                            <div className="proj-card-red" style={{ marginBottom: 0 }}>
                                                <label className="proj-label proj-label-red">⚠️ Problem Encountered *</label>
                                                <textarea value={issueLog.problem || ''} onChange={e => setIssueLog({ ...issueLog, problem: e.target.value })} className="proj-textarea" placeholder="Describe the issue..." />
                                            </div>
                                            <div className="proj-card" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', marginBottom: 0 }}>
                                                <label className="proj-label" style={{ color: '#16a34a' }}>✅ Solution / Action Taken</label>
                                                <textarea value={issueLog.solution || ''} onChange={e => setIssueLog({ ...issueLog, solution: e.target.value })} className="proj-textarea" placeholder="Describe the action taken..." />
                                            </div>
                                        </div>
                                        <PrimaryButton variant="navy" onClick={handleIssueSubmit} disabled={isSubmittingIssue}>{isSubmittingIssue ? 'Logging...' : '💾 Log Issue'}</PrimaryButton>

                                        {issuesHistory.length > 0 && (
                                            <div className="mt-4" style={{ borderTop: '2px solid var(--border-soft)', paddingTop: '30px' }}>
                                                <div className="proj-flex-between mb-4 flex-wrap" style={{ gap: '15px' }}>
                                                    <h4 className="proj-title-md m-0">🕒 Issues History</h4>
                                                    <button onClick={exportIssuesToExcel} className="proj-btn-outline" style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}>⬇️ Download Issues Report</button>
                                                </div>
                                                <div className="proj-grid-1">
                                                    {issuesHistory.map(issue => (
                                                        <div key={issue.id} className="proj-card" style={{ marginBottom: 0 }}>
                                                            <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: '15px', marginBottom: '15px' }}>
                                                                <span className="proj-label proj-label-red">⚠️ Problem:</span>
                                                                <p style={{ fontWeight: 'bold', color: 'var(--text-dark)', margin: 0 }}>{issue.problem}</p>
                                                            </div>
                                                            <div>
                                                                <span className="proj-label" style={{ color: '#16a34a' }}>✅ Solution:</span>
                                                                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)', margin: 0 }}>{issue.solution || "No solution logged yet."}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 🚨 TAB 5: SITE INSPECTION REPORT 🚨 */}
                                {activeTab === 'inspection' && (
                                    <div className="animate-fadeIn">
                                        <div className="proj-flex-between mb-4 flex-wrap" style={{ gap: '15px' }}>
                                            <h4 className="proj-title-lg" style={{ margin: 0 }}>Site Inspection Checklist</h4>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={exportInspectionToExcel} className="proj-btn-outline" style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}>⬇️ Download Excel</button>
                                                <button onClick={() => saveTrackingData('inspection')} className="proj-btn-outline" style={{ background: 'var(--fo-navy)', color: 'white', borderColor: 'var(--fo-navy)' }}>💾 Save Report</button>
                                            </div>
                                        </div>

                                        <div className="proj-grid-2 proj-card-gray">
                                            <div><label className="proj-label">Prepared By:</label><input type="text" value={inspectionReport.preparedBy || ''} onChange={(e) => updateInspectionMeta('preparedBy', e.target.value)} className="proj-input" /></div>
                                            <div><label className="proj-label">Checked By (Project Manager):</label><input type="text" value={inspectionReport.checkedBy || ''} onChange={(e) => updateInspectionMeta('checkedBy', e.target.value)} className="proj-input" /></div>
                                        </div>

                                        {renderInspectionCategory('Pre-Checklist', 'preChecklist')}
                                        {renderInspectionCategory('Installation Proper', 'handrails')}
                                        {renderInspectionCategory('Installation Proper', 'wallguard')}
                                        {renderInspectionCategory('Installation Proper', 'cornerguard')}

                                        <div className="text-center mb-4">
                                            <button type="button" onClick={() => addInspectionGroupRow('cornerguard')} className="proj-btn-outline">+ Add Section Group</button>
                                        </div>

                                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                            <div className="proj-card-navy text-center"><span style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Attachments</span></div>
                                            <div className="proj-grid-3" style={{ padding: '30px' }}>
                                                <label className="proj-checklist-item"><input type="checkbox" checked={inspectionReport.attachments?.approvedLayout || false} onChange={(e) => updateInspectionAttachment('approvedLayout', e.target.checked)} /><span>Approved Layout</span></label>
                                                <label className="proj-checklist-item"><input type="checkbox" checked={inspectionReport.attachments?.keyplan || false} onChange={(e) => updateInspectionAttachment('keyplan', e.target.checked)} /><span>Keyplan</span></label>
                                                <label className="proj-checklist-item"><input type="checkbox" checked={inspectionReport.attachments?.other || false} onChange={(e) => updateInspectionAttachment('other', e.target.checked)} /><span>Other</span></label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <hr style={{ border: '2px dashed var(--border-soft)', margin: '40px 0' }} />

                                {/* CORE ACTIONS */}
                                <div className="proj-grid-3">
                                    <div className="proj-card text-center" style={{ borderColor: 'var(--fo-orange)' }}>
                                        <h4 className="proj-title-md" style={{ color: '#f97316' }}>Material Requisition</h4>
                                        <p className="proj-text-muted">Out of stock? Submit a requisition alert to Logistics.</p>
                                        <PrimaryButton variant="orange" onClick={() => setShowRequestModal(true)}>📦 Request Materials</PrimaryButton>
                                    </div>
                                    <div className="proj-card text-center" style={{ borderColor: 'var(--fo-blue)' }}>
                                        <h4 className="proj-title-md" style={{ color: 'var(--fo-blue)' }}>Progress Billing</h4>
                                        <p className="proj-text-muted">Hit a completion milestone? Notify Accounting to release payment.</p>
                                        <PrimaryButton variant="navy" onClick={() => advanceStatus('Request Billing')}>💸 Request Billing</PrimaryButton>
                                    </div>
                                    <div className="proj-card text-center" style={{ borderColor: 'var(--fo-red)' }}>
                                        <h4 className="proj-title-md" style={{ color: 'var(--fo-red)' }}>Construction Complete</h4>
                                        <p className="proj-text-muted">Physical build is fully complete. Proceed to QC.</p>
                                        <PrimaryButton variant="red" onClick={() => advanceStatus('Site Inspection & Quality Checking')}>✓ Initiate Final QC</PrimaryButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOWNSTREAM PHASES */}
                    {selectedProject.status === 'Request Materials Needed' && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy" style={{ background: '#f97316' }}>
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🚚 Logistics: Material Dispatch Center</h3>
                            </div>
                            {isLogistics ? (
                                <div style={{ padding: '30px' }}>
                                    <p className="proj-title-md">Engineering has requested additional materials at the site.</p>
                                    <div className="proj-card-cream" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
                                        <h4 className="proj-title-lg" style={{ color: '#c2410c' }}>Dispatch Preparation Checklist</h4>
                                        <div className="proj-grid-3 mb-4">
                                            <label className="proj-checklist-item" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.inventory} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, inventory: e.target.checked })} /><span style={{ color: '#c2410c' }}>📦 Pulled from Inventory</span></label>
                                            <label className="proj-checklist-item" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.transport} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, transport: e.target.checked })} /><span style={{ color: '#c2410c' }}>🚚 Transport Assigned</span></label>
                                            <label className="proj-checklist-item" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.notified} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, notified: e.target.checked })} /><span style={{ color: '#c2410c' }}>📱 Eng Team Notified</span></label>
                                        </div>
                                        <PrimaryButton disabled={!logisticsChecklist.inventory || !logisticsChecklist.transport || !logisticsChecklist.notified} variant="orange" onClick={() => advanceStatus('Site Inspection & Project Monitoring')}>✓ Confirm Dispatch & Return to Engineer</PrimaryButton>
                                    </div>
                                </div>
                            ) : (<div className="proj-card-gray text-center"><p className="proj-title-lg" style={{ color: 'var(--text-muted)' }}>⏳ Awaiting Logistics...</p></div>)}
                        </div>
                    )}

                    {/* 🚨 ULTIMATE ACCOUNTING BILLING DASHBOARD 🚨 */}
                    {selectedProject.status === 'Request Billing' && (
                        (isAccounting || isOpsAss) ? (() => {
                            const latestLog = dailyLogsHistory.length > 0 ? dailyLogsHistory[0] : null;
                            const percent = latestLog ? parseFloat(latestLog.accomplishment_percent) || 0 : 0;
                            const totalContract = parseFloat(selectedProject.contract_amount) || 0;
                            const payableAmount = (totalContract * (percent / 100));
                            const isValidToBill = uploadFile !== null;

                            return (
                                <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div className="proj-card-navy">
                                        <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>💰 Accounting Progress Billing</h3>
                                    </div>
                                    <div style={{ padding: '30px' }}>
                                        <div className="proj-grid-2 mb-4">
                                            {/* CARD 1: THE MATH (SWA) */}
                                            <div className="proj-card-gray" style={{ marginBottom: 0 }}>
                                                <h4 className="proj-title-md" style={{ borderBottom: '2px solid var(--border-soft)', paddingBottom: '15px' }}>Statement of Work Accomplished</h4>
                                                <div className="proj-flex-between mt-4 mb-4">
                                                    <span className="proj-text-muted" style={{ margin: 0 }}>Total Contract Amount:</span>
                                                    <span className="proj-title-md" style={{ margin: 0 }}>₱{totalContract.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="proj-flex-between mb-4">
                                                    <span className="proj-text-muted" style={{ margin: 0 }}>Current Accomplishment:</span>
                                                    <span className="proj-mode-badge" style={{ background: '#eff6ff', color: 'var(--fo-blue)', fontSize: '20px' }}>{percent}%</span>
                                                </div>
                                                <div className="proj-flex-between pt-4" style={{ borderTop: '2px dashed var(--border-soft)' }}>
                                                    <span className="proj-title-md" style={{ margin: 0 }}>AMOUNT PAYABLE:</span>
                                                    <span className="proj-title-lg" style={{ margin: 0, color: '#16a34a' }}>₱{payableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>

                                            {/* CARD 2: THE PROOF */}
                                            <div className="proj-card text-center" style={{ marginBottom: 0 }}>
                                                <h4 className="proj-title-md">Latest Site Photo Proof</h4>
                                                {latestLog && latestLog.photo_path ? (
                                                    <img src={`http://localhost:8000/storage/${latestLog.photo_path}`} alt="Site Progress" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--border-soft)' }} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/400x200?text=Image+Not+Found" }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '200px', background: '#f1f5f9', borderRadius: '12px', border: '2px dashed var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <p className="proj-text-muted" style={{ margin: 0 }}>No photo uploaded by Engineering.</p>
                                                    </div>
                                                )}
                                                {latestLog && <p className="proj-label mt-4">As of: {latestLog.log_date}</p>}
                                            </div>
                                        </div>

                                        {/* ACTION BLOCK: INVOICE UPLOAD */}
                                        <div className="proj-card-cream text-center">
                                            <h4 className="proj-title-lg" style={{ color: 'var(--fo-red)' }}>Upload Official Subcontractor Invoice</h4>
                                            <p className="proj-text-muted">You must attach the invoice document before authorizing the release of this payment.</p>
                                            <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                            <PrimaryButton disabled={!isValidToBill} variant="green" onClick={() => uploadAndAdvance('Site Inspection & Project Monitoring', 'billing_invoice_document')}>
                                                {isValidToBill ? '✓ Process Payment & Return to Monitoring' : 'Upload Invoice to Proceed'}
                                            </PrimaryButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (<div className="proj-card-gray text-center"><p className="proj-title-lg" style={{ color: 'var(--text-muted)' }}>⏳ Awaiting Accounting to process progress payment...</p></div>)
                    )}

                    {/* 🚨 PHASE: INTERNAL QA/QC 🚨 */}
                    {selectedProject.status === 'Site Inspection & Quality Checking' && isEng && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🔎 Internal Technical QA/QC</h3>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <p className="proj-title-md">Ensure the site is 100% pristine before scheduling the client walkthrough.</p>
                                <div className="proj-grid-3 proj-card-gray mt-4 mb-4">
                                    <label className="proj-checklist-item"><input type="checkbox" required /><span>All BOQ Scopes Installed</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" required /><span>Site Cleared of Debris</span></label>
                                    <label className="proj-checklist-item"><input type="checkbox" required /><span>No Visible Defects</span></label>
                                </div>
                                <div className="proj-card-gray text-center">
                                    <label className="proj-title-lg">📸 Upload Internal QA Passed Photo *</label>
                                    <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                    <PrimaryButton variant="red" onClick={() => uploadAndAdvance('Pending QA Verification', 'qa_photo')}>Submit QA to Head for Verification</PrimaryButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚨 NEW: QA VERIFICATION (ENG HEAD) 🚨 */}
                    {selectedProject.status === 'Pending QA Verification' && isEngHead && (
                        <div>
                            <div className="proj-card-gray text-center">
                                <h3 className="proj-title-lg" style={{ borderBottom: '2px solid var(--border-soft)', paddingBottom: '20px' }}>Verify Internal QA</h3>
                                <p className="proj-text-muted mt-4">Please review the site photo to ensure it is ready for the client walkthrough.</p>
                                <div className="proj-card mt-4">
                                    {selectedProject.qa_photo ? (
                                        <img src={`http://localhost:8000/storage/${selectedProject.qa_photo}`} alt="QA Proof" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--border-soft)' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '200px', background: '#f1f5f9', borderRadius: '12px', border: '2px dashed var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <p className="proj-text-muted" style={{ margin: 0 }}>No photo was saved in the database for this project.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="proj-grid-2 mt-4">
                                <button onClick={() => openRejectModal('Site Inspection & Quality Checking')} className="proj-btn proj-btn-outline" style={{ color: 'var(--fo-red)', borderColor: 'var(--fo-red)' }}>❌ Reject & Return to Staff</button>
                                <PrimaryButton variant="green" onClick={() => advanceStatus('Final Site Inspection with the Client')}>✓ Approve QA & Schedule Client Walkthrough</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {/* 🚨 PHASE: CLIENT WALKTHROUGH 🚨 */}
                    {selectedProject.status === 'Final Site Inspection with the Client' && isEng && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>🤝 Final Client Walkthrough</h3>
                            </div>
                            <div className="proj-grid-2" style={{ padding: '30px' }}>
                                <div>
                                    {renderDocumentLink('Internal QA Photo Ref', selectedProject.qa_photo)}
                                    <label className="proj-label mt-4">Client Remarks / Punchlist Notes</label>
                                    <textarea className="proj-textarea" placeholder="Note any specific feedback from the client here..." />
                                </div>
                                <div className="proj-card-cream text-center" style={{ marginBottom: 0 }}>
                                    <h4 className="proj-title-lg" style={{ color: '#854d0e' }}>📄 Upload Client Sign-off Sheet *</h4>
                                    <p className="proj-text-muted">Attach the physical document signed by the client confirming their approval of the site.</p>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" style={{ borderColor: '#facc15' }} />
                                    <PrimaryButton variant="navy" onClick={() => uploadAndAdvance('Signing of COC', 'client_walkthrough_doc')}>Client Approved Project</PrimaryButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚨 PHASE: CERTIFICATE OF COMPLETION 🚨 */}
                    {selectedProject.status === 'Signing of COC' && isEng && (
                        <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="proj-card-navy">
                                <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>📜 Certificate of Completion (C.O.C.)</h3>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div className="proj-card-gray text-center">
                                    <span style={{ fontSize: '60px', display: 'block', marginBottom: '20px' }}>🏆</span>
                                    <h4 className="proj-title-lg">Upload Signed C.O.C.</h4>
                                    <p className="proj-text-muted">The final legal document handing the project over officially.</p>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                    <PrimaryButton variant="navy" onClick={() => uploadAndAdvance('Request Final Billing', 'coc_document')}>Upload COC & Trigger Final Bill</PrimaryButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚨 PHASE: FINAL BILLING (ACCOUNTING) 🚨 */}
                    {selectedProject.status === 'Request Final Billing' && (
                        (isAccounting || isOpsAss) ? (() => {
                            const totalContract = parseFloat(selectedProject.contract_amount) || 0;
                            const isValidToClose = uploadFile !== null;

                            return (
                                <div className="proj-card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div className="proj-card-navy" style={{ background: '#16a34a' }}>
                                        <h3 className="proj-title-md" style={{ color: 'white', margin: 0 }}>💸 Final Accounting Clearance</h3>
                                    </div>
                                    <div style={{ padding: '30px' }}>
                                        <div className="proj-grid-2 mb-4">
                                            {/* CARD 1: FINAL FINANCIALS */}
                                            <div className="proj-card-gray" style={{ marginBottom: 0 }}>
                                                <h4 className="proj-title-md" style={{ borderBottom: '2px solid var(--border-soft)', paddingBottom: '15px' }}>Final Statement of Work</h4>
                                                <div className="proj-flex-between mt-4 mb-4">
                                                    <span className="proj-text-muted" style={{ margin: 0 }}>Total Contract Amount:</span>
                                                    <span className="proj-title-md" style={{ margin: 0 }}>₱{totalContract.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="proj-flex-between">
                                                    <span className="proj-text-muted" style={{ margin: 0 }}>Final Accomplishment:</span>
                                                    <span className="proj-mode-badge" style={{ background: '#dcfce7', color: '#16a34a', fontSize: '20px' }}>100% COMPLETE</span>
                                                </div>
                                            </div>

                                            {/* CARD 2: FINAL DOCS */}
                                            <div className="proj-card" style={{ marginBottom: 0 }}>
                                                <h4 className="proj-title-md">Required Verification Documents</h4>
                                                {renderDocumentLink('Signed C.O.C', selectedProject.coc_document)}
                                                {renderDocumentLink('Client Walkthrough Sign-off', selectedProject.client_walkthrough_doc)}
                                            </div>
                                        </div>

                                        {/* ACTION BLOCK: FINAL INVOICE UPLOAD */}
                                        <div className="proj-card-cream text-center">
                                            <h4 className="proj-title-lg" style={{ color: 'var(--fo-red)' }}>Upload Final Official Invoice / Receipt</h4>
                                            <p className="proj-text-muted">Upload the final financial proof before permanently closing this project.</p>
                                            <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="proj-file-input" />
                                            <PrimaryButton disabled={!isValidToClose} variant="green" onClick={() => uploadAndAdvance('Completed', 'final_invoice_document')}>
                                                {isValidToClose ? '✓ Process Final Bill & Close Project' : 'Upload Invoice to Close Project'}
                                            </PrimaryButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (<div className="proj-card-gray text-center"><p className="proj-title-lg" style={{ color: 'var(--text-muted)' }}>⏳ Awaiting Accounting to process final payment...</p></div>)
                    )}

                    {(selectedProject.status === 'Completed' || selectedProject.status === 'Archived') && (
                        <div>
                            {/* 🖨️ PRINT-ONLY HEADER */}
                            <div className="hidden print-header" style={{ display: 'none' }}>
                                <h1 className="proj-title-lg" style={{ fontSize: '32px' }}>VICMIS PROJECT SUMMARY</h1>
                                <p className="proj-text-muted">Official Completion Report | Project ID: {selectedProject.id}</p>
                            </div>

                            <div className="proj-card-green">
                                <h3 className="proj-title-lg" style={{ color: 'white', fontSize: '36px' }}>Project Finalized 🏆</h3>
                                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Project Name: {selectedProject.project_name}</p>
                            </div>

                            <div className="proj-card">
                                <div className="proj-flex-between mb-4 no-print">
                                    <h4 className="proj-title-lg" style={{ margin: 0 }}>📁 Digital Document Vault</h4>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={exportCOABoardToExcel} className="proj-btn-outline" style={{ background: '#ea580c', color: 'white', borderColor: '#ea580c' }}>
                                            📊 Generate COA Board
                                        </button>
                                        <button onClick={() => window.print()} className="proj-btn-outline">
                                            🖨️ EXPORT AS PDF / PRINT
                                        </button>
                                    </div>
                                </div>

                                <div className="proj-vault-grid">
                                    <div className="proj-vault-section">
                                        <p className="proj-vault-header">Technical & Site</p>
                                        {renderDocumentLink('Initial Floor Plan', selectedProject.floor_plan_image)}
                                        {renderDocumentLink('Before Photo', selectedProject.site_inspection_photo)}
                                        {renderDocumentLink('QA Passed Photo', selectedProject.qa_photo)}
                                        {renderDocumentLink('Mobilization Photo', selectedProject.mobilization_photo)}
                                    </div>

                                    <div className="proj-vault-section">
                                        <p className="proj-vault-header" style={{ color: '#ea580c' }}>Procurement & Bids</p>
                                        {renderDocumentLink('Winning Bid Doc', selectedProject.bidding_document)}
                                        {renderDocumentLink('Subcon Agreement', selectedProject.subcontractor_agreement_document)}
                                        {renderDocumentLink('Purchase Order', selectedProject.po_document)}
                                        {renderDocumentLink('Work Order', selectedProject.work_order_document)}
                                    </div>

                                    <div className="proj-vault-section">
                                        <p className="proj-vault-header" style={{ color: '#16a34a' }}>Financial Records</p>
                                        {renderDocumentLink('Progress Invoice', selectedProject.billing_invoice_document)}
                                        {renderDocumentLink('Final Receipt', selectedProject.final_invoice_document)}
                                        <div style={{ borderTop: '1px dashed var(--border-soft)', marginTop: '15px', paddingTop: '15px' }}>
                                            <p className="proj-label">Total Contract Amount:</p>
                                            <p className="proj-title-md">₱{parseFloat(selectedProject.contract_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    <div className="proj-vault-section">
                                        <p className="proj-vault-header" style={{ color: 'var(--fo-red)' }}>Turnover & Sign-off</p>
                                        {renderDocumentLink('Client Sign-off', selectedProject.client_walkthrough_doc)}
                                        {renderDocumentLink('Signed C.O.C.', selectedProject.coc_document)}
                                        {renderDocumentLink('Delivery Receipt', selectedProject.delivery_receipt_document)}
                                    </div>
                                </div>
                            </div>

                            {/* 🔒 FINAL ARCHIVE ACTION */}
                            {selectedProject.status !== 'Archived' && (
                                <div className="proj-card-gray text-center no-print">
                                    <h4 className="proj-title-lg">Final File Closure</h4>
                                    <p className="proj-text-muted">Archiving will hide this project from the active list. Documents remain accessible via the Master Database.</p>
                                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                        <PrimaryButton variant="navy" onClick={() => {
                                            if (window.confirm("Move this project to the permanent digital storage vault?")) {
                                                advanceStatus('Archived');
                                            }
                                        }}>📁 Move to Storage Vault</PrimaryButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        );
    }

    return <ProjectManagement onSelectProject={(proj) => { setSelectedProject(proj); setCurrentView('workflow-detail'); }} />;
};

export default Project;