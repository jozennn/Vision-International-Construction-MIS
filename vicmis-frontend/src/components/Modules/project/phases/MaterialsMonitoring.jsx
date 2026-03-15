// src/phases/MaterialsMonitoring.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useMaterialsMonitoring, totalDelivered, getRunningTotal } from '../hooks/useMaterialsMonitoring.js';
import '../css/MonitoringComponents.css';

const MaterialsMonitoring = ({ project, trackingData }) => {
    const {
        items, currentDate, saving, error,
        setCurrentDate,
        addItem, removeItem, updateItem,
        updateDelivery, updateConsumed,
        saveMaterials,
    } = useMaterialsMonitoring(project?.id, trackingData?.material_items);

    const projectName = project?.project_name ?? '';
    const location    = project?.location     ?? '';
    const requirement = project?.project_type ?? '';
    // Sales Agent = created_by_name (the sales staff who created the project)
    const salesAgent = project?.created_by_name ?? '—';

    // Lead Engineer = first in assigned_engineers array from formatProject
    // Each item is either a name string or { id, name } object
    const resolveLeadEngineer = () => {
        const engineers = project?.assigned_engineers;
        if (Array.isArray(engineers) && engineers.length > 0) {
            const first = engineers[0];
            if (typeof first === 'string') return first;
            if (first?.name)              return first.name;
        }
        // Fallback: assignments.user relation
        const assignments = project?.assignments ?? [];
        const eng = assignments.find(a =>
            ['lead_engineer', 'support_engineer', 'engineer']
                .includes((a.role ?? '').toLowerCase())
        );
        return eng?.user?.name ?? '—';
    };
    const leadEngineer = resolveLeadEngineer();

    const currentDateLabel = new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    // ── Excel Export ─────────────────────────────────────────────────────
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Materials Monitoring');
        const NAVY = 'FF1A3A5C', LGRAY = 'FFD9D9D9';
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allB = { top: thin, bottom: thin, left: thin, right: thin };
        const fill = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
        const ctr  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft  = { horizontal: 'left',   vertical: 'middle', wrapText: true };
        const bold = { bold: true,  name: 'Arial', size: 10 };
        const norm = { bold: false, name: 'Arial', size: 10 };

        const allDates = new Set();
        items.forEach(it => Object.keys(it.dailyConsumed ?? {}).forEach(d => allDates.add(d)));
        const sortedDates = Array.from(allDates).sort();

        ws.columns = [
            { width: 20 }, { width: 18 }, { width: 10 }, { width: 10 }, { width: 10 },
            { width: 12 }, { width: 12 }, { width: 16 },
            ...sortedDates.flatMap(() => [{ width: 10 }, { width: 10 }]),
        ];

        let r = 1;
        [['Project Name', projectName], ['Location', location], ['Requirements', requirement],
         ['Engineer', leadEngineer], ['Sales Agent', salesAgent]].forEach(([l, v]) => {
            ws.getCell(r, 1).value = l; ws.getCell(r, 1).font = bold;
            ws.getCell(r, 2).value = v; ws.getCell(r, 2).font = norm;
            ws.getRow(r).height = 16; r++;
        });
        r++;

        ws.mergeCells(r, 1, r, 8 + sortedDates.length * 2);
        ws.getCell(r, 1).value = 'MATERIALS MONITORING';
        ws.getCell(r, 1).font = { bold: true, size: 13, name: 'Arial' };
        ws.getCell(r, 1).fill = fill(LGRAY); ws.getCell(r, 1).alignment = ctr; ws.getCell(r, 1).border = allB;
        ws.getRow(r).height = 24; r++;

        ws.mergeCells(r, 1, r, 2); ws.getCell(r, 1).value = 'ITEM';
        ws.mergeCells(r, 3, r, 5); ws.getCell(r, 3).value = 'DELIVERY/PULL OUT';
        ['INSTALLED', 'INVENTORY', 'REMARKS'].forEach((h, ci) => { ws.getCell(r, 6 + ci).value = h; });
        sortedDates.forEach((d, di) => {
            ws.mergeCells(r, 9 + di * 2, r, 10 + di * 2);
            ws.getCell(r, 9 + di * 2).value = d;
        });
        for (let ci = 1; ci <= 8 + sortedDates.length * 2; ci++) {
            const c = ws.getCell(r, ci);
            c.font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FFFFFFFF' } };
            c.fill = fill(NAVY); c.alignment = ctr; c.border = allB;
        }
        ws.getRow(r).height = 20; r++;

        ['NAME', 'DESCRIPTION', 'DATE', 'QTY', 'TOTAL', 'INSTALLED', 'INVENTORY', 'REMARKS',
         ...sortedDates.flatMap(() => ['CONSUMED', 'TOTAL'])].forEach((h, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value = h; c.font = { bold: true, size: 8, name: 'Arial', color: { argb: 'FFFFFFFF' } };
            c.fill = fill(NAVY); c.alignment = ctr; c.border = allB;
        });
        ws.getRow(r).height = 18; r++;

        items.forEach(item => {
            const delivered = totalDelivered(item);
            const inventory = delivered - (item.installed ?? 0);
            const lastDel   = item.deliveries?.[item.deliveries.length - 1] ?? {};
            [item.name, item.description, lastDel.date ?? '', lastDel.qty ?? 0,
             delivered, item.installed ?? 0, inventory, item.remarks ?? '',
             ...sortedDates.flatMap(d => [item.dailyConsumed?.[d] ?? 0, getRunningTotal(item, d)])
            ].forEach((v, ci) => {
                const c = ws.getCell(r, ci + 1);
                c.value = v; c.font = norm; c.border = allB; c.alignment = ci < 2 ? lft : ctr;
            });
            ws.getRow(r).height = 18; r++;
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_Materials_${currentDate}.xlsx`);
    };

    return (
        <div className="mon-section">
            {/* ── Page Header ── */}
            <div className="mon-page-header">
                <div className="mon-header-meta">
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Lead Engineer', leadEngineer],
                      ['Sales Agent', salesAgent || '—']].map(([l, v]) => (
                        <div key={l} className="mon-header-field">
                            <span className="mon-header-label">{l}</span>
                            <span className="mon-header-value">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mon-header-actions">
                    <button className="mon-btn mon-btn-outline" onClick={exportExcel}>⬇️ Excel</button>
                    <button className="mon-btn mon-btn-navy" onClick={saveMaterials} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save Tracking'}
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="mon-body">
                {error && <div className="mon-error">⚠️ {error}</div>}

                {/* Toolbar */}
                <div className="mon-mat-toolbar">
                    <div className="mon-date-row">
                        <span className="mon-field-label">Logging for Date</span>
                        <input
                            type="date"
                            value={currentDate}
                            onChange={e => setCurrentDate(e.target.value)}
                            className="mon-date-input"
                        />
                    </div>
                </div>

                {/* Materials Table */}
                <div className="mon-table-card">
                    <div className="mon-table-toolbar">
                        <span className="mon-table-title">📦 Materials Monitoring</span>
                        <button className="mon-add-btn" onClick={addItem}>+ Add Item</button>
                    </div>
                    <div className="mon-table-scroll">
                        <table className="mon-table">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="th-left" style={{ minWidth: 140 }}>NAME</th>
                                    <th rowSpan={2} style={{ minWidth: 140 }}>DESCRIPTION</th>
                                    <th colSpan={3}>DELIVERY / PULL OUT</th>
                                    <th rowSpan={2}>INSTALLED</th>
                                    <th rowSpan={2}>INVENTORY</th>
                                    <th rowSpan={2} style={{ minWidth: 120 }}>REMARKS</th>
                                    <th colSpan={2} className="th-date-group">
                                        {currentDateLabel}
                                    </th>
                                    <th rowSpan={2} style={{ width: 44 }}></th>
                                </tr>
                                <tr className="thead-sub">
                                    <th>DATE</th>
                                    <th>QTY</th>
                                    <th>TOTAL</th>
                                    <th className="th-date-group">CONSUMED</th>
                                    <th className="th-date-group">RUNNING TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const delivered = totalDelivered(item);
                                    const inventory = delivered - (item.installed ?? 0);
                                    const lastDel   = item.deliveries?.[item.deliveries.length - 1] ?? {};
                                    return (
                                        <tr key={item.id}>
                                            <td className="td-left">
                                                <input type="text" value={item.name}
                                                    onChange={e => updateItem(item.id, 'name', e.target.value)}
                                                    className="mon-cell-input input-wide"
                                                    placeholder="Item name" />
                                            </td>
                                            <td>
                                                <input type="text" value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    className="mon-cell-input input-wide"
                                                    placeholder="e.g. 1.81m x 73mm" />
                                            </td>
                                            <td>
                                                <input type="date" value={lastDel.date ?? ''}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'date', e.target.value)}
                                                    className="mon-cell-input input-date" />
                                            </td>
                                            <td>
                                                <input type="number" value={lastDel.qty ?? 0}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'qty', e.target.value)}
                                                    className="mon-cell-input input-num"
                                                    min="0" />
                                            </td>
                                            <td className="td-bold">{delivered}</td>
                                            <td>
                                                <input type="number" value={item.installed ?? 0}
                                                    onChange={e => updateItem(item.id, 'installed', e.target.value)}
                                                    className="mon-cell-input input-num input-blue"
                                                    min="0" />
                                            </td>
                                            <td className={`td-bold ${inventory <= 0 ? 'td-red' : 'td-green'}`}>
                                                {inventory}
                                            </td>
                                            <td>
                                                <input type="text" value={item.remarks ?? ''}
                                                    onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                    className="mon-cell-input input-wide"
                                                    placeholder="Notes" />
                                            </td>
                                            <td className="td-consumed">
                                                <input type="number"
                                                    value={item.dailyConsumed?.[currentDate] ?? ''}
                                                    onChange={e => updateConsumed(item.id, currentDate, e.target.value)}
                                                    className="mon-cell-input input-num input-red"
                                                    placeholder="0" min="0" />
                                            </td>
                                            <td className="td-bold">
                                                {getRunningTotal(item, currentDate)}
                                            </td>
                                            <td>
                                                <button className="mon-remove-btn"
                                                    onClick={() => removeItem(item.id)}>✕</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialsMonitoring;