import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
    const isSales = user.department?.toLowerCase() === 'sales';
    const isEng = user.department?.toLowerCase() === 'engineering';
    const isEngHead = user.department?.toLowerCase() === 'engineering' && user.role === 'dept_head';
    const isLogistics = user.department?.toLowerCase() === 'logistics' || user.department?.toLowerCase() === 'inventory';
    const isAccounting = user.department?.toLowerCase().includes('accounting');
    const isOpsAss = user.department?.toLowerCase() === 'management' || user.role === 'admin' || user.role === 'manager';

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

    // 🚨 DETAILED SITE INSPECTION REPORT STATE 🚨
    const defaultInspectionState = {
        preparedBy: user.name || '',
        checkedBy: '',
        subtitles: {
            preChecklist: 'WALL',
            handrails: 'HANDRAILS',
            wallguard: 'WALLGUARD',
            cornerguard: 'CORNERGUARD'
        },
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
            { id: 8, desc: 'MATERIALS QUALITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
            { id: 9, desc: 'MATERIALS QUANTITY', s1: '', s2: '', s3: '', s4: '', rem: '' },
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
        attachments: {
            approvedLayout: false, keyplan: false, other: false
        }
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

    const safeParseJSON = (data) => {
        if (!data) return [];
        try { return JSON.parse(data); } catch (e) { return []; }
    };

    const config = { headers: { Authorization: `Bearer ${token}` } };

    const parseLocal = (dStr) => {
        if (!dStr) return null;
        const parts = dStr.split('T')[0].split('-');
        if (parts.length !== 3) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]); 
    };

    const fetchCommandCenterData = async (projectId) => {
        try {
            const [logsRes, issuesRes, matReqRes] = await Promise.all([
                axios.get(`http://localhost:8000/api/projects/${projectId}/daily-logs`, config),
                axios.get(`http://localhost:8000/api/projects/${projectId}/issues`, config),
                axios.get(`http://localhost:8000/api/projects/${projectId}/material-requests`, config)
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
            const parsedFinalBOQ = safeParseJSON(selectedProject.final_boq);
            const parsedMaterials = safeParseJSON(selectedProject.materials_tracking);
            const parsedTimeline = safeParseJSON(selectedProject.timeline_tracking);
            const parsedInspection = selectedProject.site_inspection_report ? JSON.parse(selectedProject.site_inspection_report) : null;

            setBoqData({
                planMeasurement: selectedProject.plan_measurement || '',
                planBOQ: safeParseJSON(selectedProject.plan_boq),
                actualMeasurement: selectedProject.actual_measurement || '',
                finalBOQ: parsedFinalBOQ
            });

            if (parsedInspection) {
                // Ensure subtitles exists even on older saved reports
                setInspectionReport({
                    ...parsedInspection,
                    subtitles: parsedInspection.subtitles || defaultInspectionState.subtitles
                });
            } else {
                setInspectionReport(defaultInspectionState);
            }

            if (parsedMaterials.length > 0) {
                const safeMaterials = parsedMaterials.map(item => ({ ...item, history: item.history || {} }));
                setMaterialsTracking(safeMaterials);
            } else if (parsedFinalBOQ.length > 0) {
                setMaterialsTracking(parsedFinalBOQ.map(item => ({ ...item, installed: 0, remaining: item.qty, remarks: '', delivery_date: '', delivery_qty: '', history: {} })));
            } else {
                setMaterialsTracking([]);
            }

            if (parsedTimeline.length > 0) {
                const today = new Date();
                today.setHours(0,0,0,0);
                
                setTimelineTasks(parsedTimeline.map(t => {
                    let calcStatus = t.status || 'Pending';
                    if (t.type !== 'group') {
                        let currentPercent = parseInt(t.percent, 10) || 0;
                        if (currentPercent === 100) {
                            calcStatus = 'Completed';
                        } else {
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
                    return {
                        id: t.id || Date.now(), name: t.name || '', type: t.type || 'task',
                        start: t.start || '', end: t.end || '', duration: t.duration || '', 
                        unit: t.unit || 'DAYS', percent: t.percent || '0', status: calcStatus
                    };
                }));
            } else {
                setTimelineTasks([
                    { id: 'g1', name: 'General Requirements', type: 'group' },
                    { id: 1, name: 'Initial Site Inspection', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 2, name: 'Delivery and Hauling Of Materials', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 3, name: 'Mobilization', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 4, name: 'Restoration/Punchlist', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 5, name: 'Final Site Inspection', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 6, name: 'Signing of COC', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 'g2', name: 'Installation Of Materials', type: 'group' },
                    { id: 7, name: 'Layouting of Elevation', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 8, name: 'Drilling of Holes', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 9, name: 'Installation of Aluminum Frame with Bracket for Handrails', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 10, name: 'Installation of PVC Cover Handrails and End Cap', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 11, name: 'Installation of Aluminum Frame Wall Guard', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' },
                    { id: 12, name: 'Installation of PVC Cover Wall Guard and End Cap', start: '', end: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' }
                ]);
            }

            setUploadFile(null); setTeamPhoto1(null); setTeamPhoto2(null);
            setAwardDetails({ name: '', amount: '' });
            setSiteInspection({ power: false, water: false, cleared: false, permits: false, notes: '' });
            setContractChecklist({ boqReviewed: false, timelineAgreed: false, signed: false });
            setMobilizationChecklist({ safety: false, passes: false, tools: false });
            setLogisticsChecklist({ inventory: false, transport: false, notified: false });
            setShowRejectModal(false); setRejectionReason(''); setActiveTab('installers');

            setDailyLog({
                date: new Date().toISOString().split('T')[0], leadMan: '', totalArea: '', completion: '', notes: '',
                clientStartDate: '', clientEndDate: ''
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (teamPhoto1Ref.current) teamPhoto1Ref.current.value = "";
            if (teamPhoto2Ref.current) teamPhoto2Ref.current.value = "";

            setInstallers([{ id: 1, name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
            setHistoryFilter(''); setShowHistory(true);
            setCurrentLogDate(new Date().toISOString().split('T')[0]);

            fetchCommandCenterData(selectedProject.id);
        }
    }, [selectedProject]);

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

    const getAutoInstallerCount = () => {
        return dailyLogsHistory.length > 0 ? dailyLogsHistory[0].workers_count : 0;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // 🚨 CLEANED UP SITE INSPECTION HELPERS 🚨
    const updateInspectionRow = (category, index, field, value) => {
        setInspectionReport(prev => {
            const updated = [...prev[category]];
            updated[index][field] = value;
            return { ...prev, [category]: updated };
        });
    };

    const addInspectionRow = (category) => {
        setInspectionReport(prev => ({
            ...prev,
            [category]: [...prev[category], { id: Date.now(), desc: '', s1: '', s2: '', s3: '', s4: '', rem: '' }]
        }));
    };

    const removeInspectionRow = (category, index) => {
        setInspectionReport(prev => {
            const updated = [...prev[category]];
            updated.splice(index, 1);
            return { ...prev, [category]: updated };
        });
    };

    const updateInspectionMeta = (field, value) => {
        setInspectionReport(prev => ({ ...prev, [field]: value }));
    };

    // 🚨 NEW: SUBTITLE HELPER 🚨
    const updateInspectionSubtitle = (categoryKey, value) => {
        setInspectionReport(prev => ({
            ...prev,
            subtitles: { ...prev.subtitles, [categoryKey]: value }
        }));
    };

    const updateInspectionAttachment = (key, value) => {
        setInspectionReport(prev => ({
            ...prev,
            attachments: { ...prev.attachments, [key]: value }
        }));
    };

    const renderDocumentLink = (label, filePath) => {
        if (!filePath) return null;
        return (
            <div className="mb-4 p-4 rounded-xl flex justify-between items-center shadow-sm" style={{ backgroundColor: '#fdf0d5', border: '2px solid #669bbc' }}>
                <span className="font-bold flex items-center gap-3 text-lg" style={{ color: '#003049' }}>📄 {label}</span>
                <a href={`http://localhost:8000/storage/${filePath}`} target="_blank" rel="noreferrer" className="px-5 py-2 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: '#669bbc', color: '#ffffff' }}>
                    View Document
                </a>
            </div>
        );
    };

    const PrimaryButton = ({ onClick, children, disabled, bg = "#003049" }) => (
        <button 
            disabled={disabled} onClick={onClick} 
            className="w-full py-4 px-6 rounded-xl font-black shadow-md transition-all hover:shadow-lg hover:opacity-90"
            style={{ backgroundColor: disabled ? '#e2e8f0' : bg, color: disabled ? '#94a3b8' : '#ffffff', cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
            {children}
        </button>
    );

    const renderSalesPOAndWorkOrderView = () => {
        if (selectedProject.status === 'Purchase Order') {
            return (
                <div className="p-6 rounded-xl shadow-sm border-2 mb-4 bg-white" style={{ borderColor: '#e5e7eb' }}>
                    <h3 className="font-black text-xl mb-4 uppercase tracking-wide border-b-2 pb-4" style={{ color: '#003049', borderColor: '#e5e7eb' }}>Step 6: P.O. Preparation</h3>
                    <div className="p-6 rounded-xl border-2" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                        <p className="mb-4 font-bold text-lg" style={{ color: '#003049' }}>Upload the official, signed First P.O. document.</p>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="mb-6 w-full p-4 bg-white border-2 rounded-xl outline-none font-bold" style={{ borderColor: '#cbd5e1', color: '#003049' }} />
                        <PrimaryButton onClick={() => uploadAndAdvance('P.O & Work Order', 'po_document')} bg="#c1121f">Upload P.O. & Continue</PrimaryButton>
                    </div>
                </div>
            );
        }
        if (selectedProject.status === 'P.O & Work Order') {
            return (
                <div className="p-6 rounded-xl shadow-sm border-2 mb-4 bg-white" style={{ borderColor: '#e5e7eb' }}>
                    <h3 className="font-black text-xl mb-4 uppercase tracking-wide border-b-2 pb-4" style={{ color: '#003049', borderColor: '#e5e7eb' }}>Step 6: Work Order Preparation</h3>
                    <div className="p-6 rounded-xl border-2" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                        {renderDocumentLink('Verified First P.O.', selectedProject.po_document)}
                        <hr className="my-6 border-2" style={{ borderColor: '#e5e7eb' }} />
                        <p className="mb-4 font-bold text-lg" style={{ color: '#003049' }}>Upload the corresponding Work Order document.</p>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="mb-6 w-full p-4 bg-white border-2 rounded-xl outline-none font-bold" style={{ borderColor: '#cbd5e1', color: '#003049' }} />
                        <PrimaryButton onClick={() => uploadAndAdvance('Initial Site Inspection', 'work_order_document')} bg="#c1121f">Upload Work Order & Finalize</PrimaryButton>
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderBoqTable = (type, readOnly = false) => {
        const grandTotal = boqData[type]?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0) || 0;
        return (
            <div className="overflow-x-auto border-2 rounded-xl mb-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b-2" style={{ borderColor: '#e5e7eb', color: '#003049' }}>
                        <tr>
                            <th className="p-3 font-black text-xs uppercase">Description</th>
                            <th className="p-3 font-black text-xs uppercase text-center w-24">Unit</th>
                            <th className="p-3 font-black text-xs uppercase text-center w-24">Qty</th>
                            <th className="p-3 font-black text-xs uppercase text-center w-32">Unit Cost (₱)</th>
                            <th className="p-3 font-black text-xs uppercase text-center w-32">Total (₱)</th>
                            {!readOnly && <th className="p-3 w-12 text-center">Act</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {boqData[type]?.map((row, idx) => (
                            <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                                <td className="p-2"><input disabled={readOnly} value={row.description || ''} onChange={(e) => handleBoqChange(type, idx, 'description', e.target.value)} className="w-full p-2 border rounded font-bold text-gray-700 outline-none focus:border-blue-400" placeholder="Item description" /></td>
                                <td className="p-2"><input disabled={readOnly} value={row.unit || ''} onChange={(e) => handleBoqChange(type, idx, 'unit', e.target.value)} className="w-full p-2 border rounded text-center text-gray-600 outline-none focus:border-blue-400" placeholder="e.g. pcs" /></td>
                                <td className="p-2"><input disabled={readOnly} type="number" value={row.qty || ''} onChange={(e) => handleBoqChange(type, idx, 'qty', e.target.value)} className="w-full p-2 border rounded text-center font-bold outline-none focus:border-blue-400" placeholder="0" /></td>
                                <td className="p-2"><input disabled={readOnly} type="number" value={row.unitCost || ''} onChange={(e) => handleBoqChange(type, idx, 'unitCost', e.target.value)} className="w-full p-2 border rounded text-center font-bold outline-none focus:border-blue-400" placeholder="0.00" /></td>
                                <td className="p-2 text-center font-black text-gray-800 bg-gray-50 border-l border-r">₱{(parseFloat(row.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                {!readOnly && <td className="p-2 text-center"><button onClick={() => removeBoqRow(type, idx)} className="text-red-500 font-bold p-2 hover:bg-red-100 rounded transition-colors" title="Remove Item">✕</button></td>}
                            </tr>
                        ))}
                    </tbody>
                    {boqData[type]?.length > 0 && (
                        <tfoot className="bg-gray-100 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                            <tr>
                                <td colSpan="4" className="p-3 text-right font-black uppercase text-gray-500 tracking-wider">Grand Total Budget:</td>
                                <td className="p-3 text-center font-black text-[#c1121f] text-lg border-l border-r border-gray-300">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                {!readOnly && <td></td>}
                            </tr>
                        </tfoot>
                    )}
                </table>
                {!readOnly && (
                    <div className="p-3 bg-white text-center border-t border-gray-100">
                        <button onClick={() => addBoqRow(type)} className="text-[#669bbc] font-black uppercase text-sm tracking-wider px-6 py-2 hover:bg-blue-50 rounded-lg transition-colors">+ Add BOQ Item</button>
                    </div>
                )}
            </div>
        );
    };

    // 🚨 UPDATED INSPECTION RENDERER WITH EDITABLE PARENTHESES AND FADED PLACEHOLDERS 🚨
    const renderInspectionCategory = (mainTitle, categoryKey) => (
        <div className="mb-6 border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#1F4E78] text-white p-3 font-black text-center uppercase tracking-widest flex items-center justify-center gap-1">
                <span>{mainTitle} (</span>
                <input 
                    type="text" 
                    value={inspectionReport.subtitles?.[categoryKey] || ''} 
                    onChange={(e) => updateInspectionSubtitle(categoryKey, e.target.value)}
                    className="bg-transparent border-b border-white/50 text-center outline-none text-white placeholder-white/50 w-32 font-black"
                    placeholder="Type here..."
                />
                <span>)</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left bg-white border-collapse" style={{ minWidth: '700px' }}>
                    <thead className="bg-yellow-100 border-b-2 border-gray-300">
                        <tr>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider text-right pr-6 w-1/4 border-r">Description</th>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider text-center w-24 border-r">Stat 1</th>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider text-center w-24 border-r">Stat 2</th>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider text-center w-24 border-r">Stat 3</th>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider text-center w-24 border-r">Stat 4</th>
                            <th className="p-3 font-black text-xs text-gray-800 uppercase tracking-wider pl-6 border-r">Remarks</th>
                            <th className="p-3 w-12 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {inspectionReport[categoryKey].map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-0 border-r bg-gray-50">
                                    <input 
                                        type="text" 
                                        className="w-full p-3 font-bold uppercase text-xs text-right pr-6 outline-none bg-transparent text-gray-400 focus:text-gray-900 transition-colors" 
                                        placeholder="Item Name..." 
                                        value={item.desc} 
                                        onChange={(e) => updateInspectionRow(categoryKey, idx, 'desc', e.target.value)} 
                                    />
                                </td>
                                <td className="p-0 border-r bg-white"><input type="text" className="w-full p-3 font-bold text-center text-xs outline-none bg-transparent text-gray-400 focus:text-gray-900 transition-colors" placeholder="e.g. FALSE" value={item.s1} onChange={(e) => updateInspectionRow(categoryKey, idx, 's1', e.target.value)} /></td>
                                <td className="p-0 border-r bg-white"><input type="text" className="w-full p-3 font-bold text-center text-xs outline-none bg-transparent text-gray-400 focus:text-gray-900 transition-colors" placeholder="e.g. YES" value={item.s2} onChange={(e) => updateInspectionRow(categoryKey, idx, 's2', e.target.value)} /></td>
                                <td className="p-0 border-r bg-white"><input type="text" className="w-full p-3 font-bold text-center text-xs outline-none bg-transparent text-gray-400 focus:text-gray-900 transition-colors" placeholder="e.g. TRUE" value={item.s3} onChange={(e) => updateInspectionRow(categoryKey, idx, 's3', e.target.value)} /></td>
                                <td className="p-0 border-r bg-white"><input type="text" className="w-full p-3 font-bold text-center text-xs outline-none bg-transparent text-gray-400 focus:text-gray-900 transition-colors" placeholder="e.g. NO" value={item.s4} onChange={(e) => updateInspectionRow(categoryKey, idx, 's4', e.target.value)} /></td>
                                <td className="p-0 bg-white border-r"><input type="text" className="w-full p-3 font-medium outline-none bg-transparent pl-6 text-gray-400 focus:text-gray-900 transition-colors" placeholder="Optional notes..." value={item.rem} onChange={(e) => updateInspectionRow(categoryKey, idx, 'rem', e.target.value)} /></td>
                                <td className="p-2 text-center bg-white"><button onClick={() => removeInspectionRow(categoryKey, idx)} className="text-red-500 font-bold p-2 hover:bg-red-100 rounded transition-colors">✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 p-3 text-center border-t-2 border-gray-300">
                <button onClick={() => addInspectionRow(categoryKey)} className="text-sm font-bold text-[#1F4E78]">+ Add Item</button>
            </div>
        </div>
    );

    const addBoqRow = (type) => setBoqData({ ...boqData, [type]: [...boqData[type], { description: '', unit: '', qty: '', unitCost: '', total: 0 }] });
    const removeBoqRow = (type, index) => { const updatedTable = [...boqData[type]]; updatedTable.splice(index, 1); setBoqData({ ...boqData, [type]: updatedTable }); };
    const handleBoqChange = (type, index, field, value) => {
        const updatedTable = [...boqData[type]]; updatedTable[index][field] = value;
        if (field === 'qty' || field === 'unitCost') updatedTable[index].total = (parseFloat(updatedTable[index].qty) || 0) * (parseFloat(updatedTable[index].unitCost) || 0);
        setBoqData({ ...boqData, [type]: updatedTable });
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

    // --- EXCEL EXPORT BUILDERS ---
    const exportMaterialsToExcel = async () => {
        if (materialsTracking.length === 0) return alert("No materials data to export!");
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Materials Monitoring');
            const sortedDates = getAllSortedDates();

            const cols = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 30 }];
            sortedDates.forEach(() => { cols.push({ width: 15 }); cols.push({ width: 15 }); });
            sheet.columns = cols;
            const totalCols = 8 + (sortedDates.length * 2);
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

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
                const rowData = [item.description, item.unit, item.delivery_date || '', item.delivery_qty || '', item.qty, item.installed, item.remaining, item.remarks || '' ];
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

    // 🚨 PERFECTED GANTT CHART EXCEL FORMAT 🚨
    const exportGanttChartToExcel = async () => {
        if (timelineTasks.length === 0) return alert("No tasks to export!");

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Gantt Chart');

            const metrics = getProjectMetrics();
            if (!metrics.min || !metrics.max) return alert("Please ensure tasks have Plan Start and End dates to generate the chart.");

            const timelineRange = [];
            let currentDate = new Date(metrics.min);
            currentDate.setHours(0,0,0,0);
            
            const normalizedMax = new Date(metrics.max);
            normalizedMax.setHours(23,59,59,999);

            while (currentDate <= normalizedMax) {
                timelineRange.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // A: Task, B: Start, C: End, D: Duration, E: Unit, F: %, G: Target/Actual Tags
            const cols = [
                { width: 45 }, // A: TASK NAME
                { width: 15 }, // B: START DATE
                { width: 15 }, // C: END DATE
                { width: 12 }, // D: DURATION
                { width: 10 }, // E: UNIT
                { width: 15 }, // F: % COMPLETE
                { width: 12 }  // G: TARGET/ACTUAL
            ];
            timelineRange.forEach(() => cols.push({ width: 5 }));
            sheet.columns = cols;

            const headerBlueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; 
            const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
            const textWhite = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
            const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Top Header Metrics Block
            sheet.mergeCells('A1:C2'); sheet.getCell('A1').value = 'PROJECT NAME\n' + selectedProject.project_name;
            sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            sheet.getCell('A1').fill = headerBlueFill; sheet.getCell('A1').font = textWhite; sheet.getCell('A1').border = borderThin;

            sheet.getCell('B1').value = 'PROJECT DURATION'; sheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('B1').fill = headerBlueFill; sheet.getCell('B1').font = textWhite; sheet.getCell('B1').border = borderThin;
            sheet.getCell('C1').value = 'PROJECT START DATE'; sheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; sheet.getCell('C1').fill = headerBlueFill; sheet.getCell('C1').font = textWhite; sheet.getCell('C1').border = borderThin;
            sheet.getCell('D1').value = 'PROJECT END DATE'; sheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; sheet.getCell('D1').fill = headerBlueFill; sheet.getCell('D1').font = textWhite; sheet.getCell('D1').border = borderThin;
            sheet.getCell('E1').value = 'DATE AS OF:'; sheet.getCell('E1').fill = headerBlueFill; sheet.getCell('E1').font = textWhite; sheet.getCell('E1').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('E1').border = borderThin;

            sheet.getCell('A2').value = selectedProject.project_name; sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('A2').border = borderThin; sheet.getCell('A2').font = { bold: true };
            sheet.getCell('B2').value = metrics.duration; sheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('B2').border = borderThin; sheet.getCell('B2').font = { bold: true };
            sheet.getCell('C2').value = metrics.min.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }); sheet.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('C2').border = borderThin; sheet.getCell('C2').font = { bold: true };
            sheet.getCell('D2').value = metrics.max.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }); sheet.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('D2').border = borderThin; sheet.getCell('D2').font = { bold: true };
            sheet.getCell('E2').value = new Date().toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' }); sheet.getCell('E2').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('E2').border = borderThin; sheet.getCell('E2').font = { bold: true };

            // Gantt Table Headers (Matches Reference Format)
            sheet.mergeCells('A4:A5'); sheet.getCell('A4').value = 'TASK NAME'; sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('A4').fill = headerBlueFill; sheet.getCell('A4').font = textWhite; sheet.getCell('A4').border = borderThin;
            sheet.mergeCells('B4:D4'); sheet.getCell('B4').value = 'PLAN'; sheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('B4').fill = headerBlueFill; sheet.getCell('B4').font = textWhite; sheet.getCell('B4').border = borderThin;
            
            sheet.getCell('B5').value = 'START DATE'; sheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('B5').fill = headerBlueFill; sheet.getCell('B5').font = textWhite; sheet.getCell('B5').border = borderThin;
            sheet.getCell('C5').value = 'END DATE'; sheet.getCell('C5').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('C5').fill = headerBlueFill; sheet.getCell('C5').font = textWhite; sheet.getCell('C5').border = borderThin;
            sheet.getCell('D5').value = 'DURATION'; sheet.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('D5').fill = headerBlueFill; sheet.getCell('D5').font = textWhite; sheet.getCell('D5').border = borderThin;
            
            sheet.mergeCells('E4:E5'); sheet.getCell('E4').value = 'UNIT'; sheet.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('E4').fill = headerBlueFill; sheet.getCell('E4').font = textWhite; sheet.getCell('E4').border = borderThin;
            sheet.mergeCells('F4:F5'); sheet.getCell('F4').value = 'PERCENT\nCOMPLETE'; sheet.getCell('F4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; sheet.getCell('F4').fill = headerBlueFill; sheet.getCell('F4').font = textWhite; sheet.getCell('F4').border = borderThin;

            // Timeline Header Dates
            timelineRange.forEach((date, i) => {
                const colIdx = 8 + i; 
                const dayCell = sheet.getCell(4, colIdx);
                dayCell.value = i;
                dayCell.alignment = { horizontal: 'center' }; dayCell.border = borderThin; dayCell.font = { size: 9 };
                
                const dateCell = sheet.getCell(5, colIdx);
                dateCell.value = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                dateCell.alignment = { horizontal: 'center', textRotation: 90 }; dateCell.border = borderThin; dateCell.font = { size: 9 };
            });

            let currentRow = 6;
            timelineTasks.forEach((task) => {
                if (task.type === 'group') {
                    sheet.mergeCells(currentRow, 1, currentRow, 7);
                    sheet.getCell(currentRow, 1).value = task.name;
                    sheet.getCell(currentRow, 1).font = { bold: true };
                    sheet.getCell(currentRow, 1).fill = grayFill;
                    
                    for(let c = 1; c < 8 + timelineRange.length; c++) {
                        sheet.getCell(currentRow, c).border = borderThin;
                        if(c > 7) sheet.getCell(currentRow, c).fill = grayFill;
                    }
                    currentRow++;
                } else {
                    // Plan/Target Row
                    sheet.getCell(currentRow, 1).value = task.name;
                    sheet.getCell(currentRow, 2).value = task.start ? parseLocal(task.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '';
                    sheet.getCell(currentRow, 3).value = task.end ? parseLocal(task.end).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '';
                    sheet.getCell(currentRow, 4).value = task.duration;
                    sheet.getCell(currentRow, 5).value = task.unit;
                    sheet.getCell(currentRow, 6).value = `${task.percent || 0}%`;
                    sheet.getCell(currentRow, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
                    
                    // TARGET Tag
                    sheet.getCell(currentRow, 7).value = 'TARGET';
                    sheet.getCell(currentRow, 7).font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 }; 
                    sheet.getCell(currentRow, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                    sheet.getCell(currentRow, 7).alignment = { horizontal: 'center', vertical: 'middle' };

                    // 🚨 TARGET LOGIC FIX: Normalized Dates to Midnight 🚨
                    if (task.start && task.end) {
                        const start = parseLocal(task.start); start.setHours(0,0,0,0);
                        const end = parseLocal(task.end); end.setHours(0,0,0,0);
                        timelineRange.forEach((d, i) => {
                            const checkDate = new Date(d); checkDate.setHours(0,0,0,0);
                            if (checkDate >= start && checkDate <= end) {
                                sheet.getCell(currentRow, 8 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; 
                            }
                        });
                    }
                    currentRow++;

                    // Actual Row
                    sheet.getCell(currentRow, 1).value = ''; 
                    sheet.getCell(currentRow, 2).value = '';
                    sheet.getCell(currentRow, 3).value = '';
                    sheet.getCell(currentRow, 4).value = '';
                    sheet.getCell(currentRow, 5).value = '';
                    sheet.getCell(currentRow, 6).value = '';
                    
                    // ACTUAL Tag
                    sheet.getCell(currentRow, 7).value = 'ACTUAL';
                    sheet.getCell(currentRow, 7).font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 }; 
                    sheet.getCell(currentRow, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
                    sheet.getCell(currentRow, 7).alignment = { horizontal: 'center', vertical: 'middle' };

                    // 🚨 ACTUAL GREEN BAR FIX: Starts precisely at PLAN START and uses Gradient for Half Cells! 🚨
                    if (task.start && parseFloat(task.percent) > 0) {
                        const baseStart = parseLocal(task.start);
                        baseStart.setHours(0,0,0,0);
                        
                        const calcDuration = parseInt(task.duration) || 0;
                        const exactFillDays = calcDuration * (parseFloat(task.percent) / 100);
                        const fullDays = Math.floor(exactFillDays);
                        const hasPartialDay = (exactFillDays - fullDays) > 0;
                        
                        timelineRange.forEach((d, i) => {
                            const checkDate = new Date(d); checkDate.setHours(0,0,0,0);
                            const diff = Math.round((checkDate - baseStart) / 86400000);
                            
                            if (diff >= 0 && diff < fullDays) {
                                // Full solid green fill for fully completed days
                                sheet.getCell(currentRow, 8 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } }; 
                            } else if (diff === fullDays && hasPartialDay) {
                                // Half-cell fill magic using a subtle gradient from left to right!
                                sheet.getCell(currentRow, 8 + i).fill = { 
                                    type: 'gradient', gradient: 'angle', degree: 90,
                                    stops: [ {position:0, color:{argb:'FF00B050'}}, {position:0.5, color:{argb:'FF00B050'}}, {position:0.51, color:{argb:'FFFFFFFF'}}, {position:1, color:{argb:'FFFFFFFF'}} ]
                                };
                            }
                        });
                    }

                    for(let r = currentRow-1; r <= currentRow; r++) {
                        for(let c = 1; c < 8 + timelineRange.length; c++) {
                            sheet.getCell(r, c).border = borderThin;
                            if(c < 7) sheet.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' };
                        }
                    }
                    currentRow++;
                }
            });

            // 🚨 BOTTOM SUMMARY METRICS (Placed exactly like reference image) 🚨
            const bottomRow = currentRow;
            sheet.mergeCells(`A${bottomRow}:E${bottomRow}`);
            sheet.getCell(`A${bottomRow}`).value = 'PROJECT DURATION';
            sheet.getCell(`A${bottomRow}`).fill = headerBlueFill; sheet.getCell(`A${bottomRow}`).font = textWhite; sheet.getCell(`A${bottomRow}`).border = borderThin; sheet.getCell(`A${bottomRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getCell(`F${bottomRow}`).value = metrics.duration;
            sheet.getCell(`F${bottomRow}`).font = { bold: true, color: { argb: 'FFFF0000' } }; sheet.getCell(`F${bottomRow}`).alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell(`F${bottomRow}`).border = borderThin;

            sheet.mergeCells(`A${bottomRow + 1}:E${bottomRow + 1}`);
            sheet.getCell(`A${bottomRow + 1}`).value = 'NO. OF INSTALLERS';
            sheet.getCell(`A${bottomRow + 1}`).fill = headerBlueFill; sheet.getCell(`A${bottomRow + 1}`).font = textWhite; sheet.getCell(`A${bottomRow + 1}`).border = borderThin; sheet.getCell(`A${bottomRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getCell(`F${bottomRow + 1}`).value = getAutoInstallerCount();
            sheet.getCell(`F${bottomRow + 1}`).font = { bold: true, color: { argb: 'FFFF0000' } }; sheet.getCell(`F${bottomRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell(`F${bottomRow + 1}`).border = borderThin;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${selectedProject.project_name}_Gantt_Chart.xlsx`);

        } catch (error) {
            console.error("Error generating Gantt:", error);
            alert(`Failed to export Gantt Chart: ${error.message}`);
        }
    };

    // 🚨 EXCEL EXPORT FOR SITE INSPECTION 🚨
    const exportInspectionToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Site Inspection');

            sheet.columns = [
                { width: 40 }, // A (Description)
                { width: 15 }, // B (Stat 1)
                { width: 20 }, // C (Stat 2)
                { width: 15 }, // D (Stat 3)
                { width: 15 }, // E (Stat 4)
                { width: 30 }  // F (Remarks)
            ];

            const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            sheet.mergeCells('A1:F1');
            const mainTitle = sheet.getCell('A1');
            mainTitle.value = 'SITE INSPECTION CHECKLIST';
            mainTitle.font = { bold: true, size: 14 };
            mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };
            mainTitle.fill = yellowFill;
            mainTitle.border = borderThin;

            const addHeaderRow = (row, col1, val1) => {
                sheet.getCell(`A${row}`).value = col1;
                sheet.getCell(`A${row}`).border = borderThin;
                sheet.mergeCells(`B${row}:F${row}`);
                sheet.getCell(`B${row}`).value = val1;
                sheet.getCell(`B${row}`).border = borderThin;
            };

            addHeaderRow(2, 'SUBJECT:', 'SITE INSPECTION CHECKLIST (FOR INTERNAL INSPECTION ONLY)');
            addHeaderRow(3, 'PROJECT NAME:', selectedProject.project_name);
            addHeaderRow(4, 'LOCATION:', '');
            addHeaderRow(5, 'PROJECT SCOPE:', 'INSTALLATION OF HANDRAILS, WALLGUARD, AND CORNERGUARD');
            addHeaderRow(6, 'DURATION:', getProjectMetrics().duration + ' Days');
            addHeaderRow(7, 'DATE OF INSPECTION:', currentLogDate);
            addHeaderRow(8, 'PROJECT IN CHARGE:', inspectionReport.preparedBy);

            sheet.addRow([]); // Row 9 Blank

            // PRE CHECKLIST
            sheet.mergeCells('A10:F10');
            const preCheckHeader = sheet.getCell('A10');
            preCheckHeader.value = 'PRE CHECKLIST';
            preCheckHeader.font = { bold: true };
            preCheckHeader.alignment = { horizontal: 'center' };
            preCheckHeader.fill = yellowFill;
            preCheckHeader.border = borderThin;

            sheet.mergeCells('A11:E11');
            const wallTitle = sheet.getCell('A11');
            wallTitle.value = inspectionReport.subtitles?.preChecklist?.toUpperCase() || 'WALL';
            wallTitle.font = { bold: true, color: { argb: 'FFFF0000' } }; // Red text
            wallTitle.alignment = { horizontal: 'center' };
            wallTitle.border = borderThin;
            const wallRemarks = sheet.getCell('F11');
            wallRemarks.value = 'REMARKS';
            wallRemarks.font = { bold: true };
            wallRemarks.alignment = { horizontal: 'center' };
            wallRemarks.border = borderThin;

            let currentRow = 12;
            inspectionReport.preChecklist.forEach(item => {
                const row = sheet.addRow([item.desc, item.s1, item.s2, item.s3, item.s4, item.rem]);
                row.eachCell(c => { c.border = borderThin; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
                row.getCell(1).alignment = { horizontal: 'right' };
                row.getCell(1).font = { italic: true, bold: true };
                currentRow++;
            });

            sheet.addRow([]); currentRow++;

            // INSTALLATION PROPER
            sheet.mergeCells(`A${currentRow}:F${currentRow}`);
            const instProperHeader = sheet.getCell(`A${currentRow}`);
            instProperHeader.value = 'INSTALLATION PROPER';
            instProperHeader.font = { bold: true };
            instProperHeader.alignment = { horizontal: 'center' };
            instProperHeader.fill = yellowFill;
            instProperHeader.border = borderThin;
            currentRow++;

            // Helper to render red sections dynamically
            const renderSection = (title, itemsArray) => {
                sheet.mergeCells(`A${currentRow}:E${currentRow}`);
                const titleCell = sheet.getCell(`A${currentRow}`);
                titleCell.value = title;
                titleCell.font = { bold: true, color: { argb: 'FFFF0000' } };
                titleCell.alignment = { horizontal: 'center' };
                titleCell.border = borderThin;
                
                const remCell = sheet.getCell(`F${currentRow}`);
                remCell.value = 'REMARKS';
                remCell.font = { bold: true };
                remCell.alignment = { horizontal: 'center' };
                remCell.border = borderThin;
                currentRow++;

                itemsArray.forEach(item => {
                    const row = sheet.addRow([item.desc, item.s1, item.s2, item.s3, item.s4, item.rem]);
                    row.eachCell(c => { c.border = borderThin; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
                    row.getCell(1).alignment = { horizontal: 'right' };
                    row.getCell(1).font = { italic: true, bold: true };
                    currentRow++;
                });
            };

            renderSection(inspectionReport.subtitles?.handrails?.toUpperCase() || 'HANDRAILS', inspectionReport.handrails);
            renderSection(inspectionReport.subtitles?.wallguard?.toUpperCase() || 'WALLGUARD', inspectionReport.wallguard);
            renderSection(inspectionReport.subtitles?.cornerguard?.toUpperCase() || 'CORNERGUARD', inspectionReport.cornerguard);

            sheet.addRow([]); currentRow++;

            // FOOTER & ATTACHMENTS
            const attRow = sheet.addRow([
                'ATTACHMENTS:', 
                inspectionReport.attachments.approvedLayout ? 'APPROVED LAYOUT' : 'FALSE', 
                'FALSE', 
                inspectionReport.attachments.other ? 'OTHER' : 'FALSE', 
                '', 
                ''
            ]);
            attRow.getCell(2).alignment = { wrapText: true, horizontal: 'center' };
            attRow.getCell(1).alignment = { horizontal: 'right', italic: true };
            
            const kpRow = sheet.addRow(['', inspectionReport.attachments.keyplan ? 'KEYPLAN' : '', '', '', '', '']);
            kpRow.getCell(2).alignment = { horizontal: 'center' };
            
            sheet.addRow([]);
            sheet.addRow([]);
            
            const signRow1 = sheet.addRow(['PREPARED BY:', '', '', '', 'CHECKED BY:', '']);
            const signRow2 = sheet.addRow(['', '', '', '', '', '']);
            const signRow3 = sheet.addRow(['', '', '', '', inspectionReport.checkedBy, '']);
            const signRow4 = sheet.addRow(['PROJECT IN CHARGE', '', '', '', 'PROJECT MANAGER', '']);
            
            signRow1.getCell(1).alignment = { horizontal: 'left' };
            signRow1.getCell(5).alignment = { horizontal: 'left' };
            signRow3.getCell(5).alignment = { horizontal: 'center' };
            signRow4.getCell(1).alignment = { horizontal: 'center' };
            signRow4.getCell(5).alignment = { horizontal: 'center' };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${selectedProject.project_name}_Site_Inspection.xlsx`);

        } catch (error) {
            console.error("Error generating Inspection Excel:", error);
            alert(`Failed to export Inspection Report: ${error.message}`);
        }
    };


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
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => sheet.getCell(`${c}${rowNum}`).border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} });
            };
            addInfoRow(3, 'Project', selectedProject.project_name);
            addInfoRow(4, 'Location', 'Not specified'); 
            addInfoRow(5, 'Requirement', 'Installation Works');
            addInfoRow(6, 'Installer (Lead Man)', log.lead_man || 'N/A');
            addInfoRow(7, 'Total Area', log.total_area || 'N/A');
            addInfoRow(8, 'Date', log.log_date);

            sheet.mergeCells('A9:F9'); const instHeader = sheet.getCell('A9'); instHeader.value = 'NO. OF INSTALLER'; instHeader.alignment = { horizontal: 'center' }; instHeader.font = { bold: true }; instHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } }; instHeader.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };

            const installerHeaders = sheet.addRow(['NO.', 'NAME', 'TIME IN', 'TIME OUT', 'PHOTO ATTACHMENT', 'CONCERNS / REMARKS']);
            installerHeaders.eachCell(c => { c.font = {bold: true}; c.alignment = {horizontal:'center'}; c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFFFE699'}}; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; });

            const savedInstallers = safeParseJSON(log.installers_data);
            const startRow = 11; const totalRows = savedInstallers.length > 0 ? savedInstallers.length : 1;
            
            if(savedInstallers.length === 0) {
                sheet.addRow(['', 'No installers logged', '', '', '', '']);
            } else {
                savedInstallers.forEach((inst, idx) => {
                    const row = sheet.addRow([idx + 1, inst.name, inst.timeIn, inst.timeOut, '', inst.remarks]);
                    row.height = 40; 
                    row.eachCell(c => { c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; c.alignment = {vertical: 'middle', horizontal: 'center'}; });
                });
            }

            sheet.mergeCells(`E${startRow}:E${startRow + totalRows - 1}`);

            const fetchBase64Image = async (path) => {
                const imgRes = await axios.get(`http://localhost:8000/api/fetch-image?path=${path}`, config);
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
                } catch(e) { console.error("Failed to load team photos", e); }
            }

            const matRow = sheet.lastRow.number + 1;
            sheet.mergeCells(`A${matRow}:F${matRow}`);
            const matHeader = sheet.getCell(`A${matRow}`); matHeader.value = 'MATERIALS ON SITE'; matHeader.alignment = { horizontal: 'center' }; matHeader.font = { bold: true }; matHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; matHeader.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };

            const matHeaders = sheet.addRow(['NO.', 'DESCRIPTION', 'QUANTITY DELIVERED', 'QUANTITY INSTALLED', 'REMAINING QUANTITY', 'UNITS']);
            matHeaders.eachCell(c => { c.font = {bold: true}; c.alignment = {horizontal:'center', wrapText: true}; c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFF00'}}; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; });

            if(materialsTracking.length === 0) sheet.addRow(['', 'No materials logged', '', '', '', '']);
            materialsTracking.forEach((mat, idx) => {
                const row = sheet.addRow([idx + 1, mat.description, mat.qty, mat.installed, mat.remaining, mat.unit]);
                row.eachCell(c => { c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; c.alignment={horizontal:'center'}; });
                row.getCell(2).alignment = {horizontal:'left'};
            });

            const statHeaderRow = sheet.addRow(['PROJECT STATUS']); sheet.mergeCells(`A${statHeaderRow.number}:F${statHeaderRow.number}`); statHeaderRow.getCell(1).alignment = { horizontal: 'center' }; statHeaderRow.getCell(1).font = { bold: true }; statHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; statHeaderRow.getCell(1).border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };

            const statSubRow = sheet.addRow(['PERCENTAGE (%) OF ACCOMPLISHMENT', '', 'STATUS / REMARKS', '', '', '']);
            sheet.mergeCells(`A${statSubRow.number}:B${statSubRow.number}`); sheet.mergeCells(`C${statSubRow.number}:F${statSubRow.number}`);
            statSubRow.eachCell(c => { c.font = { bold: true }; c.alignment = { horizontal: 'center' }; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });

            const statDataRow = sheet.addRow([`${log.accomplishment_percent || 0}%`, '', log.remarks || 'No remarks provided', '', '', '']);
            sheet.mergeCells(`A${statDataRow.number}:B${statDataRow.number}`); sheet.mergeCells(`C${statDataRow.number}:F${statDataRow.number}`);
            statDataRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; });
            statDataRow.height = 40;

            const dateHeaderRow = sheet.addRow(['', 'PROJECT START DATE\n(DEPLOYMENT DATE)', '', 'PROJECT END DATE\n(TURN OVER DATE)', '', 'REMARKS']);
            sheet.mergeCells(`B${dateHeaderRow.number}:C${dateHeaderRow.number}`); sheet.mergeCells(`D${dateHeaderRow.number}:E${dateHeaderRow.number}`);
            dateHeaderRow.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFF0000' } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
            dateHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'none' }; dateHeaderRow.getCell(1).border = {}; dateHeaderRow.height = 30;

            const clientRow = sheet.addRow(['From Client', log.client_start_date ? parseLocal(log.client_start_date).toLocaleDateString() : 'N/A', '', log.client_end_date ? parseLocal(log.client_end_date).toLocaleDateString() : 'N/A', '', '']);
            sheet.mergeCells(`B${clientRow.number}:C${clientRow.number}`); sheet.mergeCells(`D${clientRow.number}:E${clientRow.number}`);
            clientRow.eachCell(c => { c.alignment = {horizontal:'center'}; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}} });
            clientRow.getCell(1).font = { bold: true };

            const actualDepRow = sheet.addRow(['Actual Deployment', log.start_date ? parseLocal(log.start_date).toLocaleDateString() : 'N/A', '', log.end_date ? parseLocal(log.end_date).toLocaleDateString() : 'N/A', '', '']);
            sheet.mergeCells(`B${actualDepRow.number}:C${actualDepRow.number}`); sheet.mergeCells(`D${actualDepRow.number}:E${actualDepRow.number}`);
            actualDepRow.eachCell(c => { c.alignment = {horizontal:'center'}; c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}} });
            actualDepRow.getCell(1).font = { bold: true };

            const accHeaderRow = sheet.addRow(['ACCOMPLISHMENT REPORT ON SITE']); sheet.mergeCells(`A${accHeaderRow.number}:F${accHeaderRow.number}`); accHeaderRow.getCell(1).alignment = { horizontal: 'center' }; accHeaderRow.getCell(1).font = { bold: true }; accHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; accHeaderRow.getCell(1).border = {top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
            const proofRow = sheet.addRow(['PROOF OF ACCOMPLISHED WORK']); sheet.mergeCells(`A${proofRow.number}:F${proofRow.number}`); proofRow.getCell(1).alignment = { horizontal: 'center' }; proofRow.getCell(1).font = { bold: true }; proofRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; proofRow.getCell(1).border = {top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};

            if (log.photo_path) {
                try {
                    const imgRes = await axios.get(`http://localhost:8000/api/fetch-image?path=${log.photo_path}`, config);
                    if (imgRes.data && imgRes.data.base64) {
                        const imageId = workbook.addImage({ base64: imgRes.data.base64, extension: imgRes.data.extension });
                        const imageStartRow = sheet.lastRow.number;
                        for(let i=0; i<15; i++) { sheet.addRow(['','','','','','']); }
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

    const advanceStatus = async (nextStatus) => { try { await axios.patch(`http://localhost:8000/api/projects/${selectedProject.id}/status`, { status: nextStatus }, config); alert(`Project advanced to: ${nextStatus}`); setCurrentView('home'); } catch (err) { console.error(err); } };
    
    const uploadAndAdvance = async (nextStatus, fileKey) => {
        if (!uploadFile && fileKey) return alert("Please select a file first to proceed!");
        try { const formData = new FormData(); formData.append('status', nextStatus); if (fileKey) formData.append(fileKey, uploadFile); formData.append('_method', 'PATCH'); if (awardDetails.name) formData.append('subcontractor_name', awardDetails.name); if (awardDetails.amount) formData.append('contract_amount', awardDetails.amount); await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/status`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); alert(`Status advanced to: ${nextStatus}`); setCurrentView('home'); } 
        catch (err) { console.error(err); }
    };

    const saveTrackingData = async (type) => {
        try {
            const payload = {};
            if (type === 'materials') payload.materials_tracking = JSON.stringify(materialsTracking);
            if (type === 'timeline') payload.timeline_tracking = JSON.stringify(timelineTasks);
            if (type === 'inspection') payload.site_inspection_report = JSON.stringify(inspectionReport);

            await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/tracking`, payload, config);
            alert(`${type === 'materials' ? 'Materials Data' : type === 'inspection' ? 'Site Inspection Report' : 'Project Timeline'} saved successfully!`);
        } catch (err) { console.error(err); alert("Failed to save tracking data to server."); }
    };

    // 🚨 SMART TIMELINE UPDATER WITH AUTO-STATUS 🚨
    const updateTimelineTask = (index, field, value) => { 
        const updated = [...timelineTasks]; 
        
        if (field === 'percent') {
            let p = parseInt(value, 10);
            if (isNaN(p)) p = '';
            else if (p < 0) p = 0;
            else if (p > 100) p = 100;
            updated[index][field] = p;
        } else {
            updated[index][field] = value; 
        }
        
        // Auto-calculate Duration based on PLAN start/end
        if (field === 'start' || field === 'end') {
            const baseStart = parseLocal(updated[index].start);
            const baseEnd = parseLocal(updated[index].end);
            
            if (baseStart && baseEnd && baseEnd >= baseStart) {
                const diffTime = Math.abs(baseEnd - baseStart);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                updated[index].duration = diffDays;
            } else {
                updated[index].duration = '';
            }
        }

        // 🚨 AUTO STATUS LOGIC 🚨
        if (updated[index].type !== 'group') {
            let currentPercent = parseInt(updated[index].percent, 10) || 0;
            let endDateStr = updated[index].end;
            let newStatus = updated[index].status;

            if (currentPercent === 100) {
                newStatus = 'Completed';
            } else {
                let isDelayed = false;
                if (endDateStr) {
                    const endDate = parseLocal(endDateStr);
                    if (endDate) {
                        endDate.setHours(23, 59, 59, 999);
                        if (new Date() > endDate) isDelayed = true;
                    }
                }

                if (isDelayed) {
                    newStatus = 'Delayed';
                } else if (currentPercent > 0) {
                    newStatus = 'In Progress';
                } else {
                    newStatus = 'Pending';
                }
            }
            updated[index].status = newStatus;
        }
        
        setTimelineTasks(updated); 
    };

    const updateInstaller = (index, field, value) => { const updated = [...installers]; updated[index][field] = value; setInstallers(updated); };

    const submitDailyLog = async () => {
        if (!dailyLog.date || !dailyLog.completion) return alert("Fill required fields.");
        setIsSubmittingLog(true);
        try {
            const formData = new FormData();
            formData.append('log_date', dailyLog.date); formData.append('lead_man', dailyLog.leadMan); formData.append('total_area', dailyLog.totalArea); formData.append('accomplishment_percent', dailyLog.completion);
            if (dailyLog.clientStartDate) formData.append('client_start_date', dailyLog.clientStartDate);
            if (dailyLog.clientEndDate) formData.append('client_end_date', dailyLog.clientEndDate);
            if (dailyLog.actualStartDate) formData.append('start_date', dailyLog.actualStartDate);
            if (dailyLog.actualEndDate) formData.append('end_date', dailyLog.actualEndDate);
            formData.append('workers_count', installers.length);
            formData.append('installers_data', JSON.stringify(installers.map(({photoFile, ...rest}) => rest)));
            formData.append('remarks', dailyLog.notes); 
            if (uploadFile) formData.append('photo', uploadFile);
            if (teamPhoto1) formData.append('team_photo_1', teamPhoto1);
            if (teamPhoto2) formData.append('team_photo_2', teamPhoto2);
            await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/daily-logs`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            alert("Daily Progress Report saved successfully!");
            setDailyLog({ date: new Date().toISOString().split('T')[0], leadMan: '', totalArea: '', completion: '', notes: '', clientStartDate: '', clientEndDate: '', actualStartDate: '', actualEndDate: '' });
            setUploadFile(null); setTeamPhoto1(null); setTeamPhoto2(null);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
            if (teamPhoto1Ref.current) teamPhoto1Ref.current.value = "";
            if (teamPhoto2Ref.current) teamPhoto2Ref.current.value = "";
            setInstallers([{ id: 1, name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }]);
            fetchCommandCenterData(selectedProject.id);
        } catch (err) { console.error(err); alert(`Failed to save report. Server says: ${err.response?.data?.message || err.message}`); } finally { setIsSubmittingLog(false); }
    };

    const submitIssueLog = async () => {
        if (!issueLog.problem.trim()) return alert("Please describe the problem encountered.");
        setIsSubmittingIssue(true);
        try { await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/issues`, { problem: issueLog.problem, solution: issueLog.solution }, config); alert("Issue logged successfully!"); setIssueLog({ problem: '', solution: '' }); fetchCommandCenterData(selectedProject.id); } 
        catch (err) { alert(`Failed to save issue. Server says: ${err.response?.data?.message || err.message}`); } finally { setIsSubmittingIssue(false); }
    };

    const executeRejection = async () => {
        if (!rejectionReason.trim()) return alert("Please provide a reason for the rejection.");
        try { await axios.patch(`http://localhost:8000/api/projects/${selectedProject.id}/status`, { status: rejectTargetPhase, rejection_notes: rejectionReason }, config); alert(`Project Rejected. Sent back to: ${rejectTargetPhase}`); setShowRejectModal(false); setCurrentView('home'); } 
        catch (err) { console.error(err); }
    };

    const openRejectModal = (targetPhase) => { setRejectTargetPhase(targetPhase); setShowRejectModal(true); };

    if (currentView === 'workflow-detail' && selectedProject) {
        const isInspectionReady = siteInspection.power && siteInspection.water && siteInspection.cleared && siteInspection.permits;
        const isContractReady = contractChecklist.boqReviewed && contractChecklist.timelineAgreed && contractChecklist.signed;
        const isMobilizationReady = mobilizationChecklist.safety && mobilizationChecklist.passes && mobilizationChecklist.tools && uploadFile;
        const isAwardFormValid = uploadFile && awardDetails.name.trim() !== '' && awardDetails.amount.trim() !== '';
        
        const filteredHistory = dailyLogsHistory.filter(log => log.log_date.includes(historyFilter));
        const metrics = getProjectMetrics();

        return (
            <div className="project-module-container light-theme font-sans relative">

                <style>{`
                    .no-spinners::-webkit-inner-spin-button,
                    .no-spinners::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                    .no-spinners { -moz-appearance: textfield; }
                `}</style>

                {/* MODALS */}
                {showRejectModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 48, 73, 0.7)' }}>
                        <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl border-4" style={{ borderColor: '#c1121f' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-3xl">⚠️</span>
                                <h3 className="text-2xl font-black" style={{ color: '#c1121f' }}>Reject & Send Back</h3>
                            </div>
                            <p className="text-gray-600 mb-6 font-medium">Please provide specific notes on what needs to be fixed before this can be approved.</p>
                            <textarea className="w-full p-4 border-2 rounded-xl shadow-inner outline-none focus:border-red-400 font-medium mb-6" style={{ borderColor: '#cbd5e1' }} rows="4" placeholder="e.g. Missing 50 bags of cement in the BOQ..." value={rejectionReason || ''} onChange={(e) => setRejectionReason(e.target.value)} />
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setShowRejectModal(false)} className="px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">Cancel</button>
                                <button onClick={executeRejection} className="px-6 py-3 rounded-xl font-black text-white shadow-md hover:opacity-90 transition-all" style={{ backgroundColor: '#c1121f' }}>Confirm Rejection</button>
                            </div>
                        </div>
                    </div>
                )}

                {showRequestModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 48, 73, 0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', borderTop: '8px solid #f97316', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#003049' }}>📦 Material Requisition Alert</h3>
                                <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                            </div>
                            <p style={{ marginBottom: '20px', fontWeight: 'bold', color: '#475569' }}>Select items from the approved BOQ to request from Logistics:</p>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '2px solid #e5e7eb', borderRadius: '12px', marginBottom: '20px' }}>
                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 1, borderBottom: '2px solid #e5e7eb' }}>
                                        <tr>
                                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>Description</th>
                                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>Unit</th>
                                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>Needed Qty</th>
                                            <th style={{ padding: '12px', textAlign: 'center' }}>Select</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {boqData.finalBOQ.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '0.875rem' }}>{item.description}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.875rem' }}>{item.unit}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    <input type="number" placeholder="Qty" style={{ width: '80px', padding: '8px', border: '2px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const existing = requestItems.find(i => i.description === item.description);
                                                            if (existing) { existing.requestedQty = val; setRequestItems([...requestItems]); } 
                                                            else { setRequestItems([...requestItems, { ...item, requestedQty: val }]); }
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <input type="checkbox" style={{ width: '20px', height: '20px', cursor: 'pointer' }} checked={requestItems.some(i => i.description === item.description)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setRequestItems([...requestItems, { ...item, requestedQty: 0 }]);
                                                            else setRequestItems(requestItems.filter(i => i.description !== item.description));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button style={{ flex: 1, padding: '16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }} onClick={() => setShowRequestModal(false)}>Cancel</button>
                                <button style={{ flex: 1, padding: '16px', backgroundColor: '#f97316', border: 'none', borderRadius: '12px', fontWeight: '900', color: '#ffffff', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(249, 115, 22, 0.2)' }}
                                    onClick={async () => {
                                        if (requestItems.length === 0) return alert("Select at least one item.");
                                        try {
                                            await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/material-requests`, { items: JSON.stringify(requestItems), requester_name: user.name }, config);
                                            alert("Requisition sent to Logistics successfully!");
                                            setShowRequestModal(false); setRequestItems([]); fetchCommandCenterData(selectedProject.id); 
                                        } catch (err) { console.error(err); alert(`Failed: ${err.response?.data?.message || err.message}`); }
                                    }}
                                >🚀 SEND REQUEST TO LOGISTICS</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROJECT HEADER */}
                <div className="module-header flex justify-between items-center p-4 rounded-xl shadow-sm border-2 mb-6 bg-white" style={{ borderColor: '#e5e7eb' }}>
                    <button onClick={() => setCurrentView('home')} className="px-5 py-2 rounded-lg border-2 bg-gray-50 text-sm font-black transition-colors" style={{ color: '#475569', borderColor: '#cbd5e1' }}>← BACK TO DASHBOARD</button>
                    <h2 className="text-2xl font-black" style={{ color: '#003049' }}>{selectedProject.project_name} | <span style={{ color: '#c1121f' }}>{selectedProject.status}</span></h2>
                </div>

                <div className="personnel-bar p-5 rounded-t-xl flex justify-between items-center shadow-md" style={{ backgroundColor: '#003049', color: '#ffffff' }}>
                    <span className="font-black text-lg">👤 Client: {selectedProject.client_name}</span>
                    <span className="text-sm px-4 py-2 rounded-lg font-black uppercase" style={{ backgroundColor: '#fdf0d5', color: '#003049' }}>{user.department} MODE</span>
                </div>

                <div className="phase-container bg-white shadow-md rounded-b-xl p-8 border-x-2 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                    
                    {/* ORIGINAL PHASES */}
                    {selectedProject.status === 'Floor Plan' && isSales && (
                        <div className="p-10 border-2 rounded-xl text-center bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                            <h3 className="font-black text-2xl mb-6" style={{ color: '#003049' }}>Initial Project Document</h3>
                            <label className="block font-bold mb-3 text-lg" style={{ color: '#003049' }}>Upload Floor Plan:</label>
                            <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} className="border-2 bg-white p-4 w-full max-w-md mx-auto block mb-8 rounded-xl font-bold" />
                            <div className="max-w-md mx-auto"><PrimaryButton onClick={() => uploadAndAdvance('Measurement based on Plan', 'floor_plan_image')} bg="#c1121f">Submit to Engineering</PrimaryButton></div>
                        </div>
                    )}

                    {selectedProject.status === 'Measurement based on Plan' && isEng && (
                        <div className="flex flex-col gap-6">
                            {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                            <div className="p-6 rounded-xl border-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                <label className="font-black block mb-3 text-lg" style={{ color: '#003049' }}>Plan Measurement Notes</label>
                                <textarea value={boqData.planMeasurement || ''} onChange={(e) => setBoqData({ ...boqData, planMeasurement: e.target.value })} placeholder="Input measurement notes derived from the floor plan..." className="w-full p-4 border-2 rounded-xl shadow-sm outline-none focus:border-blue-400 bg-white font-medium" style={{ borderColor: '#cbd5e1' }} rows="3" />
                            </div>
                            {renderBoqTable('planBOQ', false)}
                            <PrimaryButton bg="#c1121f" onClick={async () => { await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/submit-plan`, { plan_measurement: boqData.planMeasurement, plan_boq: JSON.stringify(boqData.planBOQ) }, config); alert("Submitted."); setCurrentView('home'); }}>Save Plan Data & Proceed to Site Visit</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Actual Measurement' && isEng && (
                        <div className="flex flex-col gap-6">
                            {selectedProject.rejection_notes && (
                                <div className="p-6 border-l-8 rounded-r-xl shadow-sm mb-4" style={{ backgroundColor: '#fef2f2', borderColor: '#c1121f' }}>
                                    <h4 className="font-black text-xl mb-2 flex items-center gap-2" style={{ color: '#c1121f' }}>🚨 REVISION REQUIRED FROM DEPT. HEAD</h4>
                                    <p className="font-bold text-lg" style={{ color: '#780000' }}>"{selectedProject.rejection_notes}"</p>
                                </div>
                            )}
                            {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                            <div className="opacity-80 pointer-events-none">{renderBoqTable('planBOQ', true)}</div>
                            <hr className="my-6 border-dashed border-2" style={{ borderColor: '#cbd5e1' }} />
                            <div className="p-6 rounded-xl border-2" style={{ backgroundColor: '#fdf0d5', borderColor: '#e5e7eb' }}>
                                <label className="font-black block mb-3 text-lg" style={{ color: '#003049' }}>Actual Site Measurement Notes</label>
                                <textarea value={boqData.actualMeasurement || ''} onChange={(e) => setBoqData({ ...boqData, actualMeasurement: e.target.value })} placeholder="Input physical site constraints and adjustments..." className="w-full p-4 border-2 rounded-xl shadow-sm outline-none bg-white font-medium" style={{ borderColor: '#cbd5e1' }} rows="3" />
                            </div>
                            {renderBoqTable('finalBOQ', false)}
                            <PrimaryButton bg="#c1121f" onClick={async () => { await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/submit-actual`, { actual_measurement: boqData.actualMeasurement, final_boq: JSON.stringify(boqData.finalBOQ) }, config); alert("Submitted."); setCurrentView('home'); }}>Submit Final BOQ for Approval</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Pending Head Review' && isEngHead && (
                        <div className="flex flex-col gap-6">
                            <div className="p-8 rounded-xl border-2" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                                <h3 className="font-black text-2xl border-b-2 pb-4 mb-6" style={{ color: '#003049', borderColor: '#e5e7eb' }}>Review Engineering Final BOQ</h3>
                                {renderDocumentLink('Floor Plan Reference', selectedProject.floor_plan_image)}
                                <div className="mt-6 p-6 bg-white border-2 rounded-xl shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                                    <label className="font-black text-sm uppercase tracking-wider" style={{ color: '#669bbc' }}>Engineer's Site Notes:</label>
                                    <p className="italic mt-3 font-medium text-lg" style={{ color: '#1e293b' }}>"{boqData.actualMeasurement}"</p>
                                </div>
                            </div>
                            {renderBoqTable('finalBOQ', true)}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <button onClick={() => openRejectModal('Actual Measurement')} className="w-full py-4 rounded-xl font-black text-lg shadow-sm hover:shadow-md transition-all border-2 bg-white" style={{ borderColor: '#c1121f', color: '#c1121f' }}>❌ Reject & Return to Staff</button>
                                <PrimaryButton bg="#16a34a" onClick={async () => { await axios.post(`http://localhost:8000/api/projects/${selectedProject.id}/approve-boq`, {}, config); alert("Verified!"); setCurrentView('home'); }}>✓ Approve BOQ & Return to Sales</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {isSales && renderSalesPOAndWorkOrderView()}

                    {selectedProject.status === 'Initial Site Inspection' && isEng && (
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderDocumentLink('Purchase Order', selectedProject.po_document)}
                                {renderDocumentLink('Work Order', selectedProject.work_order_document)}
                            </div>
                            <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                                <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                    <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🚧 Pre-Con Site Readiness</h3>
                                </div>
                                <div className="p-8 bg-white space-y-6">
                                    <p className="font-bold text-lg text-gray-600">Verify the following critical conditions are met before deploying installers.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-xl border-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                        {[{ id: 'power', label: '🔌 Stable Power Available' }, { id: 'water', label: '💧 Water Accessible' }, { id: 'cleared', label: '🧹 Area Cleared' }, { id: 'permits', label: '📜 Permits Secured' }].map(item => (
                                            <label key={item.id} className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}>
                                                <input type="checkbox" checked={siteInspection[item.id]} onChange={(e) => setSiteInspection({ ...siteInspection, [item.id]: e.target.checked })} className="w-6 h-6 rounded" />
                                                <span className="font-bold text-lg" style={{ color: '#003049' }}>{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="p-6 border-2 rounded-xl" style={{ backgroundColor: '#fdf0d5', borderColor: '#e5e7eb' }}>
                                        <label className="block font-black mb-2 text-xl" style={{ color: '#003049' }}>📸 Upload "Before" Photo</label>
                                        <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full bg-white p-4 border-2 rounded-xl outline-none font-bold" style={{ borderColor: '#cbd5e1' }} />
                                    </div>
                                </div>
                            </div>
                            <PrimaryButton disabled={!isInspectionReady} bg="#c1121f" onClick={() => uploadAndAdvance('Checking of Delivery of Materials', 'site_inspection_photo')}>
                                {isInspectionReady ? '✓ Complete Inspection & Request Materials' : 'Complete Checklist to Advance'}
                            </PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Checking of Delivery of Materials' && (isEng || isLogistics || isOpsAss) && (
                        <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                            <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">📦 Material Verification</h3>
                            </div>
                            <div className="p-8 bg-white">
                                <p className="mb-6 font-bold text-xl" style={{ color: '#003049' }}>Please cross-reference the physically delivered materials against the approved Final BOQ below.</p>
                                <div className="mb-10 p-6 rounded-xl border-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                    <h4 className="font-black text-xl mb-4 flex items-center gap-2 border-b-2 pb-4" style={{ color: '#c1121f', borderColor: '#e5e7eb' }}>Reference: Final BOQ</h4>
                                    {renderBoqTable('finalBOQ', true)}
                                </div>
                                <div className="p-8 rounded-xl border-2 text-center shadow-inner" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                                    <h4 className="font-black mb-3 text-2xl tracking-tight" style={{ color: '#003049' }}>Upload Delivery Receipt (DR)</h4>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full max-w-lg mx-auto bg-white p-4 border-2 rounded-xl block outline-none mb-8 font-bold" style={{ borderColor: '#cbd5e1' }} />
                                    <div className="max-w-md mx-auto"><PrimaryButton bg="#c1121f" onClick={() => uploadAndAdvance('Bidding of Project', 'delivery_receipt_document')}>✓ Materials Verified</PrimaryButton></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Bidding of Project' && (
                        isOpsAss ? (
                            <div className="border-2 rounded-xl shadow-sm overflow-hidden mb-8" style={{ borderColor: '#e5e7eb' }}>
                                <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                    <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">⚖️ Procurement & Bidding</h3>
                                </div>
                                <div className="p-8 bg-white">
                                    <div className="mb-10 p-6 rounded-xl border-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                        <h4 className="font-black text-xl mb-4 flex items-center gap-2 border-b-2 pb-4" style={{ color: '#003049', borderColor: '#e5e7eb' }}>Internal Budget Reference</h4>
                                        <div className="opacity-90 pointer-events-none">{renderBoqTable('finalBOQ', true)}</div>
                                    </div>
                                    <div className="p-8 rounded-xl border-2 text-center shadow-inner" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                                        <h4 className="font-black mb-3 text-2xl tracking-tight" style={{ color: '#003049' }}>Upload Winning Subcontractor Bid</h4>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full max-w-lg mx-auto bg-white p-4 border-2 rounded-xl block outline-none mb-8 shadow-sm font-bold" style={{ borderColor: '#cbd5e1' }} />
                                        <div className="max-w-md mx-auto"><PrimaryButton bg="#c1121f" onClick={() => uploadAndAdvance('Awarding of Project', 'bidding_document')}>Upload Winning Bid & Proceed</PrimaryButton></div>
                                    </div>
                                </div>
                            </div>
                        ) : (<div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}><p className="font-black text-xl text-gray-500 animate-pulse">⏳ Awaiting Management to complete Bidding phase...</p></div>)
                    )}

                    {selectedProject.status === 'Awarding of Project' && (
                        isOpsAss ? (
                            <div className="border-2 rounded-xl shadow-sm overflow-hidden mb-8" style={{ borderColor: '#e5e7eb' }}>
                                <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                    <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🤝 Contract Formalization</h3>
                                </div>
                                <div className="p-8 bg-white">
                                    <div className="max-w-4xl mx-auto mb-10 text-left">
                                        <h4 className="font-black mb-3 text-md uppercase tracking-wider" style={{ color: '#669bbc' }}>Approved Bid Document</h4>
                                        {renderDocumentLink('Winning Subcontractor Quote', selectedProject.bidding_document)}
                                    </div>
                                    <div className="p-10 rounded-xl border-2 bg-gray-50 max-w-4xl mx-auto text-center shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                                        <h4 className="font-black mb-8 text-2xl tracking-tight border-b-2 pb-6" style={{ color: '#003049', borderColor: '#e5e7eb' }}>Award Summary & Agreement</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                                            <div><label className="block font-black text-md mb-3" style={{ color: '#003049' }}>Subcontractor Name *</label><input type="text" value={awardDetails.name || ''} onChange={e => setAwardDetails({ ...awardDetails, name: e.target.value })} className="w-full p-4 border-2 rounded-xl outline-none shadow-sm focus:border-blue-500 font-bold text-lg" style={{ borderColor: '#cbd5e1' }} /></div>
                                            <div><label className="block font-black text-md mb-3" style={{ color: '#003049' }}>Final Awarded Amount (₱) *</label><input type="number" value={awardDetails.amount || ''} onChange={e => setAwardDetails({ ...awardDetails, amount: e.target.value })} className="w-full p-4 border-2 rounded-xl outline-none shadow-sm focus:border-blue-500 font-bold text-lg" style={{ borderColor: '#cbd5e1' }} /></div>
                                        </div>
                                        <hr className="my-8 border-2" style={{ borderColor: '#cbd5e1' }} />
                                        <label className="block font-black text-md mb-3 text-left" style={{ color: '#003049' }}>Upload Signed Agreement *</label>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full bg-white p-4 border-2 rounded-xl block mb-10 outline-none shadow-sm font-bold text-lg" style={{ borderColor: '#cbd5e1' }} />
                                        <div className="max-w-lg mx-auto"><PrimaryButton disabled={!isAwardFormValid} bg="#003049" onClick={() => uploadAndAdvance('Contract Signing for Installer', 'subcontractor_agreement_document')}>{isAwardFormValid ? 'Upload Agreement & Award Project' : 'Complete Form to Award'}</PrimaryButton></div>
                                    </div>
                                </div>
                            </div>
                        ) : (<div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}><p className="font-black text-xl text-gray-500 animate-pulse">⏳ Awaiting Management to process Awarding phase...</p></div>)
                    )}

                    {selectedProject.status === 'Contract Signing for Installer' && (isEng || isOpsAss) && (
                        <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                            <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🤝 Subcontractor Handover Briefing</h3>
                            </div>
                            <div className="p-8 bg-white">
                                <div className="mb-8">{renderDocumentLink('Subcontractor Agreement', selectedProject.subcontractor_agreement_document)}</div>
                                <div className="grid grid-cols-1 gap-4 p-8 rounded-xl border-2 bg-gray-50 mb-8" style={{ borderColor: '#e5e7eb' }}>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={contractChecklist.boqReviewed} onChange={(e) => setContractChecklist({ ...contractChecklist, boqReviewed: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>📋 Subcontractor has reviewed and agreed to the Final BOQ parameters.</span></label>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={contractChecklist.timelineAgreed} onChange={(e) => setContractChecklist({ ...contractChecklist, timelineAgreed: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>⏳ Project timeline and milestones have been acknowledged.</span></label>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={contractChecklist.signed} onChange={(e) => setContractChecklist({ ...contractChecklist, signed: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>✍️ Physical contract has been formally signed by both parties.</span></label>
                                </div>
                                <PrimaryButton disabled={!isContractReady} bg="#c1121f" onClick={() => advanceStatus('Deployment and Orientation of Installers')}>{isContractReady ? '✓ Confirm Handover & Proceed to Mobilization' : 'Complete Checklist to Advance'}</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Deployment and Orientation of Installers' && (isEng || isOpsAss) && (
                        <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                            <div className="p-5" style={{ backgroundColor: '#003049' }}>
                                <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🚀 Site Mobilization & Safety</h3>
                            </div>
                            <div className="p-8 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-xl border-2 bg-gray-50 mb-8" style={{ borderColor: '#e5e7eb' }}>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={mobilizationChecklist.safety} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, safety: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>🦺 Site Safety & Hazard Briefing Completed</span></label>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={mobilizationChecklist.passes} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, passes: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>🎟️ Gate Passes & Worker IDs Distributed</span></label>
                                    <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#e5e7eb' }}><input type="checkbox" checked={mobilizationChecklist.tools} onChange={(e) => setMobilizationChecklist({ ...mobilizationChecklist, tools: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#003049' }}>🛠️ Initial Tools & Heavy Equipment Logged</span></label>
                                </div>
                                <div className="p-6 border-2 rounded-xl mb-8" style={{ backgroundColor: '#fdf0d5', borderColor: '#e5e7eb' }}>
                                    <label className="block font-black mb-2 text-xl" style={{ color: '#003049' }}>📸 Upload Toolbox Meeting / Mobilization Photo *</label>
                                    <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full bg-white p-4 border-2 rounded-xl outline-none font-bold" style={{ borderColor: '#cbd5e1' }} />
                                </div>
                                <PrimaryButton disabled={!isMobilizationReady} bg="#16a34a" onClick={() => uploadAndAdvance('Site Inspection & Project Monitoring', 'mobilization_photo')}>{isMobilizationReady ? '🚀 Mobilize Team & Begin Construction' : 'Complete Checklist & Upload Photo'}</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {/* 🚨 MEGASUITE COMMAND CENTER 🚨 */}
                    {selectedProject.status === 'Site Inspection & Project Monitoring' && isEng && (
                        <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                            <div className="p-5 flex justify-between items-center" style={{ backgroundColor: '#003049' }}>
                                <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🏗️ Active Construction Command Center</h3>
                                <span className="bg-green-500 text-white font-bold px-3 py-1 rounded-full text-sm animate-pulse">● STATUS: IN PROGRESS</span>
                            </div>

                            {/* MASTER TABS */}
                            <div className="flex overflow-x-auto border-b-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                <button onClick={() => setActiveTab('installers')} className={`min-w-max px-6 py-4 font-black text-lg transition-colors ${activeTab === 'installers' ? 'bg-white text-[#c1121f] border-b-4 border-[#c1121f]' : 'text-gray-500 hover:bg-gray-100'}`}>📋 INSTALLER MONITORING</button>
                                <button onClick={() => setActiveTab('timeline')} className={`min-w-max px-6 py-4 font-black text-lg transition-colors ${activeTab === 'timeline' ? 'bg-white text-[#c1121f] border-b-4 border-[#c1121f]' : 'text-gray-500 hover:bg-gray-100'}`}>⏳ PROJECT TIMELINE</button>
                                <button onClick={() => setActiveTab('materials')} className={`min-w-max px-6 py-4 font-black text-lg transition-colors ${activeTab === 'materials' ? 'bg-white text-[#c1121f] border-b-4 border-[#c1121f]' : 'text-gray-500 hover:bg-gray-100'}`}>📦 MATERIALS MONITORING</button>
                                <button onClick={() => setActiveTab('issues')} className={`min-w-max px-6 py-4 font-black text-lg transition-colors ${activeTab === 'issues' ? 'bg-white text-[#c1121f] border-b-4 border-[#c1121f]' : 'text-gray-500 hover:bg-gray-100'}`}>⚠️ ISSUES & SOLUTIONS</button>
                                <button onClick={() => setActiveTab('inspection')} className={`min-w-max px-6 py-4 font-black text-lg transition-colors ${activeTab === 'inspection' ? 'bg-white text-[#c1121f] border-b-4 border-[#c1121f]' : 'text-gray-500 hover:bg-gray-100'}`}>✅ SITE INSPECTION REPORT</button>
                            </div>

                            <div className="p-10 bg-white">
                                
                                {/* TAB 1: INSTALLER MONITORING (Daily Logs) */}
                                {activeTab === 'installers' && (
                                    <div className="animate-fadeIn">
                                        <h4 className="font-black text-2xl mb-6" style={{ color: '#003049' }}>Daily Monitoring Setup</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-6 rounded-xl border-2 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                                            <div className="p-3 border rounded-lg bg-white" style={{ borderColor: '#cbd5e1' }}>
                                                <label className="block font-black text-sm mb-2" style={{ color: '#003049' }}>Date of Log *</label>
                                                <input type="date" value={dailyLog.date || ''} onChange={e => setDailyLog({ ...dailyLog, date: e.target.value })} className="w-full p-2 border border-gray-300 rounded outline-none font-bold" />
                                            </div>
                                            <div className="p-3 border rounded-lg bg-white" style={{ borderColor: '#cbd5e1' }}>
                                                <label className="block font-black text-sm mb-2" style={{ color: '#003049' }}>Installer (Lead Man) *</label>
                                                <input type="text" value={dailyLog.leadMan || ''} onChange={e => setDailyLog({ ...dailyLog, leadMan: e.target.value })} className="w-full p-2 border border-gray-300 rounded outline-none font-bold" placeholder="e.g. Marjun Narvasa" />
                                            </div>
                                            <div className="p-3 border rounded-lg bg-white" style={{ borderColor: '#cbd5e1' }}>
                                                <label className="block font-black text-sm mb-2" style={{ color: '#003049' }}>Total Area Logged *</label>
                                                <input type="text" value={dailyLog.totalArea || ''} onChange={e => setDailyLog({ ...dailyLog, totalArea: e.target.value })} className="w-full p-2 border border-gray-300 rounded outline-none font-bold" placeholder="e.g. 134 Lm" />
                                            </div>
                                        </div>

                                        <div className="border-2 rounded-xl mb-6 overflow-hidden shadow-inner" style={{ borderColor: '#cbd5e1' }}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 font-black text-center uppercase tracking-wider text-xs" style={{ backgroundColor: '#fdf0d5', color: '#003049', borderColor: '#e5e7eb' }}>
                                                <div className="p-3 border-r-2" style={{ borderColor: '#e5e7eb' }}>From Client (START Date)</div>
                                                <div className="p-3">From Client (END Date)</div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 bg-white divide-x-2 border-b-2" style={{ divideColor: '#e5e7eb', borderColor: '#e5e7eb' }}>
                                                <div className="p-3"><input type="date" value={dailyLog.clientStartDate || ''} onChange={e => setDailyLog({ ...dailyLog, clientStartDate: e.target.value })} className="w-full p-3 border-2 rounded-lg outline-none font-bold text-center" style={{ borderColor: '#cbd5e1' }} /></div>
                                                <div className="p-3"><input type="date" value={dailyLog.clientEndDate || ''} onChange={e => setDailyLog({ ...dailyLog, clientEndDate: e.target.value })} className="w-full p-3 border-2 rounded-lg outline-none font-bold text-center" style={{ borderColor: '#cbd5e1' }} /></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 bg-gray-50 divide-x-2" style={{ divideColor: '#e5e7eb' }}>
                                                <div className="p-4 text-center">
                                                    <label className="block font-black text-xs uppercase tracking-wider text-gray-500 mb-2">Accomplishment (%) *</label>
                                                    <input type="number" value={dailyLog.completion || ''} onChange={e => setDailyLog({ ...dailyLog, completion: e.target.value })} className="w-1/2 mx-auto p-4 border-2 rounded-lg outline-none font-black text-center text-2xl" style={{ borderColor: '#cbd5e1', color: '#c1121f' }} placeholder="50" />
                                                </div>
                                                <div className="p-4 text-center">
                                                    <label className="block font-black text-xs uppercase tracking-wider text-gray-500 mb-2">Overall Status / Remarks</label>
                                                    <textarea value={dailyLog.notes || ''} onChange={e => setDailyLog({ ...dailyLog, notes: e.target.value })} className="w-full p-3 border-2 rounded-lg outline-none font-medium h-full" style={{ borderColor: '#cbd5e1' }} rows="2" placeholder="Describe current site status..." />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6 border-2 rounded-xl overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                                            <div className="bg-yellow-100 p-3 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                                <h5 className="font-black text-center text-yellow-800">NO. OF INSTALLERS</h5>
                                            </div>
                                            <table className="w-full text-left">
                                                <thead className="bg-yellow-50 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                                    <tr>
                                                        <th className="p-3 text-sm font-black text-center w-12">No.</th>
                                                        <th className="p-3 text-sm font-black">Name</th>
                                                        <th className="p-3 text-sm font-black text-center">Time In</th>
                                                        <th className="p-3 text-sm font-black text-center">Time Out</th>
                                                        <th className="p-3 text-sm font-black">Concerns / Remarks</th>
                                                        <th className="p-3 w-12 text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {installers.map((inst, idx) => (
                                                        <tr key={inst.id} className="border-b bg-white">
                                                            <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                                                            <td className="p-2"><input type="text" value={inst.name || ''} onChange={(e) => updateInstaller(idx, 'name', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none" placeholder="Installer Name" /></td>
                                                            <td className="p-2"><input type="time" value={inst.timeIn || ''} onChange={(e) => updateInstaller(idx, 'timeIn', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none text-center" /></td>
                                                            <td className="p-2"><input type="time" value={inst.timeOut || ''} onChange={(e) => updateInstaller(idx, 'timeOut', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none text-center" /></td>
                                                            <td className="p-2"><input type="text" value={inst.remarks || ''} onChange={(e) => updateInstaller(idx, 'remarks', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none" placeholder="Optional notes" /></td>
                                                            <td className="p-2 text-center"><button onClick={() => setInstallers(installers.filter((_, i) => i !== idx))} className="text-red-500 font-bold hover:bg-red-50 p-2 rounded">✕</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            
                                            <div className="bg-white p-4 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                                <h6 className="font-black text-sm mb-3 text-gray-600">📸 Upload Installer Team Photos (Max 2)</h6>
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <input type="file" ref={teamPhoto1Ref} accept="image/*" onChange={(e) => setTeamPhoto1(e.target.files[0])} className="text-sm p-2 border rounded flex-1" />
                                                    <input type="file" ref={teamPhoto2Ref} accept="image/*" onChange={(e) => setTeamPhoto2(e.target.files[0])} className="text-sm p-2 border rounded flex-1" />
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-3 text-center border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                                <button onClick={() => setInstallers([...installers, { id: Date.now(), name: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }])} className="text-sm font-bold text-[#669bbc]">+ Add Installer Row</button>
                                            </div>
                                        </div>

                                        <div className="p-6 border-2 rounded-xl mb-6" style={{ backgroundColor: '#fdf0d5', borderColor: '#e5e7eb' }}>
                                           <label className="block font-black mb-2 text-xl" style={{ color: '#003049' }}>📸 Upload Daily Progress Photo (MAIN) *</label>
                                           <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full bg-white p-3 border-2 rounded-lg outline-none font-bold" style={{ borderColor: '#cbd5e1' }} />
                                        </div>
                                        
                                        <div className="flex justify-end">
                                            <button onClick={submitDailyLog} disabled={isSubmittingLog} className="bg-[#16a34a] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50">
                                                {isSubmittingLog ? 'Saving...' : '💾 Save Daily Report'}
                                            </button>
                                        </div>

                                        {/* HISTORY SECTION */}
                                        {dailyLogsHistory.length > 0 && (
                                            <div className="mt-12 border-t-4 pt-8" style={{ borderColor: '#e5e7eb' }}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="font-black text-xl flex items-center gap-2" style={{ color: '#003049' }}>
                                                        🕒 Daily Logs History
                                                        <button onClick={() => setShowHistory(!showHistory)} className="text-sm font-bold text-gray-500 hover:text-[#c1121f] ml-4 underline transition-colors">
                                                            {showHistory ? 'Hide History' : 'Show History'}
                                                        </button>
                                                    </h4>
                                                    
                                                    {showHistory && (
                                                        <input 
                                                            type="text" 
                                                            placeholder="Filter (e.g. 2026-03)" 
                                                            value={historyFilter || ''} 
                                                            onChange={(e) => setHistoryFilter(e.target.value)} 
                                                            className="p-3 border-2 rounded-xl outline-none font-medium text-gray-600 focus:border-[#669bbc]" 
                                                            style={{ borderColor: '#cbd5e1', width: '250px' }} 
                                                        />
                                                    )}
                                                </div>
                                                
                                                {showHistory && (
                                                    <div className="space-y-4">
                                                        {filteredHistory.length === 0 ? (
                                                            <p className="text-center italic text-gray-400 font-bold p-6 border-2 rounded-xl border-dashed" style={{ borderColor: '#cbd5e1' }}>No logs match your filter.</p>
                                                        ) : (
                                                            filteredHistory.map(log => (
                                                                <div key={log.id} className="p-6 border-2 rounded-xl bg-white shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4" style={{ borderColor: '#cbd5e1' }}>
                                                                    <div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="font-black text-xl" style={{ color: '#c1121f' }}>{log.log_date}</span>
                                                                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                                                                Submitted at: {formatTime(log.created_at)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="font-bold text-gray-700 mt-2">Accomplishment: {log.accomplishment_percent}% | Area: {log.total_area || '0'}</p>
                                                                        {log.remarks && <p className="text-gray-600 font-medium italic mt-2">"{log.remarks}"</p>}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => exportSpecificDailyLog(log)} className="px-4 py-2 text-sm bg-[#16a34a] text-white font-bold rounded-lg hover:bg-green-700 transition-colors">⬇️ Download Excel</button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: MATERIALS MONITORING */}
                                {activeTab === 'materials' && (
                                    <div className="animate-fadeIn">
                                        <div className="flex justify-between items-center mb-4 bg-gray-50 p-4 border-2 rounded-xl" style={{ borderColor: '#cbd5e1' }}>
                                            <div className="flex items-center gap-4">
                                                <label className="font-black text-gray-700">Logging for Date:</label>
                                                <input 
                                                    type="date" 
                                                    value={currentLogDate || ''} 
                                                    onChange={(e) => setCurrentLogDate(e.target.value)} 
                                                    className="p-2 border-2 rounded font-bold outline-none focus:border-blue-500" 
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={exportMaterialsToExcel} className="bg-[#16a34a] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-green-700 transition-colors">
                                                    ⬇️ Download Excel File
                                                </button>
                                                <button onClick={() => saveTrackingData('materials')} className="bg-[#003049] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-[#001f33] transition-colors">
                                                    💾 Save Tracking Data
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto shadow-sm mb-6 pb-4">
                                            <table className="w-full text-center border-collapse border-2 border-black bg-white" style={{ minWidth: 'max-content' }}>
                                                <thead>
                                                    <tr>
                                                        <th colSpan="10" className="p-3 border border-black bg-gray-300 font-black text-xl text-gray-900 tracking-widest uppercase">
                                                            MATERIALS MONITORING
                                                        </th>
                                                    </tr>
                                                    <tr className="bg-gray-200">
                                                        <th colSpan="2" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800">Item</th>
                                                        <th colSpan="3" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800">Delivery / Pull Out</th>
                                                        <th rowSpan="2" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24">Total Installed</th>
                                                        <th rowSpan="2" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24">Inventory</th>
                                                        <th rowSpan="2" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-48">Remarks</th>
                                                        <th colSpan="2" className="p-2 border border-black font-black text-xs uppercase tracking-wider text-[#c1121f] bg-yellow-100">
                                                            {new Date(currentLogDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </th>
                                                    </tr>
                                                    <tr className="bg-gray-100">
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800" style={{ minWidth: '150px' }}>Name</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24">Description</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-32">Date</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24">Quantity</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24">Total</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24 bg-yellow-50">Consumed</th>
                                                        <th className="p-2 border border-black font-black text-xs uppercase tracking-wider text-gray-800 w-24 bg-yellow-50">Running Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {materialsTracking.length === 0 ? (
                                                        <tr><td colSpan="10" className="p-8 text-center font-bold text-gray-400 border border-black">No materials loaded.</td></tr>
                                                    ) : (
                                                        materialsTracking.map((item, index) => (
                                                            <tr key={index} className="hover:bg-blue-50 transition-colors">
                                                                <td className="p-2 border border-black text-left font-bold text-gray-800 text-sm">{item.description}</td>
                                                                <td className="p-2 border border-black font-medium text-gray-700 text-sm">{item.unit}</td>
                                                                
                                                                <td className="p-1 border border-black bg-white">
                                                                    <input type="date" value={item.delivery_date || ''} onChange={(e) => handleMaterialUpdate(index, 'delivery_date', e.target.value)} className="w-full text-center text-xs font-bold outline-none bg-transparent" />
                                                                </td>
                                                                <td className="p-1 border border-black bg-gray-200">
                                                                    <input type="text" value={item.delivery_qty || ''} readOnly className="w-full text-center font-bold outline-none bg-transparent text-gray-500 cursor-not-allowed no-spinners" title="Locked to avoid confusion" />
                                                                </td>
                                                                <td className="p-2 border border-black font-black text-gray-900 bg-gray-100">{item.qty}</td>
                                                                <td className="p-2 border border-black font-black text-blue-900 bg-blue-50">{item.installed || 0}</td>
                                                                <td className="p-2 border border-black font-black" style={{ backgroundColor: item.remaining <= 0 ? '#fee2e2' : '#f0fdf4', color: item.remaining <= 0 ? '#b91c1c' : '#15803d' }}>{item.remaining}</td>
                                                                <td className="p-1 border border-black bg-white">
                                                                    <input type="text" value={item.remarks || ''} onChange={(e) => handleMaterialUpdate(index, 'remarks', e.target.value)} className="w-full p-1 text-center font-medium outline-none text-sm text-gray-600 bg-transparent" placeholder="Notes..." />
                                                                </td>
                                                                
                                                                <td className="p-1 border border-black bg-white shadow-inner">
                                                                    <input type="number" value={item.history?.[currentLogDate] || ''} onChange={(e) => handleMaterialUpdate(index, 'consumed', e.target.value, currentLogDate)} className="w-full text-center font-black text-lg outline-none text-[#c1121f] bg-transparent focus:bg-yellow-50" placeholder="0" />
                                                                </td>
                                                                <td className="p-2 border border-black font-black text-gray-600 bg-gray-100">{getRunningTotal(item, currentLogDate)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-8 border-t-4 pt-6" style={{ borderColor: '#e5e7eb' }}>
                                            <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                                                <h4 className="font-black text-lg flex items-center gap-2 text-[#003049]">
                                                    🕒 Requisition History
                                                    <button onClick={() => setShowMaterialHistory(!showMaterialHistory)} className="text-xs font-bold text-white bg-gray-400 px-3 py-1 rounded hover:bg-[#f97316] ml-4 transition-colors">
                                                        {showMaterialHistory ? 'HIDE' : 'SHOW'}
                                                    </button>
                                                </h4>
                                                {showMaterialHistory && (
                                                    <input type="text" placeholder="Filter history..." value={materialHistoryFilter || ''} onChange={(e) => setMaterialHistoryFilter(e.target.value)} className="p-2 border-2 rounded outline-none font-medium text-sm text-gray-600 focus:border-[#f97316]" style={{ width: '200px' }} />
                                                )}
                                            </div>

                                            {showMaterialHistory && (
                                                <div className="space-y-3">
                                                    {materialRequestsHistory.length === 0 ? (
                                                        <p className="text-center italic text-gray-400 font-bold p-6 border-2 border-dashed rounded">No material requests have been made yet.</p>
                                                    ) : (
                                                        materialRequestsHistory
                                                            .filter(req => req.status.toLowerCase().includes(materialHistoryFilter.toLowerCase()) || (req.requester_name && req.requester_name.toLowerCase().includes(materialHistoryFilter.toLowerCase())) || (req.approver_name && req.approver_name.toLowerCase().includes(materialHistoryFilter.toLowerCase())))
                                                            .map(req => {
                                                                const itemsList = safeParseJSON(req.items);
                                                                let statusColors = "bg-yellow-100 text-yellow-800 border-yellow-300";
                                                                let statusText = "PENDING LOGISTICS";
                                                                if (req.status === 'Dispatched') { statusColors = "bg-green-100 text-green-800 border-green-300"; statusText = `APPROVED BY: ${req.approver_name || 'LOGISTICS'}`; }
                                                                if (req.status === 'Denied') { statusColors = "bg-red-100 text-red-800 border-red-300"; statusText = `DECLINED BY: ${req.approver_name || 'LOGISTICS'}`; }

                                                                return (
                                                                    <div key={req.id} className="flex justify-between items-center p-4 border rounded shadow-sm bg-white hover:bg-gray-50 transition-colors">
                                                                        <div className="flex flex-col w-1/4 border-r pr-4">
                                                                            <span className="font-black text-gray-800 text-sm">{new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                                            <span className="text-xs font-bold text-gray-500 mt-1">Req By: {req.requester_name || 'Unknown'}</span>
                                                                        </div>
                                                                        <div className="flex-1 px-4">
                                                                            <ul className="text-sm font-bold text-[#003049]">{itemsList.map((item, idx) => (<li key={idx}>• {item.requestedQty} {item.unit} - {item.description}</li>))}</ul>
                                                                        </div>
                                                                        <div className="w-1/3 text-right"><span className={`inline-block px-3 py-1 rounded font-black text-xs border uppercase tracking-wider ${statusColors}`}>{statusText}</span></div>
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
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-black text-2xl text-[#003049]">PROJECT TIMELINE</h4>
                                            <div className="flex gap-4">
                                                <button onClick={exportGanttChartToExcel} className="bg-[#16a34a] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-green-700 transition-colors">⬇️ Download Gantt Excel</button>
                                                <button onClick={() => saveTrackingData('timeline')} className="bg-[#003049] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-[#001f33] transition-colors">💾 Save Timeline</button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 bg-[#1F4E78] text-white text-center font-black text-xs p-3 rounded-t-xl border border-black mt-4">
                                            <div>Project Name</div><div>Duration</div><div>Plan Start</div><div>Plan End</div>
                                        </div>
                                        <div className="grid grid-cols-4 bg-white text-center font-bold text-sm border-2 border-[#1F4E78] rounded-b-xl mb-8">
                                            <div className="p-3 border-r border-gray-300 text-[#003049]">{selectedProject.project_name}</div>
                                            <div className="p-3 border-r border-gray-300 text-red-600 font-black">{getProjectMetrics().duration > 0 ? getProjectMetrics().duration + ' Days' : '-'}</div>
                                            <div className="p-3 border-r border-gray-300">{getProjectMetrics().min ? getProjectMetrics().min.toLocaleDateString(undefined, {month:'short', day:'2-digit', year:'numeric'}) : '-'}</div>
                                            <div className="p-3 text-gray-800">{getProjectMetrics().max ? getProjectMetrics().max.toLocaleDateString(undefined, {month:'short', day:'2-digit', year:'numeric'}) : '-'}</div>
                                        </div>

                                        <div className="overflow-x-auto border-2 border-black rounded-lg">
                                            <table className="w-full text-center border-collapse">
                                                <thead className="bg-[#1F4E78] text-white text-xs">
                                                    <tr>
                                                        <th className="p-3 border border-gray-400 w-1/3 text-left pl-6">TASK NAME</th>
                                                        <th className="p-3 border border-gray-400 w-32">PLAN START</th>
                                                        <th className="p-3 border border-gray-400 w-32">PLAN END</th>
                                                        <th className="p-3 border border-gray-400 w-24">DURATION</th>
                                                        <th className="p-3 border border-gray-400 w-24">UNIT</th>
                                                        <th className="p-3 border border-gray-400 w-24">% DONE</th>
                                                        <th className="p-3 border border-gray-400 w-32">STATUS</th>
                                                        <th className="p-3 border border-gray-400 w-12 text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-300">
                                                    {timelineTasks.map((task, index) => (
                                                        task.type === 'group' ? (
                                                            <tr key={task.id} className="bg-gray-200">
                                                                <td colSpan="7" className="p-0 border-r border-gray-300 text-left pl-6">
                                                                    <input type="text" value={task.name || ''} onChange={(e) => updateTimelineTask(index, 'name', e.target.value)} className="w-full p-2 font-black text-gray-800 uppercase outline-none bg-transparent" placeholder="GROUP NAME..." />
                                                                </td>
                                                                <td className="p-2 bg-white">
                                                                    <button onClick={() => setTimelineTasks(timelineTasks.filter((_, i) => i !== index))} className="text-red-500 font-bold hover:bg-red-100 p-1 rounded transition-colors">✕</button>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            <tr key={task.id} className="hover:bg-blue-50 transition-colors">
                                                                <td className="p-0 border-r border-gray-300 text-left">
                                                                    <input type="text" value={task.name || ''} onChange={(e) => updateTimelineTask(index, 'name', e.target.value)} className="w-full p-3 font-bold text-gray-800 outline-none bg-transparent pl-8" placeholder="Task description..." />
                                                                </td>
                                                                <td className="p-0 border-r border-gray-300 bg-white">
                                                                    <input type="date" value={task.start || ''} onChange={(e) => updateTimelineTask(index, 'start', e.target.value)} className="w-full p-2 text-center text-sm font-bold text-gray-700 outline-none bg-transparent" />
                                                                </td>
                                                                <td className="p-0 border-r border-gray-300 bg-white">
                                                                    <input type="date" value={task.end || ''} onChange={(e) => updateTimelineTask(index, 'end', e.target.value)} className="w-full p-2 text-center text-sm font-bold text-gray-700 outline-none bg-transparent" />
                                                                </td>
                                                                <td className="p-2 border-r border-gray-300 bg-gray-100 font-black text-red-600">
                                                                    {task.duration || '-'}
                                                                </td>
                                                                <td className="p-2 border-r border-gray-300 text-xs font-bold text-gray-500 bg-white">
                                                                    {task.unit}
                                                                </td>
                                                                <td className="p-0 border-r border-gray-300 bg-green-50">
                                                                    <div className="flex items-center justify-center h-full font-black text-gray-800">
                                                                        <input type="number" value={task.percent !== undefined ? task.percent : ''} onChange={(e) => updateTimelineTask(index, 'percent', e.target.value)} className="w-12 p-2 text-center bg-transparent outline-none no-spinners" placeholder="0" />%
                                                                    </div>
                                                                </td>
                                                                <td className={`p-2 border-r border-gray-300 font-black text-xs uppercase ${task.status === 'Delayed' ? 'text-red-600 bg-red-50' : task.status === 'Completed' ? 'text-green-600 bg-green-50' : task.status === 'In Progress' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50'}`}>
                                                                    {task.status || 'Pending'}
                                                                </td>
                                                                <td className="p-2 border border-gray-300 bg-white">
                                                                    <button onClick={() => setTimelineTasks(timelineTasks.filter((_, i) => i !== index))} className="text-red-500 font-bold hover:bg-red-100 p-2 rounded transition-colors">✕</button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-start gap-4 mt-4">
                                            <button onClick={() => setTimelineTasks([...timelineTasks, { id: Date.now(), name: '', start: '', end: '', actStart: '', actEnd: '', duration: '', unit: 'DAYS', percent: '0', status: 'Pending', type: 'task' }])} className="text-[#1F4E78] font-black py-2 px-6 hover:bg-blue-100 border border-[#1F4E78] rounded transition-colors">+ Add Task Line</button>
                                            <button onClick={() => setTimelineTasks([...timelineTasks, { id: Date.now(), name: 'NEW SECTION', type: 'group' }])} className="text-gray-600 font-black py-2 px-6 hover:bg-gray-200 border border-gray-400 rounded transition-colors">+ Add Section Group</button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: ISSUES TRACKER */}
                                {activeTab === 'issues' && (
                                    <div className="animate-fadeIn">
                                        <h4 className="font-black text-2xl mb-6" style={{ color: '#003049' }}>Problem Encountered & Solution Log</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="p-6 border-2 rounded-xl bg-red-50" style={{ borderColor: '#fca5a5' }}>
                                                <label className="block font-black text-xl mb-4 text-red-700">⚠️ Problem Encountered *</label>
                                                <textarea value={issueLog.problem || ''} onChange={e => setIssueLog({ ...issueLog, problem: e.target.value })} className="w-full p-4 border-2 border-red-200 rounded-lg outline-none font-medium" rows="5" placeholder="Describe the issue..." />
                                            </div>
                                            <div className="p-6 border-2 rounded-xl bg-green-50" style={{ borderColor: '#86efac' }}>
                                                <label className="block font-black text-xl mb-4 text-green-700">✅ Solution / Action Taken</label>
                                                <textarea value={issueLog.solution || ''} onChange={e => setIssueLog({ ...issueLog, solution: e.target.value })} className="w-full p-4 border-2 border-green-200 rounded-lg outline-none font-medium" rows="5" placeholder="Describe the action taken..." />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <button onClick={submitIssueLog} disabled={isSubmittingIssue} className="bg-[#003049] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-[#001f33] transition-colors disabled:opacity-50">
                                                {isSubmittingIssue ? 'Logging...' : '💾 Log Issue'}
                                            </button>
                                        </div>

                                        {issuesHistory.length > 0 && (
                                            <div className="mt-12 border-t-4 pt-8" style={{ borderColor: '#e5e7eb' }}>
                                                <h4 className="font-black text-xl mb-6 flex items-center gap-2" style={{ color: '#003049' }}>🕒 Issues History</h4>
                                                <div className="space-y-4">
                                                    {issuesHistory.map(issue => (
                                                        <div key={issue.id} className="p-6 border-2 rounded-xl bg-white shadow-sm" style={{ borderColor: '#cbd5e1' }}>
                                                            <div className="mb-4 pb-4 border-b border-gray-100">
                                                                <span className="font-black text-red-600 block mb-2">⚠️ Problem:</span>
                                                                <p className="font-medium text-gray-800">{issue.problem}</p>
                                                            </div>
                                                            <div>
                                                                <span className="font-black text-green-600 block mb-2">✅ Solution:</span>
                                                                <p className="font-medium text-gray-600">{issue.solution || "No solution logged yet."}</p>
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
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-black text-2xl text-[#003049]">Site Inspection Checklist</h4>
                                            <div className="flex gap-4">
                                                <button onClick={exportInspectionToExcel} className="bg-[#16a34a] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-green-700 transition-colors">
                                                    ⬇️ Download Excel
                                                </button>
                                                <button onClick={() => saveTrackingData('inspection')} className="bg-[#003049] text-white font-bold py-2 px-6 rounded shadow-md hover:bg-[#001f33] transition-colors">
                                                    💾 Save Inspection Report
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-xl border-2 mb-6" style={{ borderColor: '#e5e7eb' }}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-black text-xs uppercase tracking-wider text-gray-500 mb-1">Prepared By:</label>
                                                    <input type="text" value={inspectionReport.preparedBy || ''} onChange={(e) => updateInspectionMeta('preparedBy', e.target.value)} className="w-full p-2 border rounded font-bold outline-none text-gray-800" />
                                                </div>
                                                <div>
                                                    <label className="block font-black text-xs uppercase tracking-wider text-gray-500 mb-1">Checked By (Project Manager):</label>
                                                    <input type="text" value={inspectionReport.checkedBy || ''} onChange={(e) => updateInspectionMeta('checkedBy', e.target.value)} className="w-full p-2 border rounded font-bold outline-none text-gray-800" />
                                                </div>
                                            </div>
                                        </div>

                                        {renderInspectionCategory('Pre-Checklist', 'preChecklist')}
                                        {renderInspectionCategory('Installation Proper', 'handrails')}
                                        {renderInspectionCategory('Installation Proper', 'wallguard')}
                                        {renderInspectionCategory('Installation Proper', 'cornerguard')}

                                        <div className="mb-6 border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-[#1F4E78] text-white p-3 font-black text-center uppercase tracking-widest">Attachments</div>
                                            <div className="flex gap-8 p-6 bg-white justify-center">
                                                <label className="flex items-center gap-3 font-bold text-gray-700 cursor-pointer">
                                                    <input type="checkbox" checked={inspectionReport.attachments?.approvedLayout || false} onChange={(e) => updateInspectionAttachment('approvedLayout', e.target.checked)} className="w-5 h-5" /> 
                                                    Approved Layout
                                                </label>
                                                <label className="flex items-center gap-3 font-bold text-gray-700 cursor-pointer">
                                                    <input type="checkbox" checked={inspectionReport.attachments?.keyplan || false} onChange={(e) => updateInspectionAttachment('keyplan', e.target.checked)} className="w-5 h-5" /> 
                                                    Keyplan
                                                </label>
                                                <label className="flex items-center gap-3 font-bold text-gray-700 cursor-pointer">
                                                    <input type="checkbox" checked={inspectionReport.attachments?.other || false} onChange={(e) => updateInspectionAttachment('other', e.target.checked)} className="w-5 h-5" /> 
                                                    Other
                                                </label>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                <hr className="my-10 border-2" style={{ borderColor: '#e5e7eb' }} />

                                {/* CORE ACTIONS */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                                    <div className="bg-white p-8 rounded-xl shadow-sm border-2 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: '#e5e7eb' }}>
                                        <div>
                                            <h4 className="font-black text-2xl mb-4" style={{ color: '#f97316' }}>Material Requisition</h4>
                                            <p className="text-md font-medium text-gray-500 mb-8">Out of stock? Submit a requisition alert to Logistics.</p>
                                        </div>
                                        <button className="w-full py-4 rounded-xl font-black text-lg text-white shadow-sm hover:opacity-90 transition-opacity uppercase tracking-wide" style={{ backgroundColor: '#f97316' }} onClick={() => setShowRequestModal(true)}>📦 Request Materials</button>
                                    </div>
                                    <div className="bg-white p-8 rounded-xl shadow-sm border-2 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: '#e5e7eb' }}>
                                        <div>
                                            <h4 className="font-black text-2xl mb-4" style={{ color: '#669bbc' }}>Progress Billing</h4>
                                            <p className="text-md font-medium text-gray-500 mb-8">Hit a completion milestone? Notify Accounting to release payment.</p>
                                        </div>
                                        <button className="w-full py-4 rounded-xl font-black text-lg text-white shadow-sm hover:opacity-90 transition-opacity uppercase tracking-wide" style={{ backgroundColor: '#669bbc' }} onClick={() => advanceStatus('Request Billing')}>💸 Request Billing</button>
                                    </div>
                                    <div className="bg-white p-8 rounded-xl shadow-sm border-2 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: '#e5e7eb' }}>
                                        <div>
                                            <h4 className="font-black text-2xl mb-4" style={{ color: '#c1121f' }}>Construction Complete</h4>
                                            <p className="text-md font-medium text-gray-500 mb-8">Physical build is fully complete. Proceed to QC.</p>
                                        </div>
                                        <button className="w-full py-4 rounded-xl font-black text-lg text-white shadow-sm hover:opacity-90 transition-opacity uppercase tracking-wide" style={{ backgroundColor: '#c1121f' }} onClick={() => advanceStatus('Site Inspection & Quality Checking')}>✓ Initiate Final QC</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOWNSTREAM PHASES */}
                    {selectedProject.status === 'Request Materials Needed' && (
                        <div className="border-2 rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                            <div className="p-5" style={{ backgroundColor: '#f97316' }}>
                                <h3 className="font-black uppercase tracking-wider text-lg flex items-center gap-2 text-white">🚚 Logistics: Material Dispatch Center</h3>
                            </div>
                            {isLogistics ? (
                                <div className="p-8 bg-white">
                                    <p className="mb-6 font-bold text-xl" style={{ color: '#475569' }}>Engineering has requested additional materials at the site.</p>
                                    <div className="p-8 rounded-xl border-2 shadow-inner" style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74' }}>
                                        <h4 className="font-black mb-6 text-2xl tracking-tight" style={{ color: '#c2410c' }}>Dispatch Preparation Checklist</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.inventory} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, inventory: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#c2410c' }}>📦 Pulled from Inventory</span></label>
                                            <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.transport} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, transport: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#c2410c' }}>🚚 Transport Assigned</span></label>
                                            <label className="flex items-center gap-4 p-4 rounded-lg cursor-pointer bg-white border-2 shadow-sm hover:shadow transition-shadow" style={{ borderColor: '#fed7aa' }}><input type="checkbox" checked={logisticsChecklist.notified} onChange={(e) => setLogisticsChecklist({ ...logisticsChecklist, notified: e.target.checked })} className="w-6 h-6 rounded" /><span className="font-bold text-lg" style={{ color: '#c2410c' }}>📱 Eng Team Notified</span></label>
                                        </div>
                                        <div className="max-w-lg mx-auto"><PrimaryButton disabled={!logisticsChecklist.inventory || !logisticsChecklist.transport || !logisticsChecklist.notified} bg="#f97316" onClick={() => advanceStatus('Site Inspection & Project Monitoring')}>✓ Confirm Dispatch & Return to Engineer</PrimaryButton></div>
                                    </div>
                                </div>
                            ) : (<div className="p-10 bg-white text-center"><p className="font-black text-xl text-gray-500 animate-pulse">⏳ Awaiting Logistics...</p></div>)}
                        </div>
                    )}

                    {selectedProject.status === 'Request Billing' && (
                        (isAccounting || isOpsAss) ? (
                            <div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}>
                                <h3 className="font-black text-3xl mb-6" style={{ color: '#003049' }}>Accounting: Progress Billing</h3>
                                <PrimaryButton bg="#16a34a" onClick={() => advanceStatus('Site Inspection & Project Monitoring')}>✓ Confirm Progress Payment Processed</PrimaryButton>
                            </div>
                        ) : (<div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}><p className="font-black text-xl text-gray-500 animate-pulse">⏳ Awaiting Accounting to process payment...</p></div>)
                    )}

                    {selectedProject.status === 'Site Inspection & Quality Checking' && isEng && (
                        <div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}>
                            <h3 className="font-black text-3xl mb-6" style={{ color: '#003049' }}>Technical Quality Assurance (QA/QC)</h3>
                            <PrimaryButton bg="#003049" onClick={() => advanceStatus('Final Site Inspection with the Client')}>✓ QA Passed: Ready for Client Turnover</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Final Site Inspection with the Client' && isEng && (
                        <div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}>
                            <h3 className="font-black text-3xl mb-8" style={{ color: '#003049' }}>Final Client Walkthrough</h3>
                            <PrimaryButton bg="#16a34a" onClick={() => advanceStatus('Signing of COC')}>Client Approved Project</PrimaryButton>
                        </div>
                    )}

                    {selectedProject.status === 'Signing of COC' && isEng && (
                        <div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}>
                            <div className="border-2 rounded-xl p-10 max-w-2xl mx-auto shadow-sm" style={{ backgroundColor: '#f8f9fa', borderColor: '#e5e7eb' }}>
                                <label className="block font-black mb-6 text-2xl" style={{ color: '#003049' }}>Upload Signed C.O.C.</label>
                                <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} className="mb-8 bg-white p-4 border-2 rounded-xl w-full outline-none shadow-sm font-bold text-lg" style={{ borderColor: '#cbd5e1' }} />
                                <PrimaryButton bg="#003049" onClick={() => uploadAndAdvance('Request Final Billing', 'coc_document')}>Upload & Request Final Bill</PrimaryButton>
                            </div>
                        </div>
                    )}

                    {selectedProject.status === 'Request Final Billing' && (
                        (isAccounting || isOpsAss) ? (
                            <div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}>
                                <div className="max-w-3xl mx-auto">{renderDocumentLink('Signed C.O.C.', selectedProject.coc_document)}</div>
                                <div className="mt-10 max-w-md mx-auto"><PrimaryButton bg="#16a34a" onClick={() => advanceStatus('Completed')}>Process Final Bill & Close</PrimaryButton></div>
                            </div>
                        ) : (<div className="p-10 bg-white border-2 rounded-xl shadow-sm text-center" style={{ borderColor: '#e5e7eb' }}><p className="font-black text-xl text-gray-500">⏳ Awaiting Accounting...</p></div>)
                    )}

                    {/* 🚨 RESTORED COMPLETION DASHBOARD 🚨 */}
                    {selectedProject.status === 'Completed' && (
                        <div className="p-10 border-2 rounded-xl shadow-md text-center" style={{ backgroundColor: '#fdf0d5', borderColor: '#e5e7eb' }}>
                            <h3 className="text-5xl font-black mb-6 tracking-tighter" style={{ color: '#c1121f' }}>Project Completed! 🎉</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left max-w-4xl mx-auto">
                                {renderDocumentLink('Floor Plan', selectedProject.floor_plan_image)}
                                {renderDocumentLink('Purchase Order', selectedProject.po_document)}
                                {renderDocumentLink('Work Order', selectedProject.work_order_document)}
                                {renderDocumentLink('Site Photo', selectedProject.site_inspection_photo)}
                                {renderDocumentLink('Delivery Receipt', selectedProject.delivery_receipt_document)}
                                {renderDocumentLink('Bid Document', selectedProject.bidding_document)}
                                {renderDocumentLink('Subcontractor Agreement', selectedProject.subcontractor_agreement_document)}
                                {renderDocumentLink('Mobilization / Safety Photo', selectedProject.mobilization_photo)}
                                {renderDocumentLink('Signed COC', selectedProject.coc_document)}
                            </div>
                        </div>
                    )}

                </div>
                <div className="h-20"></div>
            </div>
        );
    }

    return <ProjectManagement onSelectProject={(proj) => { setSelectedProject(proj); setCurrentView('workflow-detail'); }} />;
};

export default Project;