// src/phases/MaterialsMonitoring.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    useMaterialsMonitoring,
    totalDelivered,
    getRemainingInventory,
    getTotalInstalledUpToDate,
} from '../hooks/useMaterialsMonitoring.js';
import '../css/MonitoringComponents.css';

// Save Indicator Component
const SaveIndicator = ({ status }) => {
    if (!status) return null;
    const styles = {
        saving: { color: '#6b7280', fontSize: '0.75rem' },
        saved:  { color: '#16a34a', fontSize: '0.75rem' },
        error:  { color: '#dc2626', fontSize: '0.75rem' },
    };
    const labels = { saving: '● Saving…', saved: '✓ Auto-saved', error: '✗ Auto-save failed' };
    return <span style={styles[status]}>{labels[status]}</span>;
};

const MaterialsMonitoring = ({ project, trackingData, boqData }) => {
    const {
        items,
        currentDate,
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
    } = useMaterialsMonitoring(
        project?.id,
        trackingData?.material_items,
        boqData,
    );

    const projectName  = project?.project_name ?? '';
    const location     = project?.location     ?? '';
    const requirement  = project?.project_type ?? '';
    const salesAgent   = project?.created_by_name ?? '—';

    const resolveLeadEngineer = () => {
        const engineers = project?.assigned_engineers;
        if (Array.isArray(engineers) && engineers.length > 0) {
            const first = engineers[0];
            if (typeof first === 'string') return first;
            if (first?.name) return first.name;
        }
        const eng = (project?.assignments ?? []).find(a =>
            ['lead_engineer','support_engineer','engineer'].includes((a.role ?? '').toLowerCase())
        );
        return eng?.user?.name ?? '—';
    };
    const leadEngineer = resolveLeadEngineer();

    const currentDateLabel = new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    // Get starting inventory for current date (remaining from previous date)
    const getStartingInventory = (item) => {
        const dates = Object.keys(item.installed || {}).sort();
        const prevDate = dates.filter(d => d < currentDate).pop();
        if (!prevDate) return totalDelivered(item);
        return getRemainingInventory(item, prevDate);
    };

    // ── Deduplicate items by name + description key ───────────────────────────
    const deduplicateItems = (rawItems) => {
        const seen = new Map();
        rawItems.forEach(item => {
            const key = `${(item.name ?? '').trim().toLowerCase()}||${(item.description ?? '').trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.set(key, item);
            } else {
                // Keep the one with more delivery data
                const existing = seen.get(key);
                if (totalDelivered(item) > totalDelivered(existing)) {
                    seen.set(key, item);
                }
            }
        });
        return Array.from(seen.values());
    };

    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Materials Monitoring');

        // ── Palette ───────────────────────────────────────────────────────────
        const NAVY    = 'FF1A1A2E';
        const NAVY2   = 'FF1A3A5C';
        const CREAM   = 'FFF5EDE8';
        const LGRAY   = 'FFF2F2F2';
        const MGRAY   = 'FFE0E0E0';
        const DGRAY   = 'FF4A4A4A';
        const WHITE   = 'FFFFFFFF';
        const GREEN   = 'FF16A34A';
        const ORANGE  = 'FFEA580C';
        const RED_BG  = 'FFFEE2E2';
        const RED_FG  = 'FFDC2626';

        const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
        const thin = (argb = 'FFB0B0B0') => ({ style: 'thin',   color: { argb } });
        const med  = (argb = 'FF1A1A2E') => ({ style: 'medium', color: { argb } });
        const brd  = (c = 'FFB0B0B0') => ({ top: thin(c), bottom: thin(c), left: thin(c), right: thin(c) });
        const brdH = () => ({ top: med(), bottom: med(), left: med(), right: med() });

        const ctr = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft = { horizontal: 'left',   vertical: 'middle', wrapText: true };

        const font = (opts = {}) => ({
            name:   'Arial',
            size:   opts.size   ?? 10,
            bold:   opts.bold   ?? false,
            italic: opts.italic ?? false,
            color:  { argb: opts.color ?? 'FF000000' },
        });

        const sc = (cell, opts = {}) => {
            if (opts.font)      cell.font      = opts.font;
            if (opts.fill)      cell.fill      = opts.fill;
            if (opts.alignment) cell.alignment = opts.alignment;
            if (opts.border)    cell.border    = opts.border;
        };

        // ── Column widths ─────────────────────────────────────────────────────
        ws.columns = [
            { width: 24 },  // A – Name
            { width: 20 },  // B – Description
            { width: 14 },  // C – Del. Date
            { width: 12 },  // D – Del. Qty
            { width: 14 },  // E – Total Delivered
            { width: 12 },  // F – Installed
            { width: 16 },  // G – Remaining Inventory
            { width: 20 },  // H – Remarks
        ];

        let r = 1;

        // ── 1. COMPANY HEADER ─────────────────────────────────────────────────
        ws.mergeCells(`A${r}:H${r}`);
        const hdr = ws.getCell(`A${r}`);
        hdr.value = 'VISION INTERNATIONAL CONSTRUCTION OPC\n"You Envision, We Build"';
        sc(hdr, {
            font:      font({ size: 13, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: ctr,
            border:    brdH(),
        });
        ws.getRow(r).height = 44;
        r++;

        // ── 2. SUBTITLE ───────────────────────────────────────────────────────
        ws.mergeCells(`A${r}:H${r}`);
        const sub = ws.getCell(`A${r}`);
        sub.value = 'MATERIALS MONITORING REPORT';
        sc(sub, {
            font:      font({ size: 11, bold: true }),
            fill:      fill(CREAM),
            alignment: ctr,
            border:    brd(),
        });
        ws.getRow(r).height = 22;
        r++;

        // ── 3. PROJECT INFO ───────────────────────────────────────────────────
        const infoRows = [
            ['Project Name',  projectName],
            ['Location',      location],
            ['Requirements',  requirement],
            ['Engineer',      leadEngineer],
            ['Sales Agent',   salesAgent],
            ['Date',          new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric' })],
        ];

        infoRows.forEach(([label, value]) => {
            ws.mergeCells(`A${r}:B${r}`);
            ws.mergeCells(`C${r}:H${r}`);

            const lc = ws.getCell(`A${r}`);
            lc.value = label;
            sc(lc, { font: font({ bold: true }), fill: fill(LGRAY), alignment: lft, border: brd() });

            const vc = ws.getCell(`C${r}`);
            vc.value = value;
            sc(vc, { font: font(), fill: fill(WHITE), alignment: lft, border: brd() });

            ws.getRow(r).height = 18;
            r++;
        });

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 4. TABLE HEADER ───────────────────────────────────────────────────
        ws.mergeCells(`A${r}:H${r}`);
        const tblTitle = ws.getCell(`A${r}`);
        tblTitle.value = '📦  MATERIALS LIST';
        sc(tblTitle, {
            font:      font({ size: 10, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: lft,
            border:    brdH(),
        });
        ws.getRow(r).height = 20;
        r++;

        const colHeaders = [
            'NAME', 'DESCRIPTION', 'DELIVERY DATE', 'DEL. QTY',
            'TOTAL DELIVERED', 'INSTALLED', 'REMAINING INVENTORY', 'REMARKS',
        ];
        colHeaders.forEach((h, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value = h;
            sc(c, {
                font:      font({ bold: true, size: 9, color: WHITE }),
                fill:      fill('FF2D2D44'),
                alignment: ci < 2 ? lft : ctr,
                border:    brd('FF000000'),
            });
        });
        ws.getRow(r).height = 20;
        r++;

        // ── 5. DATA ROWS (deduplicated) ───────────────────────────────────────
        const uniqueItems = deduplicateItems(items);

        uniqueItems.forEach((item, idx) => {
            const delivered  = totalDelivered(item);
            const lastDel    = item.deliveries?.[item.deliveries.length - 1] ?? {};
            const installed  = item.installed?.[currentDate] ?? 0;
            const remaining  = getRemainingInventory(item, currentDate);
            const rowBg      = idx % 2 === 0 ? WHITE : 'FFFAFAFA';

            // Remaining inventory colour coding
            const remColor   = remaining <= 0 ? RED_FG : remaining < 10 ? ORANGE : GREEN;
            const remBg      = remaining <= 0 ? RED_BG : rowBg;

            const rowData = [
                { val: item.name        ?? '', al: lft },
                { val: item.description ?? '', al: lft },
                { val: lastDel.date     ?? '', al: ctr },
                { val: lastDel.qty      ?? 0,  al: ctr },
                { val: delivered,               al: ctr },
                { val: installed,               al: ctr },
                { val: remaining,               al: ctr, bold: true, color: remColor, bg: remBg },
                { val: item.remarks     ?? '', al: lft },
            ];

            rowData.forEach((d, ci) => {
                const c = ws.getCell(r, ci + 1);
                c.value = d.val;
                sc(c, {
                    font:      font({ bold: d.bold ?? false, color: d.color ?? 'FF000000' }),
                    fill:      fill(d.bg ?? rowBg),
                    alignment: d.al,
                    border:    brd(),
                });
            });
            ws.getRow(r).height = 18;
            r++;
        });

        // ── 6. SUMMARY ROW ────────────────────────────────────────────────────
        const totalDel  = uniqueItems.reduce((s, i) => s + totalDelivered(i), 0);
        const totalInst = uniqueItems.reduce((s, i) => s + getTotalInstalledUpToDate(i, currentDate), 0);
        const totalRem  = totalDel - totalInst;

        ws.mergeCells(`A${r}:D${r}`);
        const sumLabel = ws.getCell(`A${r}`);
        sumLabel.value = `Total Items: ${uniqueItems.length}`;
        sc(sumLabel, { font: font({ bold: true, italic: true, color: DGRAY }), fill: fill(LGRAY), alignment: lft, border: brd() });

        const sumCells = [
            { col: 5, val: totalDel  },
            { col: 6, val: totalInst },
            { col: 7, val: totalRem,  bold: true, color: totalRem <= 0 ? RED_FG : GREEN },
        ];
        sumCells.forEach(({ col, val, bold: b, color: c }) => {
            const cell = ws.getCell(r, col);
            cell.value = val;
            sc(cell, {
                font:      font({ bold: b ?? true, color: c ?? 'FF000000' }),
                fill:      fill(MGRAY),
                alignment: ctr,
                border:    brd(),
            });
        });
        // Fill remarks col
        sc(ws.getCell(r, 8), { fill: fill(LGRAY), border: brd() });
        ws.getRow(r).height = 18;
        r++;

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 7. FOOTER ─────────────────────────────────────────────────────────
        ws.mergeCells(`A${r}:H${r}`);
        const footer = ws.getCell(`A${r}`);
        footer.value = `Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · Vision International Construction OPC`;
        sc(footer, {
            font:      font({ size: 8, italic: true, color: DGRAY }),
            fill:      fill(LGRAY),
            alignment: ctr,
            border:    brd(),
        });
        ws.getRow(r).height = 14;

        // ── Print settings ────────────────────────────────────────────────────
        ws.pageSetup = {
            paperSize:   9,
            orientation: 'portrait',
            fitToPage:   true,
            fitToWidth:  1,
            fitToHeight: 0,
            margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        };

        // ── Save ──────────────────────────────────────────────────────────────
        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_Materials_${currentDate}.xlsx`
        );
    };

    // ── Deduplicate for the UI table too ──────────────────────────────────────
    const displayItems = (() => {
        const seen = new Map();
        items.forEach(item => {
            const key = `${(item.name ?? '').trim().toLowerCase()}||${(item.description ?? '').trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.set(key, item);
            } else {
                const existing = seen.get(key);
                if (totalDelivered(item) > totalDelivered(existing)) seen.set(key, item);
            }
        });
        return Array.from(seen.values());
    })();

    return (
        <div className="mon-section">
            {/* Header */}
            <div className="mon-page-header">
                <div className="mon-header-meta">
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Engineer', leadEngineer],
                      ['Sales Agent', salesAgent]].map(([l, v]) => (
                        <div key={l} className="mon-header-field">
                            <span className="mon-header-label">{l}</span>
                            <span className="mon-header-value">{v || '—'}</span>
                        </div>
                    ))}
                </div>
                <div className="mon-header-actions">
                    <SaveIndicator status={saveStatus} />
                    <button className="mon-btn mon-btn-outline" onClick={exportExcel}>⬇️ Excel</button>
                    <button className="mon-btn mon-btn-navy" onClick={saveMaterials} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="mon-body">
                {error       && <div className="mon-error">⚠️ {error}</div>}
                {saveSuccess && <div className="mon-success">✅ Materials saved!</div>}

                {boqData && Object.values(boqData).flat().some(r => r?.product_code) && (
                    <div className="mon-boq-notice">
                        <span className="mon-boq-notice-icon">🔗</span>
                        Items synced from the approved BOQ are marked with a
                        <span className="mon-boq-badge">BOQ</span> badge.
                    </div>
                )}

                {/* Date selector */}
                <div className="mon-mat-toolbar">
                    <div className="mon-date-row">
                        <span className="mon-field-label">📅 Date</span>
                        <input type="date" value={currentDate}
                            onChange={e => setCurrentDate(e.target.value)}
                            className="mon-date-input" />
                    </div>
                    <div className="mon-date-hint">
                        Showing data for {currentDateLabel}. Switch date to view another day.
                    </div>
                </div>

                {/* Table */}
                <div className="mon-table-card">
                    <div className="mon-table-toolbar">
                        <span className="mon-table-title">📦 Materials Monitoring</span>
                        <button className="mon-add-btn" onClick={addItem}>+ Add Item</button>
                    </div>
                    <div className="mon-table-scroll">
                        <table className="mon-table">
                            <thead>
                                <tr>
                                    <th className="th-left" style={{ minWidth: 140 }}>NAME</th>
                                    <th style={{ minWidth: 120 }}>DESCRIPTION</th>
                                    <th>DELIVERY DATE</th>
                                    <th>QTY</th>
                                    <th>TOTAL</th>
                                    <th style={{ minWidth: 90 }}>INSTALLED</th>
                                    <th style={{ minWidth: 110 }}>REMAINING<br/>INVENTORY</th>
                                    <th style={{ minWidth: 100 }}>REMARKS</th>
                                    <th style={{ width: 36 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.length === 0 && (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#bbb', fontStyle: 'italic', fontSize: 12 }}>
                                            No items yet. Items from the approved BOQ appear here automatically.
                                        </td>
                                    </tr>
                                )}
                                {displayItems.map(item => {
                                    const delivered          = totalDelivered(item);
                                    const lastDel            = item.deliveries?.[item.deliveries.length - 1] ?? {};
                                    const fromBoq            = Boolean(item.boqKey);
                                    const installedToday     = item.installed?.[currentDate] ?? 0;
                                    const remainingInventory = getRemainingInventory(item, currentDate);
                                    const startingInventory  = getStartingInventory(item);
                                    const totalInstalled     = getTotalInstalledUpToDate(item, currentDate);

                                    return (
                                        <tr key={item.id} className={fromBoq ? 'mon-row-boq' : ''}>
                                            <td className="td-left">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {fromBoq && <span className="mon-boq-badge" title={item.boqKey}>BOQ</span>}
                                                    <input type="text" value={item.name}
                                                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                                                        className="mon-cell-input input-wide" placeholder="Item name" />
                                                </div>
                                            </td>
                                            <td>
                                                <input type="text" value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    className="mon-cell-input input-wide" placeholder="Description" />
                                            </td>
                                            <td>
                                                <input type="date" value={lastDel.date ?? ''}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'date', e.target.value)}
                                                    className="mon-cell-input input-date" />
                                            </td>
                                            <td>
                                                <input type="number" value={lastDel.qty ?? 0}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'qty', e.target.value)}
                                                    className="mon-cell-input input-num" min="0" />
                                            </td>
                                            <td className="td-bold">{delivered}</td>
                                            <td>
                                                <div style={{ position: 'relative' }}>
                                                    <input type="number"
                                                        value={installedToday}
                                                        onChange={e => updateInstalled(item.id, e.target.value)}
                                                        className="mon-cell-input input-num"
                                                        style={{
                                                            background:   installedToday > 0 ? '#f0f9ff' : '#fff',
                                                            borderColor:  installedToday > 0 ? '#3b82f6' : '#e5e7eb',
                                                        }}
                                                        placeholder="0"
                                                        min="0"
                                                        max={startingInventory} />
                                                    {installedToday > 0 && (
                                                        <span style={{
                                                            position: 'absolute', top: '-8px', right: '2px',
                                                            fontSize: '9px', fontWeight: 700, color: '#3b82f6',
                                                            background: '#eff6ff', borderRadius: '4px', padding: '1px 4px',
                                                        }}>
                                                            -{installedToday}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`td-bold ${remainingInventory <= 0 ? 'td-red' : remainingInventory < 10 ? 'td-orange' : 'td-green'}`}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                    {remainingInventory}
                                                    {totalInstalled > 0 && (
                                                        <span style={{ fontSize: '9px', color: '#6b7280', fontWeight: 400 }}>
                                                            ({totalInstalled} used)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <input type="text" value={item.remarks ?? ''}
                                                    onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                    className="mon-cell-input input-wide" placeholder="Notes" />
                                            </td>
                                            <td>
                                                <button className="mon-remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mon-table-footer-hint">
                        <span>💡 Remaining = Total Delivered ({displayItems.reduce((s, i) => s + totalDelivered(i), 0)}) - Total Installed ({displayItems.reduce((s, i) => s + getTotalInstalledUpToDate(i, currentDate), 0)})</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialsMonitoring;