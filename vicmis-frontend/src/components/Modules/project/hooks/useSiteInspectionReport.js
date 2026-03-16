// src/hooks/useSiteInspectionReport.js

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

const today   = () => new Date().toISOString().split('T')[0];
const timeNow = () => new Date().toTimeString().slice(0, 5);

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
};

const blankReport = () => ({
    date:        today(),
    time:        timeNow(),
    inspectorId: '',
    preparedBy:  '',
    position:    '',
    checkedBy:   '',
    observation: '',
    problems:    [],
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Resolves the lead engineer name directly from the project object.
 * Checks project.assigned_engineers and project.assignments — no API call needed.
 */
const resolveLeadEngineer = (project) => {
    // Check assigned_engineers array (formatted project shape)
    const engineers = project?.assigned_engineers;
    if (Array.isArray(engineers) && engineers.length > 0) {
        const first = engineers[0];
        if (typeof first === 'string') return { name: first, position: 'Engineer' };
        if (first?.name) return { name: first.name, position: first.position ?? 'Engineer' };
    }

    // Fall back to project.assignments (raw shape)
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

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string|number} projectId
 * @param {string}        projectLocation  - project.location from parent
 * @param {string|number} userId           - logged-in user id
 * @param {Object}        project          - full project object (for engineer lookup)
 */
export const useSiteInspectionReport = (projectId, projectLocation = '', userId = null, project = null) => {
    const [report,  setReport]  = useState(blankReport());
    const [loading, setLoading] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState(null);

    // Derive lead engineer from project prop — no API call, no 404
    const leadEngineer = resolveLeadEngineer(project);

    // ── Auto-fill preparedBy from assigned engineer on first load ─────────
    useEffect(() => {
        if (!leadEngineer.name) return;
        setReport(r => ({
            ...r,
            // Only pre-fill if the user hasn't already typed something
            preparedBy: r.preparedBy || leadEngineer.name,
            position:   r.position   || leadEngineer.position,
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadEngineer.name]);

    // ── Load previously saved inspection ──────────────────────────────────
    const fetchInspection = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}/site-inspection`);
            const d   = res.data;

            if (!d || !d.inspection_date) return;

            const problems = safeParse(d.checklist);

            setReport({
                date:        d.inspection_date    ?? today(),
                time:        d.inspection_time    ?? timeNow(),
                inspectorId: d.inspector_id       ?? '',
                preparedBy:  d.inspector_name     ?? leadEngineer.name,
                position:    d.inspector_position ?? leadEngineer.position,
                observation: d.materials_scope    ?? '',
                checkedBy:   d.notes_remarks      ?? '',
                problems: (problems && problems.length > 0)
                    ? problems.filter(p => (p.problem ?? '').trim() || (p.solution ?? '').trim())
                    : [],
            });
        } catch (e) {
            // 404 just means no inspection saved yet — not an error worth showing
            if (e.response?.status !== 404) {
                setError(e.response?.data?.message ?? 'Failed to load inspection.');
            }
        } finally {
            setLoading(false);
        }
    }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchInspection(); }, [fetchInspection]);

    // ── Field helpers ─────────────────────────────────────────────────────
    const updateReport = (field, value) =>
        setReport(r => ({ ...r, [field]: value }));

    // ── Problem row helpers ───────────────────────────────────────────────
    const addProblem = () =>
        setReport(r => ({
            ...r,
            problems: [...r.problems, { id: Date.now(), problem: '', solution: '' }],
        }));

    const removeProblem = (id) =>
        setReport(r => ({ ...r, problems: r.problems.filter(p => p.id !== id) }));

    const updateProblem = (id, field, value) =>
        setReport(r => ({
            ...r,
            problems: r.problems.map(p => p.id === id ? { ...p, [field]: value } : p),
        }));

    // ── Save ──────────────────────────────────────────────────────────────
    const saveInspection = async ({ photoFile = null } = {}) => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('inspector_id',       report.inspectorId || userId || '');
            formData.append('inspector_name',     report.preparedBy);
            formData.append('inspector_position', report.position);
            formData.append('inspection_date',    report.date);
            formData.append('inspection_time',    report.time);
            formData.append('materials_scope',    report.observation);
            formData.append('notes_remarks',      report.checkedBy);
            formData.append('location',           projectLocation);
            formData.append('checklist',          JSON.stringify(report.problems));
            if (photoFile) formData.append('site_inspection_photo', photoFile);

            const res = await api.post(
                `/projects/${projectId}/site-inspection`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            return res.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save inspection.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        report,
        leadEngineer,   // { name, position } — use for display
        loading,
        saving,
        error,
        projectLocation,
        updateReport,
        addProblem,
        removeProblem,
        updateProblem,
        saveInspection,
        fetchInspection,
    };
};