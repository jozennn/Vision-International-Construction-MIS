// src/hooks/useInstallerMonitoring.js

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';

const today = () => new Date().toISOString().split('T')[0];

export const resolveRoster = (project) => {
    const topLevel = project?.installer_roster;
    if (Array.isArray(topLevel) && topLevel.length > 0) return topLevel;

    const nested = project?.mobilization?.installer_roster;
    if (Array.isArray(nested) && nested.length > 0) return nested;

    if (typeof topLevel === 'string') {
        try { const p = JSON.parse(topLevel); if (Array.isArray(p)) return p; } catch {}
    }
    if (typeof nested === 'string') {
        try { const p = JSON.parse(nested); if (Array.isArray(p)) return p; } catch {}
    }

    return [];
};

// Helper to format date from ISO to YYYY-MM-DD
const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
};

const buildBlankLog = (roster = [], date = today()) => ({
    id: null,
    date: date,
    totalArea: '',
    clientStart: '',
    clientEnd: '',
    actualStart: '',
    actualEnd: '',
    completion: '',
    remarks: '',
    rows: roster.length > 0
        ? roster.map((r, i) => ({
            id: i,
            name: r.name ?? '',
            position: r.position ?? '',
            timeIn: '08:00',
            timeOut: '17:00',
            remarks: '',
          }))
        : [{ id: 0, name: '', position: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }],
    photo_path: null,
    team_photo_1: null,
    team_photo_2: null,
    photo_url: null,
    team_photo_1_url: null,
    team_photo_2_url: null,
});

const buildPrefillLog = (latestLog, date, roster = []) => ({
    id: null,
    date: date,
    totalArea: latestLog.totalArea ?? '',
    clientStart: latestLog.clientStart ?? '',
    clientEnd: latestLog.clientEnd ?? '',
    actualStart: latestLog.actualStart ?? '',
    actualEnd: '',
    completion: '',
    remarks: '',
    rows: latestLog.rows?.length > 0
        ? latestLog.rows.map(r => ({ ...r, id: Date.now() + Math.random(), remarks: '' }))
        : buildBlankLog(roster, date).rows,
    photo_path: null,
    team_photo_1: null,
    team_photo_2: null,
    photo_url: null,
    team_photo_1_url: null,
    team_photo_2_url: null,
});

const parseInstallers = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []); }
    catch { return []; }
};

const mapServerLog = (l, roster = []) => {
    const savedRows = parseInstallers(l.installers_data);
    return {
        id: l.id,
        date: formatDate(l.log_date),
        totalArea: l.total_area ?? '',
        clientStart: formatDate(l.client_start_date),
        clientEnd: formatDate(l.client_end_date),
        actualStart: formatDate(l.start_date),
        actualEnd: formatDate(l.end_date),
        completion: l.accomplishment_percent ?? '',
        remarks: l.remarks ?? '',
        rows: savedRows.length > 0 ? savedRows : buildBlankLog(roster, formatDate(l.log_date)).rows,
        photo_path: l.photo_path ?? null,
        team_photo_1: l.team_photo_1 ?? null,
        team_photo_2: l.team_photo_2 ?? null,
        photo_url: l.photo_url ?? null,
        team_photo_1_url: l.team_photo_1_url ?? null,
        team_photo_2_url: l.team_photo_2_url ?? null,
    };
};

export const useInstallerMonitoring = (projectId, roster = []) => {
    const [selectedDate, setSelectedDate] = useState(today());
    const [logsByDate, setLogsByDate] = useState({});
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [error, setError] = useState(null);

    const autoSaveTimer = useRef(null);
    const isFirstLoad = useRef(true);
    const isDirty = useRef(false);

    const fetchLogs = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}/daily-logs`);
            const logs = res.data ?? [];
            setAllLogs(logs);

            const map = {};
            logs.forEach(l => {
                const formattedDate = formatDate(l.log_date);
                map[formattedDate] = mapServerLog(l, roster);
            });
            setLogsByDate(map);
        } catch (e) {
            console.error('Fetch logs error:', e);
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId, roster]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    useEffect(() => {
        if (roster.length === 0) return;
        setLogsByDate(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(date => {
                const log = updated[date];
                const allBlank = log.rows.every(r => !r.name?.trim());
                if (allBlank && roster.length > 0) {
                    updated[date] = { ...log, rows: buildBlankLog(roster, date).rows };
                }
            });
            return updated;
        });
    }, [roster.length]);

    useEffect(() => {
        const existing = logsByDate[selectedDate];
        const hasRealData = existing && (
            existing.totalArea?.trim() ||
            existing.clientStart?.trim() ||
            existing.clientEnd?.trim() ||
            existing.actualStart?.trim() ||
            existing.actualEnd?.trim() ||
            existing.rows?.some(r => r.name?.trim())
        );
        
        if (hasRealData) return;

        const latestEntry = (() => {
            const dates = Object.keys(logsByDate)
                .filter(d => d !== selectedDate)
                .sort((a, b) => b.localeCompare(a));

            for (const d of dates) {
                const l = logsByDate[d];
                const hasData = l.totalArea?.trim() ||
                               l.clientStart?.trim() ||
                               l.clientEnd?.trim() ||
                               l.actualStart?.trim() ||
                               l.actualEnd?.trim() ||
                               l.rows?.some(r => r.name?.trim());
                if (hasData) return l;
            }
            return null;
        })();

        const seeded = latestEntry
            ? buildPrefillLog(latestEntry, selectedDate, roster)
            : buildBlankLog(roster, selectedDate);

        setLogsByDate(prev => {
            const prevExisting = prev[selectedDate];
            const prevHasData = prevExisting && (
                prevExisting.totalArea?.trim() ||
                prevExisting.clientStart?.trim() ||
                prevExisting.clientEnd?.trim() ||
                prevExisting.actualStart?.trim() ||
                prevExisting.actualEnd?.trim() ||
                prevExisting.rows?.some(r => r.name?.trim())
            );
            if (prevHasData) return prev;
            return { ...prev, [selectedDate]: seeded };
        });
    }, [selectedDate, logsByDate, roster]);

    useEffect(() => {
        isDirty.current = false;
    }, [selectedDate]);

    const currentLog = logsByDate[selectedDate] ?? buildBlankLog(roster, selectedDate);

    const setCurrentLog = (updated) => {
        isDirty.current = true;
        setLogsByDate(prev => ({ ...prev, [selectedDate]: updated }));
    };

    const addRow = () =>
        setCurrentLog({
            ...currentLog,
            rows: [...currentLog.rows, {
                id: Date.now(), name: '', position: '',
                timeIn: '08:00', timeOut: '17:00', remarks: '',
            }],
        });

    const removeRow = (id) => {
        if (currentLog.rows.length <= 1) return;
        setCurrentLog({ ...currentLog, rows: currentLog.rows.filter(r => r.id !== id) });
    };

    const updateRow = (id, field, value) =>
        setCurrentLog({
            ...currentLog,
            rows: currentLog.rows.map(r => r.id === id ? { ...r, [field]: value } : r),
        });

    const saveToServer = async (log, photos = {}) => {
        const fd = new FormData();
        
        fd.append('log_date', log.date);
        fd.append('total_area', log.totalArea || '');
        fd.append('client_start_date', log.clientStart || '');
        fd.append('client_end_date', log.clientEnd || '');
        fd.append('start_date', log.actualStart || '');
        fd.append('end_date', log.actualEnd || '');
        fd.append('accomplishment_percent', log.completion || '');
        fd.append('remarks', log.remarks || '');
        fd.append('workers_count', log.rows.length);
        fd.append('installers_data', JSON.stringify(log.rows));
        
        if (photos.photoMain instanceof File) {
            fd.append('photo', photos.photoMain);
        }
        if (photos.photo1 instanceof File) {
            fd.append('team_photo_1', photos.photo1);
        }
        if (photos.photo2 instanceof File) {
            fd.append('team_photo_2', photos.photo2);
        }

        const response = await api.post(`/projects/${projectId}/daily-logs`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        return response.data;
    };

    // Auto-save
    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;
        if (!isDirty.current) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await saveToServer(currentLog, {});
                await fetchLogs();
                isDirty.current = false;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 3000);
            } catch (e) {
                console.error('Auto-save failed:', e);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 4000);
            }
        }, 1500);

        return () => clearTimeout(autoSaveTimer.current);
    }, [currentLog, projectId, fetchLogs]);

    const saveLog = async ({ photoMain, photo1, photo2 } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        
        try {
            const result = await saveToServer(currentLog, { photoMain, photo1, photo2 });
            
            if (result.log) {
                const mappedLog = mapServerLog(result.log, roster);
                setLogsByDate(prev => ({
                    ...prev,
                    [selectedDate]: mappedLog
                }));
                
                setAllLogs(prev => {
                    const existingIdx = prev.findIndex(l => l.log_date === result.log.log_date);
                    if (existingIdx >= 0) {
                        const next = [...prev];
                        next[existingIdx] = result.log;
                        return next;
                    }
                    return [...prev, result.log];
                });
            }
            
            isDirty.current = false;
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
            
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save log.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        selectedDate,
        setSelectedDate,
        currentLog,
        setCurrentLog,
        allLogs,
        loading,
        saving,
        saveStatus,
        error,
        addRow,
        removeRow,
        updateRow,
        saveLog,
        fetchLogs,
    };
};