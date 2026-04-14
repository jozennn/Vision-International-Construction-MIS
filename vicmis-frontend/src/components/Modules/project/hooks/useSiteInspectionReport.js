
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';

const today   = () => new Date().toISOString().split('T')[0];
const timeNow = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
};

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
};

const blankReport = (date = today()) => ({
    id:          null,
    date:        date,
    time:        timeNow(),
    inspectorId: '',
    preparedBy:  '',
    position:    '',
    checkedBy:   '',
    observation: '',
    problems:    [],
    photoPath:   null,
});

const resolveLeadEngineer = (project) => {
    const engineers = project?.assigned_engineers;
    if (Array.isArray(engineers) && engineers.length > 0) {
        const first = engineers[0];
        if (typeof first === 'string') return { name: first, position: 'Engineer' };
        if (first?.name) return { name: first.name, position: first.position ?? 'Engineer' };
    }

    const assignments = project?.assignments ?? [];
    const eng = assignments.find(a =>
        ['lead_engineer', 'support_engineer', 'engineer']
            .includes((a.role ?? '').toLowerCase())
    );
    if (eng) {
        return {
            name:     eng.user?.name ?? eng.name ?? '',
            position: eng.role ?? 'Engineer',
        };
    }

    return { name: '', position: '' };
};

export const useSiteInspectionReport = (projectId, projectLocation = '', userId = null, project = null) => {
    const [selectedDate, setSelectedDate] = useState(today());
    const [currentReport, setCurrentReport] = useState(blankReport());
    const [allInspections, setAllInspections] = useState({}); // Cache all inspections by date
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [error, setError] = useState(null);

    const isFirstLoad = useRef(true);
    const autoSaveTimer = useRef(null);
    const isDirty = useRef(false);

    const leadEngineer = resolveLeadEngineer(project);

    // ── Fetch inspection for specific date ─────────────────────────────────
    const fetchInspectionByDate = useCallback(async (date) => {
        if (!projectId) return null;
        
        // Check cache first
        if (allInspections[date]) {
            return allInspections[date];
        }

        try {
            // 👇 USE THE NEW ENDPOINT
            const res = await api.get(`/projects/${projectId}/site-inspection-by-date`, {
                params: { date }
            });
            
            const data = res.data?.data;
            
            if (data) {
                const problems = safeParse(data.problems) || [];
                const report = {
                    date: date,
                    time: data.time || timeNow(),
                    inspectorId: data.inspector_id || userId || '',
                    preparedBy: data.inspector_name || '',
                    position: data.position || '',
                    checkedBy: data.notes_remarks || '',
                    observation: data.observation || data.materials_scope || '',
                    problems: problems.filter(p => (p.problem ?? '').trim() || (p.solution ?? '').trim()),
                    photoPath: data.photo || data.inspection_photo || null,
                };
                
                // Cache it
                setAllInspections(prev => ({ ...prev, [date]: report }));
                return report;
            }
        } catch (e) {
            // 404 means no inspection for this date - that's fine
            if (e.response?.status !== 404) {
                console.error('Failed to load inspection:', e);
            }
        }
        return null;
    }, [projectId, userId, allInspections]);

    // ── Initialize: load inspection for selected date ───────────────────────
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            
            const saved = await fetchInspectionByDate(selectedDate);
            
            if (saved) {
                setCurrentReport(saved);
            } else {
                // Create new report with pre-filled engineer info
                setCurrentReport({
                    ...blankReport(selectedDate),
                    preparedBy: leadEngineer.name || '',
                    position: leadEngineer.position || '',
                });
            }
            
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        };
        
        init();
    }, [selectedDate, projectId, fetchInspectionByDate]);

    // ── Pre-fill preparedBy when leadEngineer is available ─────────────────
    useEffect(() => {
        if (!leadEngineer.name) return;
        if (currentReport.preparedBy) return;
        
        setCurrentReport(prev => ({
            ...prev,
            preparedBy: leadEngineer.name,
            position: leadEngineer.position,
        }));
    }, [leadEngineer.name, leadEngineer.position]);

    // ── Reset dirty flag when date changes ────────────────────────────────
    useEffect(() => {
        isDirty.current = false;
    }, [selectedDate]);

    // ── Mark dirty and update report ───────────────────────────────────────
    const markDirty = () => { isDirty.current = true; };

    const updateReport = (field, value) => {
        markDirty();
        setCurrentReport(prev => ({ ...prev, [field]: value }));
    };

    // ── Problem row helpers ───────────────────────────────────────────────
    const addProblem = () => {
        markDirty();
        setCurrentReport(prev => ({
            ...prev,
            problems: [...prev.problems, { id: Date.now(), problem: '', solution: '' }],
        }));
    };

    const removeProblem = (id) => {
        markDirty();
        setCurrentReport(prev => ({
            ...prev,
            problems: prev.problems.filter(p => p.id !== id),
        }));
    };

    const updateProblem = (id, field, value) => {
        markDirty();
        setCurrentReport(prev => ({
            ...prev,
            problems: prev.problems.map(p => p.id === id ? { ...p, [field]: value } : p),
        }));
    };

    // ── Build payload for backend ─────────────────────────────────────────
    const buildPayload = (report, photoFile = null) => {
        const formData = new FormData();
        formData.append('inspector_id', String(userId || ''));
        formData.append('inspector_name', report.preparedBy || '');
        formData.append('inspector_position', report.position || 'Engineer');
        formData.append('inspection_date', report.date);
        formData.append('inspection_time', report.time);
        formData.append('materials_scope', report.observation || '');
        formData.append('notes_remarks', report.checkedBy || '');
        formData.append('site_location', projectLocation || '');
        
        // Send problems as part of checklist
        const checklistData = {
            problems: report.problems,
            observation: report.observation,
        };
        formData.append('checklist', JSON.stringify(checklistData));
        
        if (photoFile) {
            formData.append('site_inspection_photo', photoFile);
        }
        
        return formData;
    };

    // ── Auto-save (debounced) ─────────────────────────────────────────────
    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;
        if (!isDirty.current) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const payload = buildPayload(currentReport);
                await api.post(
                    `/projects/${projectId}/site-inspection`,
                    payload,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                
                // Update cache
                setAllInspections(prev => ({
                    ...prev,
                    [selectedDate]: currentReport
                }));

                isDirty.current = false;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 3000);
            } catch (e) {
                console.error('[SiteInspection] auto-save failed:', e);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 4000);
            }
        }, 1500);

        return () => clearTimeout(autoSaveTimer.current);
    }, [currentReport, projectId, selectedDate]);

    // ── Manual save (with photo) ──────────────────────────────────────────
    const saveInspection = async ({ photoFile = null } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const payload = buildPayload(currentReport, photoFile);
            await api.post(
                `/projects/${projectId}/site-inspection`,
                payload,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            // Update cache
            setAllInspections(prev => ({
                ...prev,
                [selectedDate]: currentReport
            }));

            isDirty.current = false;
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
            
            return true;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save inspection.';
            setError(msg);
            setSaveStatus('error');
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    // Get list of dates that have inspections
    const getAvailableDates = useCallback(() => {
        return Object.keys(allInspections).sort().reverse();
    }, [allInspections]);

    return {
        selectedDate,
        setSelectedDate,
        currentReport,
        allInspections,
        availableDates: getAvailableDates(),
        leadEngineer,
        loading,
        saving,
        saveStatus,
        error,
        projectLocation,
        updateReport,
        addProblem,
        removeProblem,
        updateProblem,
        saveInspection,
    };
};