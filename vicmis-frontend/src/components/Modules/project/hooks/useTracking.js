import { useState } from 'react';
import api from '@/api/axios';

// ─── Safe parse helpers ───────────────────────────────────────────────────────
const safeParseArray  = (d) => {
  if (!d) return [];
  if (Array.isArray(d)) return d;             // already parsed by formatProject()
  try { const p = JSON.parse(d); return Array.isArray(p) ? p : []; } catch { return []; }
};

const safeParseObject = (d) => {
  if (!d) return null;
  if (typeof d === 'object' && !Array.isArray(d)) return d; // already parsed
  try { const p = JSON.parse(d); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : null; } catch { return null; }
};

const parseLocal = (dStr) => {
  if (!dStr) return null;
  const parts = dStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// ─── Default inspection report shape ─────────────────────────────────────────
const DEFAULT_INSPECTION = (userName = '') => ({
  preparedBy: userName, checkedBy: '',
  subtitles: { preChecklist: 'WALL', handrails: 'HANDRAILS', wallguard: 'WALLGUARD', cornerguard: 'CORNERGUARD' },
  preChecklist: [
    { id:1,  desc:'BARE',     s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:2,  desc:'PRIMER',   s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:3,  desc:'PAINTED',  s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:4,  desc:'EVENNESS', s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:5,  desc:'CORNER',   s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:6,  desc:'HALLOW',   s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:7,  desc:'CRACKS',   s1:'',s2:'',s3:'',s4:'',rem:'' },
  ],
  handrails: [
    { id:8,  desc:'MATERIALS QUALITY',          s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:9,  desc:'MATERIALS QUANTITY',          s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:10, desc:'CUTTING',                     s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:11, desc:'0.4M DRILL SPACING',          s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:12, desc:'AL FRAME INSTALLED PROPERLY', s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:13, desc:'COVER INSTALLED PROPERLY',    s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:14, desc:'END CAPS INSTALLED PROPERLY', s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:15, desc:'SCREWS',                      s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:16, desc:'0.9M TOP-FLOOR HEIGHT',       s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:17, desc:'COMPLETENESS',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:18, desc:'WORKMANSHIP',                 s1:'',s2:'',s3:'',s4:'',rem:'' },
  ],
  wallguard: [
    { id:19, desc:'MATERIALS QUALITY',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:20, desc:'MATERIALS QUANTITY',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:21, desc:'CUTTING',                           s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:22, desc:'0.4M DRILL SPACING',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:23, desc:'AL FRAME INSTALLATION',             s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:24, desc:'SHOCK STRIP INSTALLED',             s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:25, desc:'COVER INSTALLED PROPERLY',          s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:26, desc:'GAPS',                              s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:27, desc:'SEALANT WAS APPLIED(IF WITH GAPS)', s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:28, desc:'END CAPS INSTALLED PROPERLY',       s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:29, desc:'0.32M BOTTOM-FLOOR HEIGHT',         s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:30, desc:'SCREWS',                            s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:31, desc:'COMPLETENESS',                      s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:32, desc:'WORKMANSHIP',                       s1:'',s2:'',s3:'',s4:'',rem:'' },
  ],
  cornerguard: [
    { id:33, desc:'MATERIALS QUALITY',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:34, desc:'MATERIALS QUANTITY',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:35, desc:'CUTTING',                           s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:36, desc:'0.6M DRILL SPACING',                s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:37, desc:'AL FRAME INSTALLED PROPERLY',       s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:38, desc:'SHOCK STRIP INSTALLED',             s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:39, desc:'COVER INSTALLED PROPERLY',          s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:40, desc:'GAPS',                              s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:41, desc:'SEALANT WAS APPLIED(IF WITH GAPS)', s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:42, desc:'END CAPS INSTALLED PROPERLY',       s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:43, desc:'SCREWS',                            s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:44, desc:"5' TOP-FLOOR HEIGHT",               s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:45, desc:'COMPLETENESS',                      s1:'',s2:'',s3:'',s4:'',rem:'' },
    { id:46, desc:'WORKMANSHIP',                       s1:'',s2:'',s3:'',s4:'',rem:'' },
  ],
  attachments: { approvedLayout: false, keyplan: false, other: false },
});

// ─── Default BOQ shape ────────────────────────────────────────────────────────
const DEFAULT_BOQ = {
  planMeasurement:   '',
  planSqm:           '',   // → project_boq_plans.plan_sqm
  planBOQ:           [],
  actualMeasurement: '',
  actualSqm:         '',   // → project_boq_actuals.actual_sqm
  finalBOQ:          [],
};

// ═════════════════════════════════════════════════════════════════════════════
// HOOK
// ═════════════════════════════════════════════════════════════════════════════
export const useTracking = (selectedProject, userName = '') => {

  const [boqData,           setBoqData]           = useState(DEFAULT_BOQ);
  const [materialsTracking, setMaterialsTracking] = useState([]);
  const [timelineTasks,     setTimelineTasks]     = useState([]);
  const [inspectionReport,  setInspectionReport]  = useState(DEFAULT_INSPECTION(userName));
  const [currentLogDate,    setCurrentLogDate]    = useState(new Date().toISOString().split('T')[0]);

  // ── initFromProject ────────────────────────────────────────────────────────
  // Maps the flat fields returned by ProjectController::formatProject() back
  // into the local state shapes the phase components expect.
  const initFromProject = (proj) => {
    if (!proj) return;

    // BOQ — now includes planSqm / actualSqm from normalized phase tables
    const planBOQ  = safeParseArray(proj.plan_boq);
    const finalBOQ = safeParseArray(proj.final_boq);

    setBoqData({
      planMeasurement:   proj.plan_measurement   || '',
      planSqm:           proj.plan_sqm           || '',  // ← from project_boq_plans
      planBOQ,
      actualMeasurement: proj.actual_measurement || '',
      actualSqm:         proj.actual_sqm         || '',  // ← from project_boq_actuals
      finalBOQ,
    });

    // Inspection report — formatProject() returns site_inspection_report as
    // a nested object, safeParseObject handles both object and JSON string
    const inspection = safeParseObject(proj.site_inspection_report);
    setInspectionReport(inspection
      ? { ...inspection, subtitles: inspection.subtitles || DEFAULT_INSPECTION().subtitles }
      : DEFAULT_INSPECTION(userName)
    );

    // Materials — source is project_materials.material_items (returned as
    // 'material_items' by formatProject). Falls back to seeding from finalBOQ.
    const materials = safeParseArray(proj.material_items ?? proj.materials_tracking);
    if (materials.length > 0) {
      setMaterialsTracking(materials.map(i => ({ ...i, history: i.history || {} })));
    } else if (finalBOQ.length > 0) {
      setMaterialsTracking(finalBOQ.map(i => ({
        ...i, installed: 0, remaining: i.qty,
        remarks: '', delivery_date: '', delivery_qty: '', history: {},
      })));
    } else {
      setMaterialsTracking([]);
    }

    // Timeline — still stored as JSON, passed through formatProject as-is
    const timeline = safeParseArray(proj.timeline_tracking);
    if (timeline.length > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setTimelineTasks(timeline.map(t => {
        if (t.type === 'group') return { ...t, id: t.id || Date.now() };
        const p      = parseInt(t.percent, 10) || 0;
        const status = p === 100 ? 'Completed'
          : (t.end && today > parseLocal(t.end)) ? 'Delayed'
          : p > 0 ? 'In Progress' : 'Pending';
        return { ...t, id: t.id || Date.now(), type: 'task', status };
      }));
    } else {
      setTimelineTasks([{ id: 'g1', name: 'General Requirements', type: 'group' }]);
    }
  };

  // ── BOQ helpers ───────────────────────────────────────────────────────────
  const addBoqRow = (type) => setBoqData(p => ({
    ...p,
    [type]: [...(p[type] || []), { product_category:'', product_code:'', description:'', unit:'', qty:'', unitCost:'', total: 0 }],
  }));

  const removeBoqRow = (type, idx) => setBoqData(p => {
    const a = [...(p[type] || [])]; a.splice(idx, 1); return { ...p, [type]: a };
  });

  const handleBoqChange = (type, idx, field, value) => setBoqData(p => {
    const a = [...(p[type] || [])]; if (!a[idx]) return p;
    a[idx] = { ...a[idx], [field]: value };
    if (field === 'qty' || field === 'unitCost') {
      a[idx].total = (parseFloat(a[idx].qty) || 0) * (parseFloat(a[idx].unitCost) || 0);
    }
    return { ...p, [type]: a };
  });

  // ── Inspection helpers ────────────────────────────────────────────────────
  const updateInspRow      = (cat, i, f, v) => setInspectionReport(p => { const a = [...p[cat]]; a[i][f] = v; return { ...p, [cat]: a }; });
  const addInspRow         = (cat)           => setInspectionReport(p => ({ ...p, [cat]: [...p[cat], { id: Date.now(), desc:'',s1:'',s2:'',s3:'',s4:'',rem:'' }] }));
  const addInspGroupRow    = (cat)           => setInspectionReport(p => ({ ...p, [cat]: [...p[cat], { id: Date.now(), desc:'NEW SECTION', type:'group',s1:'',s2:'',s3:'',s4:'',rem:'' }] }));
  const removeInspRow      = (cat, i)        => setInspectionReport(p => { const a = [...p[cat]]; a.splice(i, 1); return { ...p, [cat]: a }; });
  const updateInspMeta     = (f, v)          => setInspectionReport(p => ({ ...p, [f]: v }));
  const updateInspSubtitle = (k, v)          => setInspectionReport(p => ({ ...p, subtitles: { ...p.subtitles, [k]: v } }));
  const updateInspAttach   = (k, v)          => setInspectionReport(p => ({ ...p, attachments: { ...p.attachments, [k]: v } }));

  // ── Timeline helpers ──────────────────────────────────────────────────────
  const updateTimelineTask = (idx, f, v) => setTimelineTasks(p => { const a = [...p]; a[idx][f] = v; return a; });
  const addTask    = ()    => setTimelineTasks(p => [...p, { id: Date.now(), name:'', start:'', end:'', duration:'', unit:'DAYS', percent:'0', status:'Pending', type:'task' }]);
  const addGroup   = ()    => setTimelineTasks(p => [...p, { id: Date.now(), name:'NEW SECTION', type:'group' }]);
  const removeTask = (idx) => setTimelineTasks(p => p.filter((_, i) => i !== idx));

  const getProjectMetrics = () => {
    let min = null, max = null;
    timelineTasks.filter(t => t.type !== 'group').forEach(t => {
      [t.start, t.end].filter(Boolean).map(d => parseLocal(d)).forEach(d => {
        if (!min || d < min) min = new Date(d);
        if (!max || d > max) max = new Date(d);
      });
    });
    return { min, max, duration: (min && max) ? Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1 : 0 };
  };

  // ── Materials helpers ─────────────────────────────────────────────────────
  const getAllSortedDates = () => {
    const all = new Set();
    materialsTracking.forEach(i => Object.keys(i.history || {}).forEach(d => all.add(d)));
    all.add(currentLogDate);
    return Array.from(all).sort();
  };

  const getRunningTotal = (item, targetDate) => {
    let sum = 0;
    for (const d of getAllSortedDates()) {
      sum += (parseFloat(item.history?.[d]) || 0);
      if (d === targetDate) break;
    }
    return sum;
  };

  const handleMaterialUpdate = (idx, field, value, date = null) => {
    const updated = [...materialsTracking];
    if (date) {
      if (!updated[idx].history) updated[idx].history = {};
      if (value === '') delete updated[idx].history[date];
      else updated[idx].history[date] = parseFloat(value) || 0;
      const total = Object.values(updated[idx].history).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      updated[idx].installed = total;
      updated[idx].remaining = (parseFloat(updated[idx].qty) || 0) - total;
    } else {
      updated[idx][field] = value;
    }
    setMaterialsTracking(updated);
  };

  // ── saveTrackingData ──────────────────────────────────────────────────────
  // CHANGED: each type now routes to its own normalized endpoint.
  //
  //  'materials'  → PATCH /projects/{id}/tracking/materials
  //                 saves to project_materials.material_items
  //
  //  'timeline'   → PATCH /projects/{id}/tracking/timeline
  //                 still a JSON column (no dedicated table yet)
  //
  //  'inspection' → POST  /projects/{id}/site-inspection
  //                 saves to project_site_inspections via
  //                 ProjectController::submitSiteInspection()
  //
  // The old single PATCH /projects/{id}/tracking is removed because
  // materials_tracking and timeline_tracking columns were dropped from projects.
  const saveTrackingData = async (type, projectId) => {
    try {
      if (type === 'materials') {
        await api.patch(`/projects/${projectId}/tracking/materials`, {
          material_items: JSON.stringify(materialsTracking),
        });

      } else if (type === 'timeline') {
        await api.patch(`/projects/${projectId}/tracking/timeline`, {
          timeline_tracking: JSON.stringify(timelineTasks),
        });

      } else if (type === 'inspection') {
        await api.post(`/projects/${projectId}/site-inspection`, {
          site_inspection_report: JSON.stringify(inspectionReport),
          inspector_id:    inspectionReport.inspector_id    || '',
          inspector_name:  inspectionReport.preparedBy      || '',
          position:        inspectionReport.position        || '',
          inspection_date: inspectionReport.inspection_date || new Date().toISOString().split('T')[0],
          inspection_time: inspectionReport.inspection_time || '00:00',
          notes_remarks:   inspectionReport.notes_remarks   || '',
          checklist:       JSON.stringify(inspectionReport.preChecklist || []),
        });
      }

      alert(`${type.toUpperCase()} data saved!`);
    } catch (err) {
      alert(`Failed to save ${type}: ${err.message}`);
    }
  };

  return {
    // BOQ
    boqData, setBoqData,
    addBoqRow, removeBoqRow, handleBoqChange,

    // Materials
    materialsTracking, setMaterialsTracking,
    handleMaterialUpdate, getAllSortedDates, getRunningTotal,

    // Timeline
    timelineTasks, setTimelineTasks,
    updateTimelineTask, addTask, addGroup, removeTask, getProjectMetrics,

    // Inspection
    inspectionReport, setInspectionReport,
    updateInspRow, addInspRow, addInspGroupRow, removeInspRow,
    updateInspMeta, updateInspSubtitle, updateInspAttach,

    // Log date
    currentLogDate, setCurrentLogDate,

    // Core
    saveTrackingData, initFromProject,
    DEFAULT_INSPECTION,
  };
};