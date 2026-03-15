// src/hooks/useSiteInspectionReport.js

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

const today = () => new Date().toISOString().split('T')[0];

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
};

// ── Always start completely blank ────────────────────────────────────────────
const blankReport = () => ({
    date:        today(),
    preparedBy:  '',
    checkedBy:   '',
    observation: '',   // blank — user types this themselves
    problems:    [],   // empty — user adds rows themselves
});

// ─────────────────────────────────────────────────────────────────────────────
export const useSiteInspectionReport = (projectId, userId = null) => {
    const [report,  setReport]  = useState(blankReport());
    const [loading, setLoading] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState(null);

    // ── Load previously saved inspection (if one exists) ────────────────
    const fetchInspection = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}/site-inspection`);
            const d   = res.data;

            // Nothing saved yet — stay fully blank
            if (!d || !d.inspection_date) return;

            const problems = safeParse(d.checklist);

            setReport({
                date:        d.inspection_date ?? today(),
                preparedBy:  d.inspector_name  ?? '',
                // checkedBy and observation are NOT restored from old DB data —
                // notes_remarks and materials_scope were previously misused to
                // store subcontractor names. Always start blank so the user
                // fills them in fresh each time.
                checkedBy:   '',
                observation: '',
                // Only restore rows that have actual content
                problems: (problems && problems.length > 0)
                    ? problems.filter(p => (p.problem ?? '').trim() || (p.solution ?? '').trim())
                    : [],
            });
        } catch (e) {
            // 404 = no inspection saved yet — not an error, stay blank
            if (e.response?.status !== 404) {
                setError(e.response?.data?.message ?? 'Failed to load inspection.');
            }
        } finally {
            setLoading(false);
        }
    }, [projectId]);

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
            formData.append('inspector_id',    userId ?? 1);
            formData.append('inspector_name',  report.preparedBy);
            formData.append('inspection_date', report.date);
            formData.append('inspection_time', new Date().toTimeString().slice(0, 5));
            formData.append('materials_scope', report.observation);
            formData.append('notes_remarks',   report.checkedBy);
            formData.append('checklist',       JSON.stringify(report.problems));
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
        report, loading, saving, error,
        updateReport,
        addProblem, removeProblem, updateProblem,
        saveInspection, fetchInspection,
    };
};