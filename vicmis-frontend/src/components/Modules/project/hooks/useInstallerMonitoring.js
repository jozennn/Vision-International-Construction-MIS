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

const buildBlankLog = (roster = [], date = today()) => ({
    date,
    totalArea:   '',
    clientStart: '',
    clientEnd:   '',
    actualStart: '',
    actualEnd:   '',
    completion:  '',
    remarks:     '',
    rows: roster.length > 0
        ? roster.map((r, i) => ({
            id:       i,
            name:     r.name     ?? '',
            position: r.position ?? '',
            timeIn:   '08:00',
            timeOut:  '17:00',
            remarks:  '',
          }))
        : [{ id: 0, name: '', position: '', timeIn: '08:00', timeOut: '17:00', remarks: '' }],
    // Photo fields
    photo_path:   null,
    team_photo_1: null,
    team_photo_2: null,
});

// ── Pre-fill a new date from the most recent existing log ─────────────────────
const buildPrefillLog = (latestLog, date, roster = []) => ({
    date,
    totalArea:   latestLog.totalArea   ?? '',
    clientStart: latestLog.clientStart ?? '',
    clientEnd:   latestLog.clientEnd   ?? '',
    actualStart: latestLog.actualStart ?? '',
    actualEnd:   '',    // intentionally blank — each day has its own actual end
    completion:  '',    // fresh % for the new day
    remarks:     '',    // fresh remarks for the new day
    rows: latestLog.rows?.length > 0
        ? latestLog.rows.map(r => ({ ...r, id: Date.now() + Math.random(), remarks: '' }))
        : buildBlankLog(roster, date).rows,
    // Don't copy photos to new date
    photo_path:   null,
    team_photo_1: null,
    team_photo_2: null,
});

const parseInstallers = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []); }
    catch { return []; }
};

// ── Map server record → local shape ───────────────────────────────────────────
const mapServerLog = (l, roster = []) => {
    const savedRows = parseInstallers(l.installers_data);
    return {
        id:              l.id,
        date:            l.log_date,
        totalArea:       l.total_area             ?? '',
        clientStart:     l.client_start_date      ?? '',
        clientEnd:       l.client_end_date        ?? '',
        actualStart:     l.start_date             ?? '',
        actualEnd:       l.end_date               ?? '',
        completion:      l.accomplishment_percent ?? '',
        remarks:         l.remarks                ?? '',
        rows:            savedRows.length > 0 ? savedRows : buildBlankLog(roster, l.log_date).rows,
        // Photo fields - preserve from server
        photo_path:      l.photo_path             ?? null,
        team_photo_1:    l.team_photo_1           ?? null,
        team_photo_2:    l.team_photo_2           ?? null,
        // Photo URLs for display
        photo_url:       l.photo_url              ?? null,
        team_photo_1_url: l.team_photo_1_url      ?? null,
        team_photo_2_url: l.team_photo_2_url      ?? null,
    };
};

// ── Map local log → server record shape ──────────────────────────────
const mapLocalToServerShape = (log, existingId = null, existingLog = null) => ({
    id:                     existingId ?? Date.now(),
    log_date:               log.date,
    total_area:             log.totalArea,
    client_start_date:      log.clientStart,
    client_end_date:        log.clientEnd,
    start_date:             log.actualStart,
    end_date:               log.actualEnd,
    accomplishment_percent: log.completion,
    remarks:                log.remarks,
    installers_data:        JSON.stringify(log.rows),
    // Preserve existing photos if they exist and no new photos are being uploaded
    photo_path:             log.photo_path ?? existingLog?.photo_path ?? null,
    team_photo_1:           log.team_photo_1 ?? existingLog?.team_photo_1 ?? null,
    team_photo_2:           log.team_photo_2 ?? existingLog?.team_photo_2 ?? null,
});

// ─────────────────────────────────────────────────────────────────────────────
export const useInstallerMonitoring = (projectId, roster = []) => {
    const [selectedDate, setSelectedDate] = useState(today());
    const [logsByDate,   setLogsByDate]   = useState({});
    const [allLogs,      setAllLogs]      = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [saveStatus,   setSaveStatus]   = useState(null);
    const [error,        setError]        = useState(null);

    const autoSaveTimer = useRef(null);
    const isFirstLoad   = useRef(true);
    const isDirty       = useRef(false);

    // ── Fetch all saved logs ──────────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res  = await api.get(`/projects/${projectId}/daily-logs`);
            const logs = res.data ?? [];
            setAllLogs(logs);

            const map = {};
            logs.forEach(l => { 
                map[l.log_date] = mapServerLog(l, roster); 
            });
            setLogsByDate(map);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId, roster]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // ── Re-seed blank rows from roster when roster loads after logs ───────
    useEffect(() => {
        if (roster.length === 0) return;
        setLogsByDate(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(date => {
                const log      = updated[date];
                const allBlank = log.rows.every(r => !r.name.trim());
                if (allBlank) {
                    updated[date] = { ...log, rows: buildBlankLog(roster, date).rows };
                }
            });
            return updated;
        });
    }, [roster.length]);

    // ── Seed logsByDate when switching to an unsaved date ────────────────
    useEffect(() => {
        const existing = logsByDate[selectedDate];
        const hasRealData = existing && (
            existing.totalArea?.trim()   ||
            existing.clientStart?.trim() ||
            existing.clientEnd?.trim()   ||
            existing.actualStart?.trim() ||
            existing.rows?.some(r => r.name?.trim())
        );
        if (hasRealData) return;

        const latestEntry = (() => {
            const dates = Object.keys(logsByDate)
                .filter(d => d !== selectedDate)
                .sort((a, b) => b.localeCompare(a));

            for (const d of dates) {
                const l = logsByDate[d];
                const hasData = l.totalArea?.trim()   ||
                                l.clientStart?.trim() ||
                                l.clientEnd?.trim()   ||
                                l.actualStart?.trim() ||
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
            const prevHasData  = prevExisting && (
                prevExisting.totalArea?.trim()   ||
                prevExisting.clientStart?.trim() ||
                prevExisting.clientEnd?.trim()   ||
                prevExisting.actualStart?.trim() ||
                prevExisting.rows?.some(r => r.name?.trim())
            );
            if (prevHasData) return prev;
            return { ...prev, [selectedDate]: seeded };
        });
    }, [selectedDate, logsByDate, roster]);

    // ── Reset dirty flag whenever the selected date changes ──────────────
    useEffect(() => {
        isDirty.current = false;
    }, [selectedDate]);

    // ── Current log ───────────────────────────────────────────────────────
    const currentLog = logsByDate[selectedDate] ?? buildBlankLog(roster, selectedDate);

    // ── setCurrentLog marks the log as dirty ─────────────────────────────
    const setCurrentLog = (updated) => {
        isDirty.current = true;
        setLogsByDate(prev => ({ ...prev, [selectedDate]: updated }));
    };

    // ── Row helpers ───────────────────────────────────────────────────────
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

    // ── Build FormData payload ─────────────────────────────────────────────
    const buildPayload = useCallback((log) => {
        const fd = new FormData();
        fd.append('log_date',               log.date);
        fd.append('total_area',             log.totalArea);
        fd.append('client_start_date',      log.clientStart);
        fd.append('client_end_date',        log.clientEnd);
        fd.append('start_date',             log.actualStart);
        fd.append('end_date',               log.actualEnd);
        fd.append('accomplishment_percent', log.completion);
        fd.append('remarks',                log.remarks);
        fd.append('workers_count',          log.rows.length);
        fd.append('installers_data',        JSON.stringify(log.rows));
        return fd;
    }, []);

    // ── Debounced auto-save (1.5 s after last change) ─────────────────────
    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;
        if (!isDirty.current) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const fd = buildPayload(currentLog);
                
                await api.post(
                    `/projects/${projectId}/daily-logs`,
                    fd,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                // Update allLogs in-memory
                setAllLogs(prev => {
                    const existingIdx = prev.findIndex(l => l.log_date === currentLog.date);
                    const existingLog = existingIdx >= 0 ? prev[existingIdx] : null;
                    const updated = mapLocalToServerShape(currentLog, existingLog?.id, existingLog);
                    if (existingIdx >= 0) {
                        const next = [...prev];
                        next[existingIdx] = updated;
                        return next;
                    }
                    return [...prev, updated];
                });

                isDirty.current = false;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 3000);
            } catch (e) {
                console.error('[InstallerMonitoring] auto-save failed:', e);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 4000);
            }
        }, 1500);

        return () => clearTimeout(autoSaveTimer.current);
    }, [currentLog, projectId, buildPayload]);

    // ── Manual save (handles photo uploads) ──────────────────────────────
    const saveLog = async ({ photoMain, photo1, photo2 } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const fd = buildPayload(currentLog);
            
            // Append photos if they exist
            if (photoMain) fd.append('photo', photoMain);
            if (photo1)    fd.append('team_photo_1', photo1);
            if (photo2)    fd.append('team_photo_2', photo2);

            const response = await api.post(
                `/projects/${projectId}/daily-logs`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            // Reset dirty after manual save
            isDirty.current = false;

            // Refresh logs to get updated photo paths
            await fetchLogs();
            
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
            
            return response.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save log.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        selectedDate, setSelectedDate,
        currentLog,   setCurrentLog,
        allLogs,
        loading, saving, saveStatus, error,
        addRow, removeRow, updateRow,
        saveLog, fetchLogs,
    };
};