// src/hooks/useTimelineGantt.js

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/api/axios';

// ── Helpers ──────────────────────────────────────────────────────────────────

export const workingDays = (start, end) => {
    if (!start || !end) return 0;
    let count = 0;
    const cur  = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
        if (cur.getDay() !== 0) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
};

export const dateRange = (start, end) => {
    const dates = [];
    const cur   = new Date(start);
    while (cur <= end) {
        if (cur.getDay() !== 0) dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

export const parseDate = (s) => s ? new Date(s + 'T00:00:00') : null;

export const fmtDate = (d) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const emptyTask  = (id) => ({
    id, type: 'task', name: '', start: '', end: '',
    duration: 0, unit: 'DAYS', percent: 0, actualDates: {},
});
const emptyGroup = (id) => ({ id, type: 'group', name: '' });

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return parsed ?? {};
    } catch { return {}; }
};

// ─────────────────────────────────────────────────────────────────────────────
export const useTimelineGantt = (projectId, initialTrackingData = null) => {
    const [tasks,       setTasks]       = useState([]);
    const [installerCount, setInstallerCount] = useState(0);
    const [saving,      setSaving]      = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [autoSaved,   setAutoSaved]   = useState(false);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);

    const debounceTimer  = useRef(null);
    const isFirstRender  = useRef(true);
    const latestTasks    = useRef(tasks);
    const latestInstaller = useRef(installerCount);

    useEffect(() => { latestTasks.current     = tasks;         }, [tasks]);
    useEffect(() => { latestInstaller.current = installerCount; }, [installerCount]);

    // ── Fetch from API — always called fresh when projectId is set ────────
    // We do NOT rely on initialTrackingData alone because it may be stale
    // (passed once from parent on mount). Instead we always fetch from the
    // API so navigating away and back always restores the latest saved state.
    const fetchTimeline = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        // Reset the autosave guard so the freshly loaded data doesn't
        // immediately trigger a redundant save.
        isFirstRender.current = true;
        try {
            const res = await api.get(`/projects/${projectId}`);
            const mat = res.data?.project?.materials ?? res.data?.project;
            const raw = safeParse(mat?.timeline_tracking);

            if (Array.isArray(raw?.tasks) && raw.tasks.length > 0) {
                setTasks(raw.tasks);
            } else {
                // No saved tasks yet — start with empty slate
                setTasks([]);
            }

            if (raw?.installer_count) setInstallerCount(raw.installer_count);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to fetch timeline.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // ── Always fetch fresh when projectId changes ─────────────────────────
    // This fixes the "navigate away and back shows blank" bug because the
    // hook now re-fetches every time the component mounts with a projectId,
    // rather than relying on a hydrated flag that never resets.
    useEffect(() => {
        if (!projectId) return;

        // If parent passed fresh tracking data and it actually has tasks,
        // use it immediately to avoid a flicker — but still fetch in the
        // background to ensure we have the latest.
        if (initialTrackingData) {
            const raw = safeParse(initialTrackingData);
            if (Array.isArray(raw?.tasks) && raw.tasks.length > 0) {
                isFirstRender.current = true; // prevent immediate autosave
                setTasks(raw.tasks);
                if (raw?.installer_count) setInstallerCount(raw.installer_count);
            }
        }

        // Always fetch fresh from API regardless
        fetchTimeline();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // ── Debounced autosave ────────────────────────────────────────────────
    // Fires 1.5 s after the last change to tasks or installerCount.
    // isFirstRender guard prevents saving on initial hydration.
    useEffect(() => {
        if (!projectId) return;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
            setSaving(true);
            setAutoSaved(false);
            try {
                await api.patch(`/projects/${projectId}/tracking/timeline`, {
                    timeline_tracking: JSON.stringify({
                        tasks:           latestTasks.current,
                        installer_count: latestInstaller.current,
                    }),
                });
                setAutoSaved(true);
                setTimeout(() => setAutoSaved(false), 2500);
            } catch (e) {
                console.warn('Autosave failed:', e.response?.data?.message ?? e.message);
            } finally {
                setSaving(false);
            }
        }, 1500);

        return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, installerCount]);

    // ── Task CRUD ─────────────────────────────────────────────────────────
    const addTask    = () => setTasks(p => [...p, emptyTask(Date.now())]);
    const addGroup   = () => setTasks(p => [...p, emptyGroup(Date.now())]);
    const removeTask = (id) => setTasks(p => p.filter(t => t.id !== id));

    const updateTask = (id, field, value) =>
        setTasks(p => p.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, [field]: value };
            if (field === 'start' || field === 'end') {
                const s = parseDate(field === 'start' ? value : t.start);
                const e = parseDate(field === 'end'   ? value : t.end);
                updated.duration = workingDays(s, e);
            }
            return updated;
        }));

    const toggleActual = (taskId, dateStr) =>
        setTasks(p => p.map(t => {
            if (t.id !== taskId) return t;
            const ad = { ...(t.actualDates ?? {}) };
            ad[dateStr] = !ad[dateStr];
            return { ...t, actualDates: ad };
        }));

    // ── Derived project metrics ───────────────────────────────────────────
    const realTasks = tasks.filter(t => t.type === 'task' && t.start && t.end);

    const projectStart = realTasks.length
        ? realTasks.reduce((m, t) => (!m || t.start < m) ? t.start : m, null)
        : null;

    const projectEnd = realTasks.length
        ? realTasks.reduce((m, t) => (!m || t.end > m) ? t.end : m, null)
        : null;

    const projectDuration = workingDays(parseDate(projectStart), parseDate(projectEnd));

    const ganttDates = (() => {
        const allDates = [];
        realTasks.forEach(t => {
            const s = parseDate(t.start), e = parseDate(t.end);
            if (s && e) dateRange(s, e).forEach(d => allDates.push(d));
        });
        if (allDates.length === 0) return [];
        const min = new Date(Math.min(...allDates.map(d => d.getTime())));
        const max = new Date(Math.max(...allDates.map(d => d.getTime())));
        min.setDate(min.getDate() - 3);
        max.setDate(max.getDate() + 3);
        return dateRange(min, max);
    })();

    // ── Manual save ───────────────────────────────────────────────────────
    const saveTimeline = async () => {
        if (!projectId) return;
        clearTimeout(debounceTimer.current);
        setSaving(true);
        setSaveSuccess(false);
        setError(null);
        try {
            const payload = {
                timeline_tracking: JSON.stringify({
                    tasks,
                    installer_count: installerCount,
                }),
            };
            const res = await api.patch(`/projects/${projectId}/tracking/timeline`, payload);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            return res.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save timeline.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        tasks,
        installerCount,
        ganttDates,
        projectStart,
        projectEnd,
        projectDuration,
        loading,
        saving,
        saveSuccess,
        autoSaved,
        error,
        setInstallerCount,
        addTask,
        addGroup,
        removeTask,
        updateTask,
        toggleActual,
        saveTimeline,
        fetchTimeline,
    };
};