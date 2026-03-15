// src/hooks/useTimelineGantt.js
//
// Manages all API calls for the Timeline + Gantt tab.
// Consumed by TimelineGantt.jsx.

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Working days between two dates (Saturday = OT, Sunday excluded)
export const workingDays = (start, end) => {
    if (!start || !end) return 0;
    let count = 0;
    const cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
        if (cur.getDay() !== 0) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
};

// Array of non-Sunday dates between two dates
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
    const [tasks,         setTasks]         = useState([]);
    const [installerCount,setInstallerCount] = useState(0);
    const [saving,        setSaving]         = useState(false);
    const [loading,       setLoading]        = useState(false);
    const [error,         setError]          = useState(null);

    // ── Hydrate from existing tracking data ──────────────────────────────
    useEffect(() => {
        if (!initialTrackingData) return;
        const raw = safeParse(initialTrackingData);
        if (Array.isArray(raw?.tasks) && raw.tasks.length > 0) {
            setTasks(raw.tasks);
        }
        if (raw?.installer_count) {
            setInstallerCount(raw.installer_count);
        }
    }, [initialTrackingData]);

    // ── Task CRUD ────────────────────────────────────────────────────────
    const addTask  = () => setTasks(p => [...p, emptyTask(Date.now())]);
    const addGroup = () => setTasks(p => [...p, emptyGroup(Date.now())]);

    const removeTask = (id) => setTasks(p => p.filter(t => t.id !== id));

    const updateTask = (id, field, value) =>
        setTasks(p => p.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, [field]: value };
            // Auto-calc duration when start or end changes
            if (field === 'start' || field === 'end') {
                const s = parseDate(field === 'start' ? value : t.start);
                const e = parseDate(field === 'end'   ? value : t.end);
                updated.duration = workingDays(s, e);
            }
            return updated;
        }));

    // Toggle an actual date on/off for a task
    const toggleActual = (taskId, dateStr) =>
        setTasks(p => p.map(t => {
            if (t.id !== taskId) return t;
            const ad = { ...(t.actualDates ?? {}) };
            ad[dateStr] = !ad[dateStr];
            return { ...t, actualDates: ad };
        }));

    // ── Derived project metrics ──────────────────────────────────────────
    const realTasks = tasks.filter(t => t.type === 'task' && t.start && t.end);

    const projectStart = realTasks.length
        ? realTasks.reduce((m, t) => (!m || t.start < m) ? t.start : m, null)
        : null;

    const projectEnd = realTasks.length
        ? realTasks.reduce((m, t) => (!m || t.end > m) ? t.end : m, null)
        : null;

    const projectDuration = workingDays(parseDate(projectStart), parseDate(projectEnd));

    // ── Gantt date columns (union of all task date ranges + 3 day buffer) ─
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

    // ── Save to backend ──────────────────────────────────────────────────
    // PATCH /api/projects/{id}/tracking/timeline
    const saveTimeline = async () => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {
                timeline_tracking: JSON.stringify({
                    tasks,
                    installer_count: installerCount,
                }),
            };
            const res = await api.patch(`/projects/${projectId}/tracking/timeline`, payload);
            return res.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save timeline.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Fetch fresh from backend (optional refresh) ──────────────────────
    const fetchTimeline = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res  = await api.get(`/projects/${projectId}`);
            const mat  = res.data?.project?.materials ?? res.data?.project;
            const raw  = safeParse(mat?.timeline_tracking);
            if (Array.isArray(raw?.tasks)) setTasks(raw.tasks);
            if (raw?.installer_count)      setInstallerCount(raw.installer_count);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to fetch timeline.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    return {
        // State
        tasks,
        installerCount,
        ganttDates,
        projectStart,
        projectEnd,
        projectDuration,
        loading,
        saving,
        error,
        // Setters
        setInstallerCount,
        // Task helpers
        addTask,
        addGroup,
        removeTask,
        updateTask,
        toggleActual,
        // Actions
        saveTimeline,
        fetchTimeline,
    };
};
