// src/hooks/useMaterialsMonitoring.js
//
// Manages all API calls for the Materials Monitoring tab.
// Consumed by MaterialsMonitoring.jsx.

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

export const totalDelivered = (item) =>
    (item.deliveries ?? []).reduce((s, d) => s + Number(d.qty || 0), 0);

export const getRunningTotal = (item, upToDate) => {
    if (!item.dailyConsumed) return 0;
    return Object.entries(item.dailyConsumed)
        .filter(([d]) => d <= upToDate)
        .reduce((s, [, v]) => s + Number(v || 0), 0);
};

const emptyItem = (id) => ({
    id,
    name:          '',
    description:   '',
    unit:          'pcs',
    deliveries:    [{ date: '', qty: 0 }],
    installed:     0,
    remarks:       '',
    dailyConsumed: {},
});

const safeParse = (raw) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
};

// Default sample rows shown before DB data loads
// Remove these once you have real data in DB
const SAMPLE_ITEMS = [
    { id: 1, name: 'MAPLE HARDWOOD',        description: '1.81m x 73mm X 22mm',    unit: 'pcs',  deliveries: [{ date: '', qty: 5  }], installed: 2, remarks: '', dailyConsumed: {} },
    { id: 2, name: 'PLYWOOD',               description: '1.22m x 2.44m X 11.5mm', unit: 'pcs',  deliveries: [{ date: '', qty: 0  }], installed: 0, remarks: '', dailyConsumed: {} },
    { id: 3, name: 'WOOD JOIST',            description: '3m x 45mm X 45mm',        unit: 'pcs',  deliveries: [{ date: '', qty: 0  }], installed: 0, remarks: '', dailyConsumed: {} },
    { id: 4, name: 'RUBBER PAD',            description: '75mm X 60mm X 20mm',      unit: 'pcs',  deliveries: [{ date: '', qty: 0  }], installed: 0, remarks: '', dailyConsumed: {} },
    { id: 5, name: 'POLYETHYLENE PLASTIC',  description: '900sqm/Roll',              unit: 'roll', deliveries: [{ date: '', qty: 0  }], installed: 0, remarks: '', dailyConsumed: {} },
    { id: 6, name: 'ALUMINUM THRESHOLD',    description: '4" X 6.4m',               unit: 'pcs',  deliveries: [{ date: '', qty: 0  }], installed: 0, remarks: '', dailyConsumed: {} },
];

// ─────────────────────────────────────────────────────────────────────────────
export const useMaterialsMonitoring = (projectId, initialMaterialItems = null) => {
    const [items,       setItems]       = useState([]);
    const [currentDate, setCurrentDate] = useState(today());
    const [saving,      setSaving]      = useState(false);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);

    // ── Hydrate from tracking data passed from parent ────────────────────
    useEffect(() => {
        const parsed = safeParse(initialMaterialItems);
        if (parsed && parsed.length > 0) {
            setItems(parsed);
        } else {
            // No saved data yet — use sample rows
            setItems(SAMPLE_ITEMS);
        }
    }, [initialMaterialItems]);

    // ── Item CRUD ────────────────────────────────────────────────────────
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
                    idx === dIdx ? { ...d, [field]: value } : d
                ),
            };
        }));

    const addDelivery = (itemId) =>
        setItems(p => p.map(i =>
            i.id === itemId
                ? { ...i, deliveries: [...(i.deliveries ?? []), { date: '', qty: 0 }] }
                : i
        ));

    const updateConsumed = (itemId, date, value) =>
        setItems(p => p.map(i =>
            i.id === itemId
                ? { ...i, dailyConsumed: { ...(i.dailyConsumed ?? {}), [date]: Number(value) } }
                : i
        ));

    // ── Save ─────────────────────────────────────────────────────────────
    // PATCH /api/projects/{id}/tracking/materials
    const saveMaterials = async () => {
        if (!projectId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await api.patch(`/projects/${projectId}/tracking/materials`, {
                material_items: JSON.stringify(items),
            });
            return res.data;
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to save materials.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Fetch fresh (optional manual refresh) ───────────────────────────
    const fetchMaterials = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res    = await api.get(`/projects/${projectId}`);
            const mat    = res.data?.project?.material_items;
            const parsed = safeParse(mat);
            if (parsed && parsed.length > 0) setItems(parsed);
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to fetch materials.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    return {
        // State
        items,
        currentDate,
        loading,
        saving,
        error,
        // Setters
        setCurrentDate,
        // Item helpers
        addItem,
        removeItem,
        updateItem,
        updateDelivery,
        addDelivery,
        updateConsumed,
        // Computed helpers (exported so component doesn't duplicate)
        totalDelivered,
        getRunningTotal,
        // Actions
        saveMaterials,
        fetchMaterials,
    };
};