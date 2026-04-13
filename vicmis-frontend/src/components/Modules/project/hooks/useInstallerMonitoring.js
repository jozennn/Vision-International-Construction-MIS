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

            const map = {};
            logs.forEach(l => {
                const savedRows = parseInstallers(l.installers_data);
                map[l.log_date] = {
                    date:        l.log_date,
                    totalArea:   l.total_area             ?? '',
                    clientStart: l.client_start_date      ?? '',
                    clientEnd:   l.client_end_date        ?? '',
                    actualStart: l.start_date             ?? '',
                    actualEnd:   l.end_date               ?? '',
                    completion:  l.accomplishment_percent ?? '',
                    remarks:     l.remarks                ?? '',
                    rows: savedRows.length > 0 ? savedRows : buildBlankLog(roster, l.log_date).rows,
                };
            });
            setLogsByDate(map);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
            // Allow auto-save to fire after initial hydration
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // ── Re-seed rows from roster when roster loads after logs ─────────────
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

    // ── Switching date preserves the previous date's data ─────────────────
    // logsByDate is keyed by date so each date's edits are fully isolated.
    // When user picks a new date, currentLog automatically reads from that
    // date's entry (or builds a blank one) — no data is lost.
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

    // ── Build save payload (reused by auto-save and manual save) ──────────
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

    // ── Debounced auto-save (fires 1.5s after user stops typing) ─────────
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
                // Update allLogs list without a full refetch
                setAllLogs(prev => {
                    const exists = prev.find(l => l.log_date === currentLog.date);
                    if (exists) {
                        return prev.map(l => l.log_date === currentLog.date
                            ? { ...l,
                                total_area:             currentLog.totalArea,
                                remarks:                currentLog.remarks,
                                accomplishment_percent: currentLog.completion,
                                installers_data:        JSON.stringify(currentLog.rows),
                              }
                            : l
                        );
                    }
                    // New date entry — add to list
                    return [...prev, {
                        id:                     Date.now(),
                        log_date:               currentLog.date,
                        total_area:             currentLog.totalArea,
                        remarks:                currentLog.remarks,
                        accomplishment_percent: currentLog.completion,
                        installers_data:        JSON.stringify(currentLog.rows),
                    }];
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