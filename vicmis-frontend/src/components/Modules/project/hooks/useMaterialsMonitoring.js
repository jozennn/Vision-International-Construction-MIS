// src/hooks/useMaterialsMonitoring.js

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

/** Strip time portion from any ISO date string → 'yyyy-MM-dd' */
const toDateOnly = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.split('T')[0].slice(0, 10);
    return val;
};

export const totalDelivered = (item) =>
    (item.deliveries ?? []).reduce((s, d) => s + Number(d.qty || 0), 0);

export const getRunningTotal = (item, upToDate) => {
    if (!item.dailyConsumed) return 0;
    return Object.entries(item.dailyConsumed)
        .filter(([d]) => d <= upToDate)
        .reduce((s, [, v]) => s + Number(v || 0), 0);
};

export const getRemainingInventory = (item, upToDate) =>
    totalDelivered(item) - getRunningTotal(item, upToDate);

const emptyItem = (id, overrides = {}) => ({
    id,
    name:          '',
    description:   '',
    unit:          'pcs',
    deliveries:    [{ date: today(), qty: 0 }],
    remarks:       '',
    dailyConsumed: {},
    ...overrides,
});

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
};

const hasData = (item) => {
    const hasDelivery = (item.deliveries ?? []).some(d => Number(d.qty) > 0);
    const hasConsumed = Object.values(item.dailyConsumed ?? {}).some(v => Number(v) > 0);
    return hasDelivery || hasConsumed;
};

/**
 * Sanitize all date strings in a saved item to plain 'yyyy-MM-dd'.
 * Fixes the React controlled-input warning when server returns ISO timestamps.
 */
const sanitizeItemDates = (item) => ({
    ...item,
    deliveries: (item.deliveries ?? []).map(d => ({
        ...d,
        date: toDateOnly(d.date),
    })),
});

/**
 * Merge saved items with BOQ rows.
 * BOQ rows that already exist (matched by boqKey/product_code) are preserved
 * with their existing delivery/consumed data.
 * BOQ rows not yet in items are added as empty entries with BOQ metadata.
 * Manual items (no boqKey) are always kept.
 * Orphaned BOQ items (removed from BOQ but have recorded data) are kept too.
 */
const mergeBoqIntoItems = (existingItems, boqData) => {
    const boqRows = Object.values(boqData ?? {})
        .flat()
        .filter(row => row?.product_code);

    if (boqRows.length === 0) return existingItems;

    const byBoqKey      = {};
    existingItems.forEach(item => { if (item.boqKey) byBoqKey[item.boqKey] = item; });

    const activeBoqKeys = new Set(boqRows.map(r => r.product_code));
    const manualItems   = existingItems.filter(item => !item.boqKey);

    const boqItems = boqRows.map(row => {
        const key = row.product_code;
        if (byBoqKey[key]) {
            // Preserve existing data, just refresh unit in case BOQ changed
            return { ...byBoqKey[key], unit: byBoqKey[key].unit || row.unit || 'pcs' };
        }
        // New BOQ item not yet in saved materials
        return emptyItem(Date.now() + Math.random(), {
            boqKey:      key,
            name:        row.description || key,
            description: row.description || '',
            unit:        row.unit || 'pcs',
        });
    });

    // Keep orphaned BOQ items that have real data even if removed from BOQ
    const orphanedItems = existingItems.filter(
        item => item.boqKey && !activeBoqKeys.has(item.boqKey) && hasData(item)
    );

    return [...manualItems, ...boqItems, ...orphanedItems];
};

// ─────────────────────────────────────────────────────────────────────────────
export const useMaterialsMonitoring = (projectId, initialMaterialItems = null, boqData = null) => {

    const hydrated = useRef(false);

    const [items,       setItems]       = useState([]);
    const [currentDate, setCurrentDate] = useState(today());
    const [saving,      setSaving]      = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);

    // ── Seed items whenever projectId changes ─────────────────────────────
    // FIX: hydrated.current is reset to false here so switching between
    // projects always re-seeds from the new project's data instead of
    // keeping stale items from the previous project.
    useEffect(() => {
        hydrated.current = false;

        const parsed    = safeParse(initialMaterialItems);
        const sanitized = parsed ? parsed.map(sanitizeItemDates) : null;

        if (boqData) {
            // Merge saved items with approved BOQ rows
            const base = (sanitized && sanitized.length > 0) ? sanitized : [];
            setItems(mergeBoqIntoItems(base, boqData));
        } else if (sanitized && sanitized.length > 0) {
            setItems(sanitized);
        } else {
            // No saved data and no BOQ — clear stale items from previous project
            setItems([]);
        }

        hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // ── Re-merge when BOQ data changes (e.g. BOQ gets approved mid-session) ─
    useEffect(() => {
        if (!hydrated.current || !boqData) return;
        setItems(prev => mergeBoqIntoItems(prev, boqData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(boqData)]);

    // ── Item CRUD ─────────────────────────────────────────────────────────
    const addItem    = () => setItems(p => [...p, emptyItem(Date.now())]);
    const removeItem = (id) => setItems(p => p.filter(i => i.id !== id));

    const updateItem = (id, field, value) =>
        setItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));

    const updateDelivery = (itemId, dIdx, field, value) =>
        setItems(p => p.map(i => {
            if (i.id !== itemId) return i;
            return {
                ...i,
                deliveries: i.deliveries.map((d, idx) =>
                    idx === dIdx
                        ? { ...d, [field]: field === 'date' ? toDateOnly(value) : value }
                        : d
                ),
            };
        }));

    const addDelivery = (itemId) =>
        setItems(p => p.map(i =>
            i.id === itemId
                ? { ...i, deliveries: [...(i.deliveries ?? []), { date: today(), qty: 0 }] }
                : i
        ));

    const updateConsumed = (itemId, date, value) =>
        setItems(p => p.map(i =>
            i.id === itemId
                ? { ...i, dailyConsumed: { ...(i.dailyConsumed ?? {}), [date]: Number(value) || 0 } }
                : i
        ));

    // ── Save ──────────────────────────────────────────────────────────────
    const saveMaterials = async () => {
        if (!projectId) return;
        setSaving(true);
        setSaveSuccess(false);
        setError(null);
        try {
            await api.patch(`/projects/${projectId}/tracking/materials`, {
                material_items: JSON.stringify(items),
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save materials.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Fetch fresh from server ───────────────────────────────────────────
    const fetchMaterials = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res    = await api.get(`/projects/${projectId}`);
            const mat    = res.data?.project?.material_items;
            const parsed = safeParse(mat);
            if (parsed && parsed.length > 0) {
                const sanitized = parsed.map(sanitizeItemDates);
                setItems(mergeBoqIntoItems(sanitized, boqData));
            }
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to fetch materials.');
        } finally {
            setLoading(false);
        }
    }, [projectId, boqData]);

    return {
        items,
        currentDate,
        loading,
        saving,
        saveSuccess,
        error,
        setCurrentDate,
        addItem,
        removeItem,
        updateItem,
        updateDelivery,
        addDelivery,
        updateConsumed,
        saveMaterials,
        fetchMaterials,
    };
};