// src/phases/TimelineGantt.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useTimelineGantt, fmtDate, parseDate } from '../hooks/useTimelineGantt.js';
import '../css/TimelineGantt.css';

// ── Excel colour palette ──────────────────────────────────────────────────────
const XL = {
    NAVY:       'FF1A1A2E',
    RED:        'FFCC2200',   // slightly softer red for print
    GREEN:      'FF16A34A',
    AMBER:      'FFFBBF24',
    LGRAY:      'FFE8ECF0',
    MGRAY:      'FFD1D5DB',
    WHITE:      'FFFFFFFF',
    BLACK:      'FF111111',
    STRIPE:     'FFF8FAFC',   // alternating task row tint
};

const xlFill  = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const xlBdr   = (style = 'thin', argb = 'FFB0B8C4') => ({ style, color: { argb } });
const outerB  = { top: xlBdr('medium'), bottom: xlBdr('medium'), left: xlBdr('medium'), right: xlBdr('medium') };
const innerB  = { top: xlBdr(), bottom: xlBdr(), left: xlBdr(), right: xlBdr() };
const ctr     = { horizontal: 'center', vertical: 'middle', wrapText: true };
const lft     = { horizontal: 'left',   vertical: 'middle', wrapText: true };

const hFont  = (size = 9, color = XL.WHITE) => ({ bold: true, size, name: 'Calibri', color: { argb: color } });
const bFont  = (size = 9, color = XL.BLACK) => ({ bold: true, size, name: 'Calibri', color: { argb: color } });
const rFont  = (size = 9, color = XL.BLACK) => ({ size, name: 'Calibri', color: { argb: color } });

// ─────────────────────────────────────────────────────────────────────────────
const TimelineGantt = ({ project, trackingData }) => {
    const {
        tasks, ganttDates,
        projectStart, projectEnd, projectDuration,
        saving, saveSuccess, autoSaved, error,
        addTask, addGroup, removeTask, updateTask, toggleActual,
        saveTimeline,
    } = useTimelineGantt(project?.id, trackingData);

    // ── Excel Export ─────────────────────────────────────────────────────────
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        wb.creator  = 'Project Timeline App';
        wb.created  = new Date();

        const ws = wb.addWorksheet('Gantt Timeline', {
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
            views: [{ showGridLines: false }],   // cleaner look — no default gridlines
        });

        // ── Column widths ────────────────────────────────────────────────
        const INFO_COLS  = 6;   // Task | Start | End | Duration | Unit | %
        const DATE_W     = 5.2; // each date column
        ws.columns = [
            { width: 32 },  // Task name
            { width: 13 },  // Start
            { width: 13 },  // End
            { width: 10 },  // Duration
            { width: 8  },  // Unit
            { width: 10 },  // % Complete
            ...ganttDates.map(() => ({ width: DATE_W })),
        ];

        let r = 1;

        // ── Row 1: Section title banner ──────────────────────────────────
        ws.mergeCells(r, 1, r, INFO_COLS + ganttDates.length);
        const titleCell = ws.getCell(r, 1);
        titleCell.value     = '📋  PROJECT GANTT TIMELINE';
        titleCell.font      = { bold: true, size: 14, name: 'Calibri', color: { argb: XL.WHITE } };
        titleCell.fill      = xlFill(XL.NAVY);
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(r).height = 30;
        r++;

        // ── Row 2–3: Project info header (labels) ────────────────────────
        const INFO_HEADERS = ['PROJECT NAME', 'DURATION (days)', 'START DATE', 'END DATE', 'DATE AS OF', ''];
        INFO_HEADERS.forEach((h, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value     = h;
            c.font      = hFont(8);
            c.fill      = xlFill('FF2D3A4E');
            c.alignment = ctr;
            c.border    = innerB;
        });
        // Merge remaining columns into last info cell for the date-as-of label
        ws.getRow(r).height = 18;
        r++;

        // Row 3: values
        const infoValues = [
            project.project_name,
            projectDuration ? `${projectDuration} days` : '—',
            projectStart ?? '—',
            projectEnd   ?? '—',
            new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            '',
        ];
        infoValues.forEach((v, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value     = v;
            c.font      = bFont(10, ci === 0 ? XL.NAVY : XL.BLACK);
            c.fill      = xlFill('FFF0F4F8');
            c.alignment = ci === 0 ? lft : ctr;
            c.border    = innerB;
        });
        ws.getRow(r).height = 22;
        r += 2;   // blank spacer

        // ── Gantt column-header row ──────────────────────────────────────
        const COL_HEADERS = ['TASK NAME', 'START DATE', 'END DATE', 'DURATION', 'UNIT', '% DONE'];
        COL_HEADERS.forEach((h, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value     = h;
            c.font      = hFont(9);
            c.fill      = xlFill(XL.NAVY);
            c.alignment = ctr;
            c.border    = innerB;
        });
        ganttDates.forEach((d, di) => {
            const c = ws.getCell(r, INFO_COLS + 1 + di);
            // Show month label only when it changes (first occurrence of month)
            const prev = ganttDates[di - 1];
            const showMonth = !prev || prev.getMonth() !== d.getMonth();
            c.value     = showMonth
                ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : d.getDate();
            c.font      = hFont(7);
            c.fill      = xlFill(XL.NAVY);
            c.alignment = { ...ctr, textRotation: 90 };
            c.border    = innerB;
        });
        ws.getRow(r).height = 48;   // rotated text needs height
        r++;

        // ── Task rows ────────────────────────────────────────────────────
        let taskIndex = 0;
        tasks.forEach(t => {
            if (t.type === 'group') {
                // Section / group header
                const total = INFO_COLS + ganttDates.length;
                for (let ci = 1; ci <= total; ci++) {
                    const c = ws.getCell(r, ci);
                    if (ci === 1) c.value = `▸  ${t.name.toUpperCase()}`;
                    c.font      = bFont(10, XL.NAVY);
                    c.fill      = xlFill(XL.LGRAY);
                    c.alignment = ci === 1 ? lft : ctr;
                    c.border    = innerB;
                }
                ws.getRow(r).height = 20;
                r++;
            } else {
                const isEven  = taskIndex % 2 === 0;
                const rowFill = isEven ? XL.WHITE : XL.STRIPE;
                taskIndex++;

                const ts = parseDate(t.start);
                const te = parseDate(t.end);

                // ── TARGET row ──
                const taskValues = [
                    t.name,
                    t.start || '—',
                    t.end   || '—',
                    t.duration > 0 ? t.duration : '—',
                    t.unit || 'DAYS',
                    t.percent != null ? `${t.percent}%` : '0%',
                ];
                taskValues.forEach((v, ci) => {
                    const c = ws.getCell(r, ci + 1);
                    c.value     = v;
                    c.font      = ci === 0 ? rFont(9) : rFont(9);
                    c.fill      = xlFill(rowFill);
                    c.alignment = ci === 0 ? lft : ctr;
                    c.border    = innerB;
                });

                // Target Gantt bars
                ganttDates.forEach((d, di) => {
                    const c    = ws.getCell(r, INFO_COLS + 1 + di);
                    const inR  = ts && te && d >= ts && d <= te;
                    if (inR) {
                        const isStart = d.toDateString() === ts.toDateString();
                        const isEnd   = d.toDateString() === te.toDateString();
                        c.fill = xlFill(XL.RED);
                        // Add start/end markers as text for clarity
                        c.value = isStart ? '◀' : isEnd ? '▶' : '';
                        c.font  = { size: 7, name: 'Calibri', color: { argb: XL.WHITE } };
                    } else {
                        c.fill = xlFill(rowFill);
                    }
                    c.alignment = ctr;
                    c.border    = innerB;
                });

                // Small label in col 1 area (TARGET tag)
                ws.getCell(r, 1).value = t.name;
                ws.getRow(r).height = 16;
                r++;

                // ── ACTUAL row ──
                // Cols 1–6 blank but styled
                for (let ci = 1; ci <= INFO_COLS; ci++) {
                    const c = ws.getCell(r, ci);
                    if (ci === 1) {
                        c.value = '  ↳ Actual';
                        c.font  = { italic: true, size: 8, name: 'Calibri', color: { argb: 'FF6B7280' } };
                    }
                    c.fill      = xlFill(rowFill);
                    c.alignment = lft;
                    c.border    = innerB;
                }
                // Actual Gantt bars
                ganttDates.forEach((d, di) => {
                    const dStr = d.toISOString().split('T')[0];
                    const c    = ws.getCell(r, INFO_COLS + 1 + di);
                    const done = t.actualDates?.[dStr];
                    c.fill      = done ? xlFill(XL.GREEN) : xlFill(rowFill);
                    c.value     = done ? '✓' : '';
                    c.font      = done ? { bold: true, size: 7, name: 'Calibri', color: { argb: XL.WHITE } } : rFont(7);
                    c.alignment = ctr;
                    c.border    = innerB;
                });
                ws.getRow(r).height = 14;
                r++;
            }
        });

        // ── Legend row ───────────────────────────────────────────────────
        r++;
        const legendItems = [
            { label: '■  Target',   fill: XL.RED   },
            { label: '■  Actual',   fill: XL.GREEN },
            { label: '■  Section',  fill: XL.LGRAY, fontColor: XL.NAVY },
        ];
        legendItems.forEach((item, i) => {
            const c = ws.getCell(r, i + 1);
            c.value     = item.label;
            c.font      = bFont(9, item.fontColor ?? XL.WHITE);
            c.fill      = xlFill(item.fill);
            c.alignment = ctr;
            c.border    = innerB;
        });
        ws.getRow(r).height = 18;

        // ── Footer row ───────────────────────────────────────────────────
        r += 2;
        ws.mergeCells(r, 1, r, 4);
        const footer = ws.getCell(r, 1);
        footer.value     = `Generated on ${new Date().toLocaleString('en-US')}  •  Project Duration: ${projectDuration} working days`;
        footer.font      = { italic: true, size: 8, name: 'Calibri', color: { argb: 'FF9CA3AF' } };
        footer.alignment = lft;
        ws.getRow(r).height = 16;

        // ── Write & download ─────────────────────────────────────────────
        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${project.project_name}_Gantt_${new Date().toISOString().slice(0,10)}.xlsx`,
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="tg-section">
            {error       && <div className="tg-error">⚠️ {error}</div>}
            {saveSuccess && <div className="tg-success">✅ Timeline saved!</div>}

            {/* Summary */}
            <div className="tg-summary">
                <div className="tg-summary-card card-project">
                    <span className="tg-summary-label">Project</span>
                    <span className="tg-summary-value">{project.project_name}</span>
                </div>
                <div className="tg-summary-card card-duration">
                    <span className="tg-summary-label">Duration</span>
                    <span className="tg-summary-value">
                        {projectDuration > 0 ? `${projectDuration} Days` : <span className="tg-summary-empty">—</span>}
                    </span>
                </div>
                <div className="tg-summary-card card-start">
                    <span className="tg-summary-label">Start Date</span>
                    <span className="tg-summary-value">
                        {projectStart ? fmtDate(parseDate(projectStart)) : <span className="tg-summary-empty">—</span>}
                    </span>
                </div>
                <div className="tg-summary-card card-end">
                    <span className="tg-summary-label">End Date</span>
                    <span className="tg-summary-value">
                        {projectEnd ? fmtDate(parseDate(projectEnd)) : <span className="tg-summary-empty">—</span>}
                    </span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="tg-toolbar">
                <button className="tg-btn tg-btn-success" onClick={exportExcel}>⬇️ Download Gantt</button>
                <button className="tg-btn tg-btn-navy" onClick={saveTimeline} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save'}
                </button>
                {/* Autosave status badge */}
                {saving    && <span className="tg-autosave-badge saving">⏳ Auto-saving…</span>}
                {autoSaved && <span className="tg-autosave-badge saved">✅ Auto-saved</span>}
            </div>

            {/* Task Table */}
            <div className="tg-card">
                <div className="tg-card-header">
                    <span className="tg-card-title">📋 Task Plan</span>
                    <div className="tg-header-btns">
                        <button className="tg-add-btn" onClick={addTask}>+ Add Task</button>
                        <button className="tg-add-btn secondary" onClick={addGroup}>+ Section</button>
                    </div>
                </div>
                <div className="tg-scroll">
                    <table className="tg-table">
                        <thead>
                            <tr>
                                <th className="th-left" style={{ minWidth: 130 }}>TASK NAME</th>
                                <th style={{ minWidth: 105 }}>START</th>
                                <th style={{ minWidth: 105 }}>END</th>
                                <th style={{ minWidth: 60 }}>DAYS</th>
                                <th style={{ minWidth: 65 }}>UNIT</th>
                                <th style={{ minWidth: 65 }}>% DONE</th>
                                <th style={{ width: 36 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontStyle: 'italic', fontSize: 12 }}>
                                        No tasks yet. Click "+ Add Task" to start.
                                    </td>
                                </tr>
                            )}
                            {tasks.map(t => t.type === 'group' ? (
                                <tr key={t.id} className="tr-group">
                                    <td colSpan={6} className="td-left">
                                        <input type="text" value={t.name}
                                            onChange={e => updateTask(t.id, 'name', e.target.value)}
                                            className="tg-input group-input" placeholder="Section name…" />
                                    </td>
                                    <td><button className="tg-remove-btn" onClick={() => removeTask(t.id)}>✕</button></td>
                                </tr>
                            ) : (
                                <tr key={t.id}>
                                    <td className="td-left">
                                        <input type="text" value={t.name}
                                            onChange={e => updateTask(t.id, 'name', e.target.value)}
                                            className="tg-input" placeholder="Task…" />
                                    </td>
                                    <td>
                                        <input type="date" value={t.start}
                                            onChange={e => updateTask(t.id, 'start', e.target.value)}
                                            className="tg-input" />
                                    </td>
                                    <td>
                                        <input type="date" value={t.end}
                                            onChange={e => updateTask(t.id, 'end', e.target.value)}
                                            className="tg-input" />
                                    </td>
                                    <td className="td-dur">{t.duration > 0 ? t.duration : '—'}</td>
                                    <td>
                                        <select value={t.unit} onChange={e => updateTask(t.id, 'unit', e.target.value)} className="tg-select">
                                            <option>DAYS</option><option>HRS</option><option>WKS</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div className="tg-percent-cell">
                                            <input type="number" value={t.percent ?? 0}
                                                onChange={e => updateTask(t.id, 'percent', e.target.value)}
                                                className="tg-percent-input" min="0" max="100" />%
                                        </div>
                                    </td>
                                    <td><button className="tg-remove-btn" onClick={() => removeTask(t.id)}>✕</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gantt Chart */}
            {ganttDates.length > 0 && (
                <div className="tg-gantt-card">
                    <div className="tg-gantt-header">
                        <span className="tg-card-title">📊 Gantt Chart</span>
                        <div className="tg-gantt-legend">
                            <span className="tg-legend-target">■ Target</span>
                            <span className="tg-legend-actual">■ Actual</span>
                        </div>
                    </div>
                    <div className="tg-gantt-scroll">
                        <table className="tg-gantt-table">
                            <thead>
                                <tr>
                                    <th className="tg-gantt-task-col">TASK</th>
                                    {ganttDates.map((d, di) => (
                                        <th key={di} className="tg-gantt-date-col">{fmtDate(d)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(t => t.type === 'group' ? (
                                    <tr key={t.id} className="tr-group">
                                        <td className="tg-gantt-name name-group">{t.name}</td>
                                        {ganttDates.map((_, di) => <td key={di} className="tg-gantt-cell cell-group" />)}
                                    </tr>
                                ) : (
                                    <React.Fragment key={t.id}>
                                        <tr>
                                            <td className="tg-gantt-name">
                                                <span className="tg-label-tag tg-label-target">T</span>{t.name}
                                            </td>
                                            {ganttDates.map((d, di) => {
                                                const ts = parseDate(t.start), te = parseDate(t.end);
                                                return <td key={di} className={`tg-gantt-cell ${ts && te && d >= ts && d <= te ? 'cell-target' : ''}`} />;
                                            })}
                                        </tr>
                                        <tr>
                                            <td className="tg-gantt-name name-actual">
                                                <span className="tg-label-tag tg-label-actual">A</span>
                                            </td>
                                            {ganttDates.map((d, di) => {
                                                const dStr = d.toISOString().split('T')[0];
                                                const done = t.actualDates?.[dStr];
                                                return (
                                                    <td key={di}
                                                        className={`tg-gantt-cell cell-clickable ${done ? 'cell-actual' : ''}`}
                                                        onClick={() => toggleActual(t.id, dStr)} />
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="tg-gantt-hint">💡 Click any Actual cell to mark complete</p>
                </div>
            )}

            {ganttDates.length === 0 && tasks.some(t => t.type === 'task') && (
                <div className="tg-empty">Add start/end dates to generate the Gantt chart.</div>
            )}
        </div>
    );
};

export default TimelineGantt;