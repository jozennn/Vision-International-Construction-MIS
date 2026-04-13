// src/hooks/useSiteInspectionReport.js

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

// Map server log to local shape
const mapServerLog = (log) => {
    const problems = safeParse(log.checklist) || [];
    return {
        id:          log.id,
        date:        log.inspection_date,
        time:        log.inspection_time || timeNow(),
        inspectorId: log.inspector_id || '',
        preparedBy:  log.inspector_name || '',
        position:    log.inspector_position || '',
        checkedBy:   log.notes_remarks || '',
        observation: log.materials_scope || '',
        problems:    problems.filter(p => (p.problem ?? '').trim() || (p.solution ?? '').trim()),
        photoPath:   log.site_inspection_photo || null,
    };
};

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
    const [logsByDate, setLogsByDate] = useState({});
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [error, setError] = useState(null);

    const isFirstLoad = useRef(true);
    const autoSaveTimer = useRef(null);
    const isDirty = useRef(false);

    const leadEngineer = resolveLeadEngineer(project);

    // ── Current report (from logsByDate or blank) ─────────────────────────
    const currentReport = logsByDate[selectedDate] || blankReport(selectedDate);

    // ── Fetch all inspection logs ─────────────────────────────────────────
    const fetchAllLogs = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}/site-inspections`);
            const logs = res.data?.data || res.data || [];
            setAllLogs(logs);

            const map = {};
            logs.forEach(log => {
                if (log.inspection_date) {
                    map[log.inspection_date] = mapServerLog(log);
                }
            });
            setLogsByDate(map);
        } catch (e) {
            if (e.response?.status !== 404) {
                setError(e.response?.data?.message ?? 'Failed to load inspections.');
            }
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId]);

    useEffect(() => { fetchAllLogs(); }, [fetchAllLogs]);

    // ── Pre-fill preparedBy when leadEngineer is available ─────────────────
    useEffect(() => {
        if (!leadEngineer.name) return;
        
        setLogsByDate(prev => {
            const existing = prev[selectedDate];
            if (existing?.preparedBy) return prev;
            
            return {
                ...prev,
                [selectedDate]: {
                    ...(existing || blankReport(selectedDate)),
                    preparedBy: leadEngineer.name,
                    position: leadEngineer.position,
                }
            };
        });
    }, [leadEngineer.name, leadEngineer.position, selectedDate]);

    // ── Seed new date from most recent log ────────────────────────────────
    useEffect(() => {
        const existing = logsByDate[selectedDate];
        if (existing?.observation || existing?.problems?.length > 0) return;

        const dates = Object.keys(logsByDate)
            .filter(d => d < selectedDate)
            .sort((a, b) => b.localeCompare(a));
        
        const latestLog = dates.length > 0 ? logsByDate[dates[0]] : null;
        
        if (latestLog) {
            setLogsByDate(prev => ({
                ...prev,
                [selectedDate]: {
                    ...blankReport(selectedDate),
                    preparedBy: latestLog.preparedBy || leadEngineer.name,
                    position: latestLog.position || leadEngineer.position,
                    checkedBy: latestLog.checkedBy || '',
                }
            }));
        }
    }, [selectedDate]);

    // ── Reset dirty flag when date changes ────────────────────────────────
    useEffect(() => {
        isDirty.current = false;
    }, [selectedDate]);

    // ── Mark dirty and update current log ─────────────────────────────────
    const markDirty = () => { isDirty.current = true; };

    const updateCurrentLog = (updates) => {
        markDirty();
        setLogsByDate(prev => ({
            ...prev,
            [selectedDate]: { ...currentReport, ...updates }
        }));
    };

    const updateReport = (field, value) => {
        updateCurrentLog({ [field]: value });
    };

    // ── Problem row helpers ───────────────────────────────────────────────
    const addProblem = () => {
        markDirty();
        setLogsByDate(prev => ({
            ...prev,
            [selectedDate]: {
                ...currentReport,
                problems: [...currentReport.problems, { id: Date.now(), problem: '', solution: '' }],
            }
        }));
    };

    const removeProblem = (id) => {
        markDirty();
        setLogsByDate(prev => ({
            ...prev,
            [selectedDate]: {
                ...currentReport,
                problems: currentReport.problems.filter(p => p.id !== id),
            }
        }));
    };

    const updateProblem = (id, field, value) => {
        markDirty();
        setLogsByDate(prev => ({
            ...prev,
            [selectedDate]: {
                ...currentReport,
                problems: currentReport.problems.map(p => p.id === id ? { ...p, [field]: value } : p),
            }
        }));
    };

    // ── Build payload ─────────────────────────────────────────────────────
    const buildPayload = (report, photoFile = null) => {
        const formData = new FormData();
        formData.append('inspector_id', report.inspectorId || userId || '');
        formData.append('inspector_name', report.preparedBy);
        formData.append('inspector_position', report.position);
        formData.append('inspection_date', report.date);
        formData.append('inspection_time', report.time);
        formData.append('materials_scope', report.observation);
        formData.append('notes_remarks', report.checkedBy);
        formData.append('location', projectLocation);
        formData.append('checklist', JSON.stringify(report.problems));
        if (photoFile) formData.append('site_inspection_photo', photoFile);
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
                const res = await api.post(
                    `/projects/${projectId}/site-inspection`,
                    buildPayload(currentReport),
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                
                const savedLog = res.data?.inspection || res.data;
                
                setLogsByDate(prev => ({
                    ...prev,
                    [selectedDate]: mapServerLog(savedLog)
                }));

                setAllLogs(prev => {
                    const existing = prev.findIndex(l => l.inspection_date === selectedDate);
                    if (existing >= 0) {
                        const next = [...prev];
                        next[existing] = savedLog;
                        return next;
                    }
                    return [...prev, savedLog];
                });

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
    }, [currentReport, projectId, userId, projectLocation]);

    // ── Manual save (with photo) ──────────────────────────────────────────
    const saveInspection = async ({ photoFile = null } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await api.post(
                `/projects/${projectId}/site-inspection`,
                buildPayload(currentReport, photoFile),
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            const savedLog = res.data?.inspection || res.data;
            
            setLogsByDate(prev => ({
                ...prev,
                [selectedDate]: mapServerLog(savedLog)
            }));

            isDirty.current = false;
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
            
            return res.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save inspection.';
            setError(msg);
            setSaveStatus('error');
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        selectedDate,
        setSelectedDate,
        currentReport,
        allLogs,
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
        fetchAllLogs,
    };
};