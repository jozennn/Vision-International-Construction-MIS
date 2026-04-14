// src/phases/InstallerMonitoring.jsx
import React, { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useInstallerMonitoring, resolveRoster } from '../hooks/useInstallerMonitoring.js';
import '../css/MonitoringComponents.css';

const POSITIONS = ['Lead Installer', 'Installer', 'Helper', 'Supervisor'];

// ─── Save Indicator ───────────────────────────────────────────────────────────
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

const InstallerMonitoring = ({ project, user }) => {
    const roster = resolveRoster(project);

    const {
        selectedDate, setSelectedDate,
        currentLog,   setCurrentLog,
        allLogs,
        loading, saving, saveStatus, error,
        addRow, removeRow, updateRow,
        saveLog,
    } = useInstallerMonitoring(project?.id, roster);

    const [showHistory, setShowHistory] = useState(false);
    const [photoMain,   setPhotoMain]   = useState(null);
    const [photo1,      setPhoto1]      = useState(null);
    const [photo2,      setPhoto2]      = useState(null);
    const fileMainRef = useRef();
    const file1Ref    = useRef();
    const file2Ref    = useRef();

    const projectName = project?.project_name ?? '';
    const location    = project?.location     ?? '';
    const requirement = project?.project_type ?? '';
    const leadMan     = roster.find(i => i.position === 'Lead Installer')?.name
                     ?? roster[0]?.name ?? '—';
    const logExists   = allLogs.some(l => l.log_date === selectedDate);

    const handleSave = async () => {
        try {
            await saveLog({ photoMain, photo1, photo2 });
            setPhotoMain(null); setPhoto1(null); setPhoto2(null);
            [fileMainRef, file1Ref, file2Ref].forEach(r => { if (r.current) r.current.value = ''; });
        } catch {}
    };

    // ─── Export to Excel ──────────────────────────────────────────────────────
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Daily Monitoring');

        // ── Palette ───────────────────────────────────────────────────────────
        const NAVY   = 'FF1A1A2E';
        const CREAM  = 'FFF5EDE8';
        const LGRAY  = 'FFF2F2F2';
        const MGRAY  = 'FFE0E0E0';
        const DGRAY  = 'FF4A4A4A';
        const WHITE  = 'FFFFFFFF';

        // ── Helpers ───────────────────────────────────────────────────────────
        const fill  = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
        const thin  = (argb = 'FFB0B0B0') => ({ style: 'thin',   color: { argb } });
        const thick = (argb = 'FF1A1A2E') => ({ style: 'medium', color: { argb } });
        const brd   = (c = 'FFB0B0B0') => ({ top: thin(c), bottom: thin(c), left: thin(c), right: thin(c) });
        const brdThick = () => ({ top: thick(), bottom: thick(), left: thick(), right: thick() });
        const ctr   = { horizontal: 'center',  vertical: 'middle', wrapText: true };
        const lft   = { horizontal: 'left',    vertical: 'middle', wrapText: true };

        const font = (opts = {}) => ({
            name:   'Arial',
            size:   opts.size  ?? 10,
            bold:   opts.bold  ?? false,
            color:  { argb: opts.color ?? 'FF000000' },
            italic: opts.italic ?? false,
        });

        const style = (cell, opts = {}) => {
            if (opts.font)      cell.font      = opts.font;
            if (opts.fill)      cell.fill      = opts.fill;
            if (opts.alignment) cell.alignment = opts.alignment;
            if (opts.border)    cell.border    = opts.border;
        };

        // ── Column widths ─────────────────────────────────────────────────────
        ws.columns = [
            { width: 5  },  // A – row #
            { width: 26 },  // B – name / label
            { width: 16 },  // C – position / value
            { width: 16 },  // D – time in
            { width: 16 },  // E – time out
            { width: 32 },  // F – remarks / value
        ];

        let r = 1;

        // ── 1. COMPANY HEADER ────────────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const hdr = ws.getCell(`A${r}`);
        hdr.value = 'VISION INTERNATIONAL CONSTRUCTION OPC\n"You Envision, We Build"';
        style(hdr, {
            font:      font({ size: 14, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: ctr,
            border:    brdThick(),
        });
        ws.getRow(r).height = 48;
        r++;

        // ── 2. SUBTITLE ──────────────────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const sub = ws.getCell(`A${r}`);
        sub.value = "INSTALLER'S DAILY MONITORING ON SITE";
        style(sub, {
            font:      font({ size: 11, bold: true }),
            fill:      fill(CREAM),
            alignment: ctr,
            border:    brd(),
        });
        ws.getRow(r).height = 22;
        r++;

        // ── 3. PROJECT INFO BLOCK ────────────────────────────────────────────
        const fmtDate = (d) => {
            if (!d) return '—';
            const dt = new Date(d + 'T00:00:00');
            return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        const infoRows = [
            ['Project',              projectName],
            ['Location',             location],
            ['Requirement',          requirement],
            ['Installer (Lead Man)', leadMan],
            ['Total Area Logged',    currentLog.totalArea || '—'],
            ['Date',                 fmtDate(currentLog.date)],
        ];

        infoRows.forEach(([label, value]) => {
            ws.mergeCells(`A${r}:B${r}`);
            ws.mergeCells(`C${r}:F${r}`);

            const lc = ws.getCell(`A${r}`);
            lc.value = label;
            style(lc, { font: font({ bold: true }), fill: fill(LGRAY), alignment: lft, border: brd() });

            const vc = ws.getCell(`C${r}`);
            vc.value = value;
            style(vc, { font: font(), fill: fill(WHITE), alignment: lft, border: brd() });

            ws.getRow(r).height = 18;
            r++;
        });

        // Status / Remarks
        ws.mergeCells(`A${r}:B${r}`);
        ws.mergeCells(`C${r}:F${r}`);
        const sLbl = ws.getCell(`A${r}`);
        sLbl.value = 'Status / Remarks';
        style(sLbl, { font: font({ bold: true }), fill: fill(LGRAY), alignment: lft, border: brd() });
        const sVal = ws.getCell(`C${r}`);
        sVal.value = currentLog.remarks || '—';
        style(sVal, { font: font(), fill: fill(WHITE), alignment: lft, border: brd() });
        ws.getRow(r).height = 32;
        r++;

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 4. TIMELINE LOGS SECTION ─────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const tlHdr = ws.getCell(`A${r}`);
        tlHdr.value = 'TIMELINE LOGS';
        style(tlHdr, {
            font:      font({ size: 10, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: lft,
            border:    brdThick(),
        });
        ws.getRow(r).height = 20;
        r++;

        // Sub-headers
        const tlSubHeaders = ['', 'From Client — Start', 'Actual Start', '', 'From Client — End', 'Actual End'];
        ['A','B','C','D','E','F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tlSubHeaders[i];
            style(c, { font: font({ bold: true, size: 9 }), fill: fill(MGRAY), alignment: ctr, border: brd() });
        });
        ws.getRow(r).height = 16;
        r++;

        // Values
        const tlValues = [
            '', fmtDate(currentLog.clientStart), fmtDate(currentLog.actualStart),
            '', fmtDate(currentLog.clientEnd),   fmtDate(currentLog.actualEnd),
        ];
        ['A','B','C','D','E','F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tlValues[i];
            style(c, { font: font(), fill: fill(WHITE), alignment: ctr, border: brd() });
        });
        ws.getRow(r).height = 18;
        r++;

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 5. INSTALLER TABLE ───────────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const instHdr = ws.getCell(`A${r}`);
        instHdr.value = `INSTALLERS  —  ${selectedDate}`;
        style(instHdr, {
            font:      font({ size: 10, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: lft,
            border:    brdThick(),
        });
        ws.getRow(r).height = 20;
        r++;

        // Table column headers
        const tblHeaders = ['#', 'Name', 'Position', 'Time In', 'Time Out', 'Remarks'];
        ['A','B','C','D','E','F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tblHeaders[i];
            style(c, {
                font:      font({ bold: true, size: 9, color: WHITE }),
                fill:      fill('FF2D2D44'),
                alignment: i === 0 ? ctr : lft,
                border:    brd('FF000000'),
            });
        });
        ws.getRow(r).height = 18;
        r++;

        // Installer rows
        const fmt12hr = (t) => {
            if (!t) return '—';
            const [h, m] = t.split(':');
            const hh   = parseInt(h);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            const disp = hh % 12 || 12;
            return `${disp}:${m} ${ampm}`;
        };

        (currentLog.rows || []).forEach((row, idx) => {
            const rowFill = idx % 2 === 0 ? WHITE : 'FFFAFAFA';
            const cells = [
                [idx + 1,            ctr],
                [row.name     || '—', lft],
                [row.position || '—', lft],
                [fmt12hr(row.timeIn),  ctr],
                [fmt12hr(row.timeOut), ctr],
                [row.remarks  || '',  lft],
            ];
            ['A','B','C','D','E','F'].forEach((col, i) => {
                const c = ws.getCell(`${col}${r}`);
                c.value = cells[i][0];
                style(c, { font: font(), fill: fill(rowFill), alignment: cells[i][1], border: brd() });
            });
            ws.getRow(r).height = 18;
            r++;
        });

        // Roster summary row
        const rosterSummary = ['Lead Installer', 'Installer', 'Helper', 'Supervisor']
            .map(pos => {
                const count = (currentLog.rows || []).filter(row => row.position === pos).length;
                return count > 0 ? `${count} ${pos}` : null;
            })
            .filter(Boolean)
            .join('   •   ');

        if (rosterSummary) {
            ws.mergeCells(`A${r}:F${r}`);
            const sumCell = ws.getCell(`A${r}`);
            sumCell.value = rosterSummary;
            style(sumCell, {
                font:      font({ size: 9, italic: true, color: DGRAY }),
                fill:      fill(LGRAY),
                alignment: lft,
                border:    brd(),
            });
            ws.getRow(r).height = 16;
            r++;
        }

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 6. PHOTO ATTACHMENTS ─────────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const photoHdr = ws.getCell(`A${r}`);
        photoHdr.value = 'PHOTO ATTACHMENTS';
        style(photoHdr, {
            font:      font({ size: 10, bold: true, color: WHITE }),
            fill:      fill(NAVY),
            alignment: lft,
            border:    brdThick(),
        });
        ws.getRow(r).height = 20;
        r++;

        const photoEntries = [
            ['Main Progress Photo', photoMain],
            ['Team Photo 1',        photo1],
            ['Team Photo 2',        photo2],
        ];

        for (const [label, fileObj] of photoEntries) {
            ws.mergeCells(`A${r}:B${r}`);
            ws.mergeCells(`C${r}:F${r}`);

            const lc = ws.getCell(`A${r}`);
            lc.value = label;
            style(lc, { font: font({ bold: true }), fill: fill(LGRAY), alignment: lft, border: brd() });

            const vc = ws.getCell(`C${r}`);

            if (fileObj) {
                try {
                    const buf  = await fileObj.arrayBuffer();
                    const ext  = fileObj.name.split('.').pop().toLowerCase();
                    const mime = ext === 'png' ? 'png' : 'jpeg';
                    const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
                    const imgId = wb.addImage({ base64: b64, extension: mime });
                    ws.getRow(r).height = 80;
                    ws.addImage(imgId, {
                        tl: { col: 2, row: r - 1 },
                        br: { col: 6, row: r },
                        editAs: 'oneCell',
                    });
                    vc.value = '';
                } catch {
                    vc.value = `[Image: ${fileObj.name}]`;
                    ws.getRow(r).height = 18;
                }
            } else {
                vc.value = '(no photo attached)';
                ws.getRow(r).height = 18;
            }

            style(vc, { font: font({ italic: true, color: DGRAY }), fill: fill(WHITE), alignment: lft, border: brd() });
            r++;
        }

        // Spacer
        ws.getRow(r).height = 6; r++;

        // ── 7. FOOTER ─────────────────────────────────────────────────────────
        ws.mergeCells(`A${r}:F${r}`);
        const footer = ws.getCell(`A${r}`);
        footer.value = `Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · Vision International Construction OPC`;
        style(footer, {
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
        const dateStr = new Date(currentLog.date + 'T00:00:00')
            .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            .replace(/ /g, '-');
        saveAs(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_DailyLog_${dateStr}.xlsx`
        );
    };

    if (loading) return <div className="mon-loading">⏳ Loading logs...</div>;

    return (
        <div className="mon-section">
            {/* Header */}
            <div className="mon-page-header">
                <div className="mon-header-meta">
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Lead Installer', leadMan]].map(([l, v]) => (
                        <div key={l} className="mon-header-field">
                            <span className="mon-header-label">{l}</span>
                            <span className="mon-header-value">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mon-header-actions">
                    <SaveIndicator status={saveStatus} />
                    <button className="mon-btn mon-btn-outline" onClick={exportExcel}>⬇️ Excel</button>
                    <button className="mon-btn mon-btn-navy" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="mon-body">
                {error && <div className="mon-error">⚠️ {error}</div>}

                {/* Top info row */}
                <div className="mon-top-row">
                    <div className="mon-top-field">
                        <span className="mon-input-label">Total Area Logged</span>
                        <input type="text" value={currentLog.totalArea}
                            onChange={e => setCurrentLog({ ...currentLog, totalArea: e.target.value })}
                            className="mon-input" placeholder="e.g. 134 Lm" />
                    </div>
                    <div className="mon-top-field mon-top-remarks">
                        <span className="mon-input-label">Status / Remarks</span>
                        <textarea value={currentLog.remarks}
                            onChange={e => setCurrentLog({ ...currentLog, remarks: e.target.value })}
                            className="mon-textarea mon-textarea-sm"
                            rows={2} placeholder="Describe current site status..." />
                    </div>
                    <div className="mon-top-datepicker">
                        <span className="mon-input-label">📅 Log Date</span>
                        <input type="date" value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="mon-date-input-inline" />
                        <span className={`mon-date-status ${logExists ? 'exists' : 'new'}`}>
                            {logExists ? '✅ Log exists' : '🆕 New entry'}
                        </span>
                    </div>
                </div>

                {/* Timeline logs */}
                <div className="mon-timeline-block">
                    <div className="mon-block-header">
                        <span className="mon-block-title">📅 Timeline Logs</span>
                    </div>
                    <div className="mon-timeline-paired">
                        <div className="mon-timeline-col">
                            <div className="mon-input-group">
                                <span className="mon-input-label">From Client — Start</span>
                                <input type="date" value={currentLog.clientStart}
                                    onChange={e => setCurrentLog({ ...currentLog, clientStart: e.target.value })}
                                    className="mon-input" />
                            </div>
                            <div className="mon-input-group">
                                <span className="mon-input-label">Actual Start</span>
                                <input type="date" value={currentLog.actualStart}
                                    onChange={e => setCurrentLog({ ...currentLog, actualStart: e.target.value })}
                                    className="mon-input mon-input-actual" />
                            </div>
                        </div>
                        <div className="mon-timeline-col">
                            <div className="mon-input-group">
                                <span className="mon-input-label">From Client — End</span>
                                <input type="date" value={currentLog.clientEnd}
                                    onChange={e => setCurrentLog({ ...currentLog, clientEnd: e.target.value })}
                                    className="mon-input" />
                            </div>
                            <div className="mon-input-group">
                                <span className="mon-input-label">Actual End</span>
                                <input type="date" value={currentLog.actualEnd}
                                    onChange={e => setCurrentLog({ ...currentLog, actualEnd: e.target.value })}
                                    className="mon-input mon-input-actual" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Installer Table */}
                <div className="mon-table-card">
                    <div className="mon-table-toolbar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="mon-table-title">👷 Installers — {selectedDate}</span>
                            {roster.length > 0 && (
                                <span className="mon-roster-badge">{roster.length} from roster</span>
                            )}
                        </div>
                        <button className="mon-add-btn" onClick={addRow}>+ Add Row</button>
                    </div>
                    <div className="mon-table-scroll">
                        <table className="mon-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}>#</th>
                                    <th className="th-left" style={{ minWidth: 120 }}>Name</th>
                                    <th className="th-left" style={{ minWidth: 100 }}>Position</th>
                                    <th style={{ minWidth: 80 }}>Time In</th>
                                    <th style={{ minWidth: 80 }}>Time Out</th>
                                    <th style={{ minWidth: 100 }}>Remarks</th>
                                    <th style={{ width: 36 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentLog.rows.map((row, idx) => (
                                    <tr key={row.id} className={row.name ? 'row-filled' : ''}>
                                        <td className="td-num">{idx + 1}</td>
                                        <td className="td-left">
                                            <input type="text" value={row.name}
                                                onChange={e => updateRow(row.id, 'name', e.target.value)}
                                                className="mon-cell-input input-wide" placeholder="Full name" />
                                        </td>
                                        <td className="td-left">
                                            <select value={row.position}
                                                onChange={e => updateRow(row.id, 'position', e.target.value)}
                                                className="mon-cell-select">
                                                <option value="">— Select —</option>
                                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="time" value={row.timeIn}
                                                onChange={e => updateRow(row.id, 'timeIn', e.target.value)}
                                                className="mon-cell-input" />
                                        </td>
                                        <td>
                                            <input type="time" value={row.timeOut}
                                                onChange={e => updateRow(row.id, 'timeOut', e.target.value)}
                                                className="mon-cell-input" />
                                        </td>
                                        <td>
                                            <input type="text" value={row.remarks}
                                                onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                                                className="mon-cell-input input-wide" placeholder="Notes…" />
                                        </td>
                                        <td>
                                            <button className="mon-remove-btn"
                                                onClick={() => removeRow(row.id)}
                                                disabled={currentLog.rows.length <= 1}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {roster.length > 0 && (
                        <div className="mon-roster-summary">
                            {['Lead Installer', 'Installer', 'Helper', 'Supervisor'].map(pos => {
                                const count = roster.filter(r => r.position === pos).length;
                                return count > 0 ? (
                                    <span key={pos} className="mon-roster-pill">{count} {pos}</span>
                                ) : null;
                            })}
                        </div>
                    )}
                </div>

                {/* Photo Uploads */}
                <div className="mon-photo-section">
                    <div className="mon-block-header">
                        <span className="mon-block-title">📸 Photo Attachments</span>
                    </div>
                    <div className="mon-photo-grid">
                        {[['Main Progress Photo', photoMain, setPhotoMain, fileMainRef],
                          ['Team Photo 1',        photo1,    setPhoto1,    file1Ref],
                          ['Team Photo 2',        photo2,    setPhoto2,    file2Ref]
                        ].map(([label, state, setter, ref]) => (
                            <div key={label} className="mon-photo-item">
                                <span className="mon-photo-label">{label}</span>
                                <label className={`mon-upload-trigger ${state ? 'has-file' : ''}`}>
                                    <span className="mon-upload-icon">{state ? '✅' : '📎'}</span>
                                    <span className="mon-upload-name">
                                        {state ? state.name : 'Click to choose image…'}
                                    </span>
                                    <input type="file" accept="image/*" ref={ref}
                                        onChange={e => setter(e.target.files[0])}
                                        className="mon-file-hidden" />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History */}
                {allLogs.length > 0 && (
                    <div className="mon-history">
                        <div className="mon-history-header">
                            <div>
                                <span className="mon-history-title">Log History</span>
                                <span className="mon-history-count">{allLogs.length}</span>
                            </div>
                            <button className="mon-toggle-btn" onClick={() => setShowHistory(!showHistory)}>
                                {showHistory ? 'Hide' : 'Show all'}
                            </button>
                        </div>
                        {showHistory && (
                            <div className="mon-history-list">
                                {allLogs.map(l => (
                                    <div key={l.id} className="mon-history-item"
                                        onClick={() => setSelectedDate(l.log_date)}>
                                        <div>
                                            <div className="mon-history-date">{l.log_date}</div>
                                            <div className="mon-history-meta">
                                                {l.accomplishment_percent ?? 0}% · Area: {l.total_area ?? '—'}
                                            </div>
                                        </div>
                                        <span className="mon-history-badge">View</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstallerMonitoring;