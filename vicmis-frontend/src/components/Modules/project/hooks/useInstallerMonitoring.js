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

// ── Pre-fill a new date from the most recent existing log ─────────────────────
// Carries over: clientStart, clientEnd, actualStart, totalArea, installer rows.
// Resets: date, actualEnd, completion, remarks (these are day-specific).
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
});

const parseInstallers = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []); }
    catch { return []; }
};

// ── Map server record → local shape ───────────────────────────────────────────
const mapServerLog = (l, roster = []) => {
    const savedRows = parseInstallers(l.installers_data);
    return {
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
};

// ── Map local log → server record shape (for optimistic updates) ──────────────
const mapLocalToServerShape = (log, existingId = null) => ({
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
});

// ── Get the most recent log from the date-keyed map ───────────────────────────
const getLatestLog = (logsByDate) => {
    const dates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
    return dates.length > 0 ? logsByDate[dates[0]] : null;
};

// ─────────────────────────────────────────────────────────────────────────────
export const useInstallerMonitoring = (projectId, roster = []) => {
    const [selectedDate, setSelectedDate] = useState(today());
    const [logsByDate,   setLogsByDate]   = useState({});
    const [allLogs,      setAllLogs]      = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [saveStatus,   setSaveStatus]   = useState(null); // 'saving'|'saved'|'error'|null
    const [error,        setError]        = useState(null);

    const autoSaveTimer = useRef(null);
    const isFirstLoad   = useRef(true);

    // ── Dirty flag — true only when user actually edits the current date ──
    // Prevents auto-save from firing just because we seeded a prefilled log
    // when the user switched to a new date without typing anything.
    const isDirty = useRef(false);

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
            logs.forEach(l => { map[l.log_date] = mapServerLog(l, roster); });
            setLogsByDate(map);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId]);

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
    // This is MEMORY ONLY — no API call here.
    // It pre-fills fields from the most recent saved log so the user doesn't
    // have to re-type clientStart, clientEnd, totalArea, and installer rows
    // every single day.
    // The dirty flag is intentionally NOT set here — auto-save will only
    // fire once the user actually edits a field.
    useEffect(() => {
        // Already have a saved or previously seeded entry for this date — skip
        if (logsByDate[selectedDate]) return;

        const latest = getLatestLog(logsByDate);
        const seeded = latest
            ? buildPrefillLog(latest, selectedDate, roster)
            : buildBlankLog(roster, selectedDate);

        setLogsByDate(prev => {
            // Guard: another render may have already set it
            if (prev[selectedDate]) return prev;
            return { ...prev, [selectedDate]: seeded };
        });
    }, [selectedDate, logsByDate, roster]);

    // ── Reset dirty flag whenever the selected date changes ──────────────
    // This ensures switching dates doesn't carry over the dirty state from
    // a previous date's edits.
    useEffect(() => {
        isDirty.current = false;
    }, [selectedDate]);

    // ── Current log ───────────────────────────────────────────────────────
    // Always read from logsByDate (seeded by the effect above if new date).
    // Fallback to blank only as a safety net during the brief render cycle
    // before the seed effect fires.
    const currentLog = logsByDate[selectedDate] ?? buildBlankLog(roster, selectedDate);

    // ── setCurrentLog marks the log as dirty ─────────────────────────────
    // Any field edit (including row changes) goes through here, which sets
    // isDirty = true and allows auto-save to proceed.
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
    // Only fires when isDirty is true — i.e. the user actually typed or
    // changed something on this date. Switching dates alone does NOT trigger
    // this even though logsByDate changes (because isDirty gets reset above).
    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;
        if (!isDirty.current) return; // ← KEY GUARD: skip if nothing was edited

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await api.post(
                    `/projects/${projectId}/daily-logs`,
                    buildPayload(currentLog),
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                // Upsert allLogs in-memory so history list stays accurate
                setAllLogs(prev => {
                    const existingIdx = prev.findIndex(l => l.log_date === currentLog.date);
                    const updated     = mapLocalToServerShape(
                        currentLog,
                        existingIdx >= 0 ? prev[existingIdx].id : null,
                    );
                    if (existingIdx >= 0) {
                        const next = [...prev];
                        next[existingIdx] = updated;
                        return next;
                    }
                    return [...prev, updated];
                });

                // Reset dirty after a successful auto-save so we don't
                // re-fire the save unless the user edits again.
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

            // Reset dirty after manual save too
            isDirty.current = false;

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