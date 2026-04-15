// src/hooks/useMaterialsMonitoring.js

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/api/axios';

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const toDateOnly = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.split('T')[0].slice(0, 10);
    return val;
};

export const totalDelivered = (item) =>
    (item.deliveries ?? []).reduce((s, d) => s + Number(d.qty || 0), 0);

export const getTotalInstalledUpToDate = (item, upToDate) => {
    if (!item.installed) return 0;
    return Object.entries(item.installed)
        .filter(([d]) => d <= upToDate)
        .reduce((s, [, v]) => s + Number(v || 0), 0);
};

export const getRemainingInventory = (item, upToDate) => {
    const delivered = totalDelivered(item);
    const installed = getTotalInstalledUpToDate(item, upToDate);
    return delivered - installed;
};

// Get remaining inventory from previous date
const getPreviousRemaining = (item, currentDate) => {
    const dates = Object.keys(item.installed || {}).sort();
    const prevDate = dates.filter(d => d < currentDate).pop();
    if (!prevDate) return totalDelivered(item);
    return getRemainingInventory(item, prevDate);
};

const emptyItem = (id, overrides = {}) => ({
    id,
    name:          '',
    description:   '',
    product_category: '',
    unit:          'pcs',
    deliveries:    [{ date: today(), qty: 0 }],
    remarks:       '',
    installed:     {},
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
    const hasInstalled = Object.values(item.installed ?? {}).some(v => Number(v) > 0);
    return hasDelivery || hasInstalled;
};

const sanitizeItemDates = (item) => ({
    ...item,
    deliveries: (item.deliveries ?? []).map(d => ({
        ...d,
        date: toDateOnly(d.date),
    })),
});

/**
 * Merge saved items with BOQ rows.
 * Initial delivery qty is set to BOQ required quantity.
 */
const mergeBoqIntoItems = (existingItems, boqData) => {
    const boqRows = Object.values(boqData ?? {})
        .flat()
        .filter(row => row?.product_code);

    if (boqRows.length === 0) return existingItems;

    const byBoqKey = {};
    existingItems.forEach(item => { if (item.boqKey) byBoqKey[item.boqKey] = item; });

    const activeBoqKeys = new Set(boqRows.map(r => r.product_code));
    const manualItems = existingItems.filter(item => !item.boqKey);

    const boqItems = boqRows.map(row => {
        const key = row.product_code;
        const boqQty = parseFloat(row.qty) || 0;
        
        if (byBoqKey[key]) {
            const existing = byBoqKey[key];
            const hasDeliveries = existing.deliveries?.some(d => Number(d.qty) > 0);
            return {
                ...existing,
                name: row.description || key,
                description: row.description || '',
                product_category: row.product_category || existing.product_category || '',
                unit: row.unit || 'pcs',
                boqQty: boqQty,
                deliveries: hasDeliveries 
                    ? existing.deliveries 
                    : [{ date: today(), qty: boqQty }],
            };
        }
        return emptyItem(Date.now() + Math.random(), {
            boqKey: key,
            name: row.description || key,
            description: row.description || '',
            product_category: row.product_category || '',
            unit: row.unit || 'pcs',
            boqQty: boqQty,
            deliveries: [{ date: today(), qty: boqQty }],
        });
    });

    const orphanedItems = existingItems.filter(
        item => item.boqKey && !activeBoqKeys.has(item.boqKey) && hasData(item)
    );

    return [...manualItems, ...boqItems, ...orphanedItems];
};

// ─────────────────────────────────────────────────────────────────────────────
export const useMaterialsMonitoring = (projectId, initialMaterialItems = null, boqData = null) => {

    const hydrated = useRef(false);
    const isFirstLoad = useRef(true);
    const autoSaveTimer = useRef(null);
    const isDirty = useRef(false);

    const [items, setItems] = useState([]);
    const [currentDate, setCurrentDate] = useState(today());
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Fetch from server ─────────────────────────────────────────────────────
    const fetchMaterials = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}`);
            const mat = res.data?.project?.material_items;
            const parsed = safeParse(mat);
            if (parsed && parsed.length > 0) {
                const sanitized = parsed.map(sanitizeItemDates);
                setItems(mergeBoqIntoItems(sanitized, boqData));
            } else if (boqData) {
                // No saved materials, but we have BOQ data
                setItems(mergeBoqIntoItems([], boqData));
            } else {
                setItems([]);
            }
            hydrated.current = true;
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to fetch materials.');
        } finally {
            setLoading(false);
            setTimeout(() => { isFirstLoad.current = false; }, 300);
        }
    }, [projectId, boqData]);

    // ── Seed items when projectId changes ─────────────────────────────────────
    useEffect(() => {
        // Always fetch fresh data from server when project changes
        fetchMaterials();
    }, [projectId, fetchMaterials]);

    // ── Re-merge when BOQ data changes ────────────────────────────────────────
    useEffect(() => {
        if (!hydrated.current || !boqData) return;
        setItems(prev => mergeBoqIntoItems(prev, boqData));
    }, [JSON.stringify(boqData)]);

    // ── Reset dirty flag when date changes ────────────────────────────────────
    useEffect(() => {
        isDirty.current = false;
    }, [currentDate]);

    // ── Item CRUD (marks dirty) ───────────────────────────────────────────────
    const markDirty = () => { isDirty.current = true; };

    const addItem = () => {
        markDirty();
        setItems(p => [...p, emptyItem(Date.now())]);
    };

    const removeItem = (id) => {
        markDirty();
        setItems(p => p.filter(i => i.id !== id));
    };

    const updateItem = (id, field, value) => {
        markDirty();
        setItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const updateDelivery = (itemId, dIdx, field, value) => {
        markDirty();
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
    };

    // Update installed quantity for current date
    const updateInstalled = (itemId, value) => {
        markDirty();
        const numValue = Number(value) || 0;
        
        setItems(p => p.map(i => {
            if (i.id !== itemId) return i;
            
            // Get max allowed (starting inventory for this date)
            const prevRemaining = getPreviousRemaining(i, currentDate);
            const cappedValue = Math.min(numValue, prevRemaining);
            
            return { 
                ...i, 
                installed: { 
                    ...(i.installed ?? {}), 
                    [currentDate]: cappedValue
                } 
            };
        }));
    };

    // ── Auto-save (debounced) ─────────────────────────────────────────────────
    const buildPayload = useCallback(() => ({
        material_items: JSON.stringify(items),
    }), [items]);

    useEffect(() => {
        if (isFirstLoad.current) return;
        if (!projectId) return;
        if (!isDirty.current) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await api.patch(
                    `/projects/${projectId}/tracking/materials`,
                    buildPayload()
                );
                isDirty.current = false;
                setSaveStatus('saved');
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveStatus(null);
                    setSaveSuccess(false);
                }, 3000);
            } catch (e) {
                console.error('[MaterialsMonitoring] auto-save failed:', e);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 4000);
            }
        }, 1500);

        return () => clearTimeout(autoSaveTimer.current);
    }, [items, projectId, buildPayload]);

    // ── Manual save ───────────────────────────────────────────────────────────
    const saveMaterials = async () => {
        if (!projectId) return;
        setSaving(true);
        setSaveSuccess(false);
        setError(null);
        try {
            await api.patch(`/projects/${projectId}/tracking/materials`, {
                material_items: JSON.stringify(items),
            });
            isDirty.current = false;
            setSaveSuccess(true);
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveSuccess(false);
                setSaveStatus(null);
            }, 3000);
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save materials.';
            setError(msg);
            setSaveStatus('error');
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return {
        items,
        currentDate,
        loading,
        saving,
        saveStatus,
        saveSuccess,
        error,
        setCurrentDate,
        addItem,
        removeItem,
        updateItem,
        updateDelivery,
        updateInstalled,
        saveMaterials,
        fetchMaterials,
        markDirty,
        getRemainingInventory,
        getTotalInstalledUpToDate,
    };
};