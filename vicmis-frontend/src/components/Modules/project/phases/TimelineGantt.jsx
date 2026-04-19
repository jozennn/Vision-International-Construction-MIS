import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useTimelineGantt, fmtDate, parseDate } from '../hooks/useTimelineGantt.js';
import '../css/TimelineGantt.css';

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
        wb.creator = 'Project Timeline App';
        wb.created = new Date();

        const ws = wb.addWorksheet('Gantt Timeline', {
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
            views: [{ showGridLines: false }],
        });

        // ── Palette ───────────────────────────────────────────────────────────
        const NAVY   = 'FF1A3557';
        const RED    = 'FFFF0000';
        const GREEN  = 'FF00B050';
        const LGRAY  = 'FFD9D9D9';
        const WHITE  = 'FFFFFFFF';
        const BLACK  = 'FF000000';

        const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
        const thin = (argb = 'FFA0A0A0') => ({ style: 'thin',   color: { argb } });
        const med  = (argb = 'FF000000') => ({ style: 'medium', color: { argb } });
        const brd  = () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() });
        const brdH = () => ({ top: med(),  bottom: med(),  left: med(),  right: med()  });

        const ctr = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft = { horizontal: 'left',   vertical: 'middle', wrapText: true };

        const font = (opts = {}) => ({
            name:   'Calibri',
            size:   opts.size   ?? 9,
            bold:   opts.bold   ?? false,
            italic: opts.italic ?? false,
            color:  { argb: opts.color ?? BLACK },
        });

        const sc = (cell, opts = {}) => {
            if (opts.font)      cell.font      = opts.font;
            if (opts.fill)      cell.fill      = opts.fill;
            if (opts.alignment) cell.alignment = opts.alignment;
            if (opts.border)    cell.border    = opts.border;
        };

        // ── Column layout ─────────────────────────────────────────────────────
        // Col 1 : Task Name
        // Col 2 : TARGET / ACTUAL label
        // Col 3+ : one per gantt date
        const TASK_COL       = 1;
        const LABEL_COL      = 2;
        const DATE_START_COL = 3;
        const totalDateCols  = ganttDates.length;

        ws.columns = [
            { width: 28 },
            { width: 8  },
            ...ganttDates.map(() => ({ width: 5.5 })),
        ];

        const DARK_NAVY = 'FF1A1A2E';
        const INFO_BG   = 'FFF0F4F8';
        const HDR_BG    = 'FF2D3A4E';

        let r = 1;

        // ── ROW 1: Title banner ───────────────────────────────────────────────
        const totalCols = 2 + ganttDates.length;
        ws.mergeCells(r, 1, r, totalCols);
        const titleCell = ws.getCell(r, 1);
        titleCell.value     = '  PROJECT GANTT TIMELINE';
        titleCell.font      = font({ bold: true, size: 16, color: WHITE });
        titleCell.fill      = fill(DARK_NAVY);
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.border    = brdH();
        ws.getRow(r).height = 34;
        r++;

        // ── ROW 2: Info column labels ─────────────────────────────────────────
        const infoHeaders = ['PROJECT NAME', 'DURATION (days)', 'START DATE', 'END DATE', 'DATE AS OF'];
        infoHeaders.forEach((h, i) => {
            const c = ws.getCell(r, i + 1);
            c.value     = h;
            c.font      = font({ bold: true, size: 8, color: WHITE });
            c.fill      = fill(HDR_BG);
            c.alignment = i === 0 ? lft : ctr;
            c.border    = brdH();
        });
        // Fill remaining date columns with same dark header colour
        for (let ci = infoHeaders.length + 1; ci <= totalCols; ci++) {
            const c = ws.getCell(r, ci);
            c.fill   = fill(HDR_BG);
            c.border = brd();
        }
        ws.getRow(r).height = 18;
        r++;

        // ── ROW 3: Info values ────────────────────────────────────────────────
        const infoValues = [
            project.project_name,
            projectDuration ? `${projectDuration} days` : '—',
            projectStart ?? '—',
            projectEnd   ?? '—',
            new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        ];
        infoValues.forEach((v, i) => {
            const c = ws.getCell(r, i + 1);
            c.value     = v;
            c.font      = font({ bold: i === 0, size: 10, color: i === 0 ? DARK_NAVY : BLACK });
            c.fill      = fill(INFO_BG);
            c.alignment = i === 0 ? lft : ctr;
            c.border    = brdH();
        });
        for (let ci = infoValues.length + 1; ci <= totalCols; ci++) {
            const c = ws.getCell(r, ci);
            c.fill   = fill(INFO_BG);
            c.border = brd();
        }
        ws.getRow(r).height = 22;
        r++;

        // Spacer row
        ws.getRow(r).height = 6;
        r++;

        // ── ROW next: Day-number header ───────────────────────────────────────
        // Task Name cell merges rows 1–2
        ws.mergeCells(r, TASK_COL, r + 1, TASK_COL);
        sc(ws.getCell(r, TASK_COL), {
            font:      font({ bold: true, size: 10, color: WHITE }),
            fill:      fill(NAVY),
            alignment: ctr,
            border:    brdH(),
        });
        ws.getCell(r, TASK_COL).value = 'TASK NAME';

        // Label col merges rows 1–2
        ws.mergeCells(r, LABEL_COL, r + 1, LABEL_COL);
        sc(ws.getCell(r, LABEL_COL), { fill: fill(NAVY), border: brdH() });

        // Day index numbers
        ganttDates.forEach((d, di) => {
            const c = ws.getCell(r, DATE_START_COL + di);
            c.value = di;
            sc(c, {
                font:      font({ bold: true, size: 8, color: WHITE }),
                fill:      fill(NAVY),
                alignment: ctr,
                border:    brd(),
            });
        });
        ws.getRow(r).height = 22;
        r++;

        // ── ROW 2: Date labels header ─────────────────────────────────────────
        ganttDates.forEach((d, di) => {
            const c = ws.getCell(r, DATE_START_COL + di);
            c.value = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            sc(c, {
                font:      font({ bold: true, size: 8, color: WHITE }),
                fill:      fill(NAVY),
                alignment: ctr,
                border:    brd(),
            });
        });
        ws.getRow(r).height = 18;
        r++;

        // ── TASK ROWS ─────────────────────────────────────────────────────────
        tasks.forEach((t) => {
            if (t.type === 'group') {
                // Section header — merge task + label cols
                ws.mergeCells(r, TASK_COL, r, LABEL_COL);
                const gc = ws.getCell(r, TASK_COL);
                gc.value = t.name;
                sc(gc, {
                    font:      font({ bold: true, size: 10, color: BLACK }),
                    fill:      fill(LGRAY),
                    alignment: lft,
                    border:    brd(),
                });
                for (let di = 0; di < totalDateCols; di++) {
                    const c = ws.getCell(r, DATE_START_COL + di);
                    sc(c, { fill: fill(LGRAY), border: brd() });
                }
                ws.getRow(r).height = 18;
                r++;

            } else {
                const ts = parseDate(t.start);
                const te = parseDate(t.end);

                // ── TARGET row ──
                const tnCell = ws.getCell(r, TASK_COL);
                tnCell.value = t.name;
                sc(tnCell, { font: font({ size: 9 }), fill: fill(WHITE), alignment: lft, border: brd() });

                const tlCell = ws.getCell(r, LABEL_COL);
                tlCell.value = 'TARGET';
                sc(tlCell, {
                    font:      font({ bold: true, size: 7, color: WHITE }),
                    fill:      fill(RED),
                    alignment: ctr,
                    border:    brd(),
                });

                ganttDates.forEach((d, di) => {
                    const c   = ws.getCell(r, DATE_START_COL + di);
                    const inR = ts && te && d >= ts && d <= te;
                    sc(c, { fill: fill(inR ? RED : WHITE), alignment: ctr, border: brd() });
                });
                ws.getRow(r).height = 14;
                r++;

                // ── ACTUAL row ──
                const anCell = ws.getCell(r, TASK_COL);
                sc(anCell, { fill: fill(WHITE), border: brd() });

                const alCell = ws.getCell(r, LABEL_COL);
                alCell.value = 'ACTUAL';
                sc(alCell, {
                    font:      font({ bold: true, size: 7, color: WHITE }),
                    fill:      fill(GREEN),
                    alignment: ctr,
                    border:    brd(),
                });

                ganttDates.forEach((d, di) => {
                    const dStr = d.toISOString().split('T')[0];
                    const done = t.actualDates?.[dStr];
                    const c    = ws.getCell(r, DATE_START_COL + di);
                    sc(c, { fill: fill(done ? GREEN : WHITE), alignment: ctr, border: brd() });
                });
                ws.getRow(r).height = 12;
                r++;
            }
        });

        // ── LEGEND ────────────────────────────────────────────────────────────
        r++;
        [
            { label: '■  TARGET',  bg: RED,   fg: WHITE },
            { label: '■  ACTUAL',  bg: GREEN, fg: WHITE },
            { label: '■  SECTION', bg: LGRAY, fg: BLACK },
        ].forEach((item, i) => {
            const c = ws.getCell(r, TASK_COL + i);
            c.value = item.label;
            sc(c, {
                font:      font({ bold: true, size: 9, color: item.fg }),
                fill:      fill(item.bg),
                alignment: ctr,
                border:    brd(),
            });
        });
        ws.getRow(r).height = 16;

        // ── FOOTER ────────────────────────────────────────────────────────────
        r += 2;
        ws.mergeCells(r, 1, r, 5);
        const footer = ws.getCell(r, 1);
        footer.value     = `Generated on ${new Date().toLocaleString('en-US')}  •  Project Duration: ${projectDuration} working days`;
        footer.font      = font({ italic: true, size: 8, color: 'FF9CA3AF' });
        footer.alignment = lft;
        ws.getRow(r).height = 14;

        // ── Print settings ────────────────────────────────────────────────────
        ws.pageSetup = {
            paperSize:   9,
            orientation: 'landscape',
            fitToPage:   true,
            fitToWidth:  1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        };

        // ── Save ──────────────────────────────────────────────────────────────
        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${project.project_name}_Gantt_${new Date().toISOString().slice(0, 10)}.xlsx`,
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