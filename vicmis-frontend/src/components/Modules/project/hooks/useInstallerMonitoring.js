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
});

const parseInstallers = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []); }
    catch { return []; }
};

// ── Map a raw server log record → local shape ─────────────────────────────────
// Single source of truth: every place that builds a logsByDate entry uses this.
const mapServerLog = (l, roster = []) => {
    const savedRows = parseInstallers(l.installers_data);
    return {
        date:        l.log_date,
        totalArea:   l.total_area             ?? '',
        clientStart: l.client_start_date      ?? '',   // ← FIX: was missing in optimistic update
        clientEnd:   l.client_end_date        ?? '',   // ← FIX: was missing in optimistic update
        actualStart: l.start_date             ?? '',   // ← FIX: was missing in optimistic update
        actualEnd:   l.end_date               ?? '',   // ← FIX: was missing in optimistic update
        completion:  l.accomplishment_percent ?? '',
        remarks:     l.remarks                ?? '',
        rows: savedRows.length > 0 ? savedRows : buildBlankLog(roster, l.log_date).rows,
    };
};

// ── Map a local log shape → the allLogs server-record shape ──────────────────
// Mirrors mapServerLog so optimistic updates stay consistent.
const mapLocalToServerShape = (log, existingId = null) => ({
    id:                     existingId ?? Date.now(),
    log_date:               log.date,
    total_area:             log.totalArea,
    client_start_date:      log.clientStart,   // ← FIX: all fields now included
    client_end_date:        log.clientEnd,
    start_date:             log.actualStart,
    end_date:               log.actualEnd,
    accomplishment_percent: log.completion,
    remarks:                log.remarks,
    installers_data:        JSON.stringify(log.rows),
});

// ─────────────────────────────────────────────────────────────────────────────
export const useInstallerMonitoring = (projectId, roster = []) => {
    const [selectedDate, setSelectedDate] = useState(today());
    const [logsByDate,   setLogsByDate]   = useState({});
    const [allLogs,      setAllLogs]      = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [saveStatus,   setSaveStatus]   = useState(null); // 'saving' | 'saved' | 'error' | null
    const [error,        setError]        = useState(null);

    const autoSaveTimer = useRef(null);
    const isFirstLoad   = useRef(true);

    // ── Fetch all saved logs ──────────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res  = await api.get(`/projects/${projectId}/daily-logs`);
            const logs = res.data ?? [];
            setAllLogs(logs);

            // Build the date-keyed map using the shared mapper
            const map = {};
            logs.forEach(l => { map[l.log_date] = mapServerLog(l, roster); });
            setLogsByDate(map);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId]); // roster intentionally omitted — re-seed effect handles it

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // ── Re-seed blank rows from roster when roster loads after logs ───────
    useEffect(() => {
        if (roster.length === 0) return;
        setLogsByDate(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(date => {
                const log = updated[date];
                const allBlank = log.rows.every(r => !r.name.trim());
                if (allBlank) {
                    updated[date] = { ...log, rows: buildBlankLog(roster, date).rows };
                }
            });
            return updated;
        });
    }, [roster.length]);

    // ── Current log (or blank with roster pre-filled) ─────────────────────
    const currentLog = logsByDate[selectedDate] ?? buildBlankLog(roster, selectedDate);

    // ── Switching date: update selectedDate; currentLog auto-derives ──────
    const setCurrentLog = (updated) =>
        setLogsByDate(prev => ({ ...prev, [selectedDate]: updated }));

    // ── Row helpers ───────────────────────────────────────────────────────
    const addRow = () =>
        setCurrentLog({
            ...currentLog,
            rows: [...currentLog.rows, {
                id: Date.now(), name: '', position: '', timeIn: '08:00', timeOut: '17:00', remarks: '',
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
        fd.append('remarks',               log.remarks);
        fd.append('workers_count',          log.rows.length);
        fd.append('installers_data',        JSON.stringify(log.rows));
        return fd;
    }, []);

    // ── Debounced auto-save ───────────────────────────────────────────────
    // FIX: optimistic update now uses mapLocalToServerShape so ALL fields
    // (including clientStart/End, actualStart/End) are reflected immediately.
    // FIX: upsert logic checks allLogs for an existing record by date before
    // deciding to add vs. replace — prevents the ever-growing history list.
    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await api.post(
                    `/projects/${projectId}/daily-logs`,
                    buildPayload(currentLog),
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                // ── Upsert allLogs in-memory ──────────────────────────────
                // Replace the existing entry for this date, or append if new.
                // This is the ONLY place allLogs is mutated between full fetches.
                setAllLogs(prev => {
                    const existingIdx = prev.findIndex(l => l.log_date === currentLog.date);
                    const updated     = mapLocalToServerShape(
                        currentLog,
                        existingIdx >= 0 ? prev[existingIdx].id : null,
                    );

                    if (existingIdx >= 0) {
                        // Replace — never grows the list
                        const next = [...prev];
                        next[existingIdx] = updated;
                        return next;
                    }
                    // Genuinely new date — append once
                    return [...prev, updated];
                });

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

    // ── Manual save (also handles photo uploads) ──────────────────────────
    const saveLog = async ({ photoMain, photo1, photo2 } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const fd = buildPayload(currentLog);
            if (photoMain) fd.append('photo',        photoMain);
            if (photo1)    fd.append('team_photo_1', photo1);
            if (photo2)    fd.append('team_photo_2', photo2);

            await api.post(
                `/projects/${projectId}/daily-logs`,
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            // Full refetch after manual save to sync server-assigned IDs / timestamps
            await fetchLogs();
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
        selectedDate, setSelectedDate,
        currentLog,   setCurrentLog,
        allLogs,
        loading, saving, saveStatus, error,
        addRow, removeRow, updateRow,
        saveLog, fetchLogs,
    };
};