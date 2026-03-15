// src/hooks/useInstallerMonitoring.js

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

const today = () => new Date().toISOString().split('T')[0];

// ── Reads installer_roster from wherever formatProject puts it ────────────────
// ProjectController::formatProject() returns installer_roster at the TOP LEVEL
// of the project object (project.installer_roster), not nested under mobilization.
// We check both locations so it works regardless of API shape.
export const resolveRoster = (project) => {
    // 1. Top-level (from formatProject)
    const topLevel = project?.installer_roster;
    if (Array.isArray(topLevel) && topLevel.length > 0) return topLevel;

    // 2. Nested under mobilization (direct relationship object)
    const nested = project?.mobilization?.installer_roster;
    if (Array.isArray(nested) && nested.length > 0) return nested;

    // 3. JSON string fallback
    if (typeof topLevel === 'string') {
        try { const p = JSON.parse(topLevel); if (Array.isArray(p)) return p; } catch {}
    }
    if (typeof nested === 'string') {
        try { const p = JSON.parse(nested); if (Array.isArray(p)) return p; } catch {}
    }

    return [];
};

// ── Build a blank log pre-filled with roster names + positions ────────────────
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
        // If no roster yet, start with one blank row
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
    const [error,        setError]        = useState(null);

    // ── Fetch all saved logs ──────────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res  = await api.get(`/projects/${projectId}/daily-logs`);
            const logs = res.data ?? [];
            setAllLogs(logs);

            // Hydrate logsByDate from saved records
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
                    // If saved rows exist use them, otherwise pre-fill from roster
                    rows: savedRows.length > 0 ? savedRows : buildBlankLog(roster, l.log_date).rows,
                };
            });
            setLogsByDate(map);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load daily logs.');
        } finally {
            setLoading(false);
        }
    }, [projectId]); // intentionally omit roster — stable after mount

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // ── Re-seed rows from roster when roster loads after logs ─────────────
    // Edge case: project loads before mobilization relation is eager-loaded.
    useEffect(() => {
        if (roster.length === 0) return;
        setLogsByDate(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(date => {
                const log = updated[date];
                // Only update rows that are all blank (not yet manually edited)
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

    // ── Save ──────────────────────────────────────────────────────────────
    const saveLog = async ({ photoMain, photo1, photo2 } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('log_date',               currentLog.date);
            formData.append('total_area',             currentLog.totalArea);
            formData.append('client_start_date',      currentLog.clientStart);
            formData.append('client_end_date',        currentLog.clientEnd);
            formData.append('start_date',             currentLog.actualStart);
            formData.append('end_date',               currentLog.actualEnd);
            formData.append('accomplishment_percent', currentLog.completion);
            formData.append('remarks',                currentLog.remarks);
            formData.append('workers_count',          currentLog.rows.length);
            formData.append('installers_data',        JSON.stringify(currentLog.rows));
            if (photoMain) formData.append('photo',        photoMain);
            if (photo1)    formData.append('team_photo_1', photo1);
            if (photo2)    formData.append('team_photo_2', photo2);

            await api.post(
                `/projects/${projectId}/daily-logs`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            await fetchLogs(); // refresh history list
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
        loading, saving, error,
        addRow, removeRow, updateRow,
        saveLog, fetchLogs,
    };
};