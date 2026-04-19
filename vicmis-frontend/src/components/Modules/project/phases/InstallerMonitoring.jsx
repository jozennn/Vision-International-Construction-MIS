import React, { useRef, useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useInstallerMonitoring, resolveRoster } from '../hooks/useInstallerMonitoring.js';
import '../css/InstallerMonitoring.css';

const POSITIONS = ['Lead Installer', 'Installer', 'Helper', 'Supervisor'];

// Helper to format date for input fields
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
};

// Save Indicator Component
const SaveIndicator = ({ status }) => {
    if (!status) return null;
    const styles = {
        saving: { color: '#6b7280', fontSize: '0.75rem' },
        saved: { color: '#16a34a', fontSize: '0.75rem' },
        error: { color: '#dc2626', fontSize: '0.75rem' },
    };
    const labels = { saving: '● Saving…', saved: '✓ Auto-saved', error: '✗ Auto-save failed' };
    return <span style={styles[status]}>{labels[status]}</span>;
};

const InstallerMonitoring = ({ project, user }) => {
    const roster = resolveRoster(project);

    const {
        selectedDate, setSelectedDate,
        currentLog, setCurrentLog,
        allLogs,
        loading, saving, saveStatus, error,
        addRow, removeRow, updateRow,
        saveLog,
    } = useInstallerMonitoring(project?.id, roster);

    const [showHistory, setShowHistory] = useState(false);
    const [photoMain, setPhotoMain] = useState(null);
    const [photo1, setPhoto1] = useState(null);
    const [photo2, setPhoto2] = useState(null);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
    const [existingTeamPhoto1Url, setExistingTeamPhoto1Url] = useState(null);
    const [existingTeamPhoto2Url, setExistingTeamPhoto2Url] = useState(null);
    
    const fileMainRef = useRef();
    const file1Ref = useRef();
    const file2Ref = useRef();

    const projectName = project?.project_name ?? '';
    const location = project?.location ?? '';
    const requirement = project?.project_type ?? '';
    const leadMan = roster.find(i => i.position === 'Lead Installer')?.name ?? roster[0]?.name ?? '—';
    
    const logExists = allLogs.some(l => {
    const logDate = l.log_date_formatted || (l.log_date ? l.log_date.split('T')[0] : null);
    return logDate === selectedDate;
});

    // Load existing photos when currentLog changes
    useEffect(() => {
        if (currentLog.photo_url) {
            setExistingPhotoUrl(currentLog.photo_url);
        } else {
            setExistingPhotoUrl(null);
        }
        
        if (currentLog.team_photo_1_url) {
            setExistingTeamPhoto1Url(currentLog.team_photo_1_url);
        } else {
            setExistingTeamPhoto1Url(null);
        }
        
        if (currentLog.team_photo_2_url) {
            setExistingTeamPhoto2Url(currentLog.team_photo_2_url);
        } else {
            setExistingTeamPhoto2Url(null);
        }
    }, [currentLog.id, currentLog.photo_url, currentLog.team_photo_1_url, currentLog.team_photo_2_url]);

    const handleSave = async () => {
        try {
            await saveLog({ photoMain, photo1, photo2 });
            
            setPhotoMain(null);
            setPhoto1(null);
            setPhoto2(null);
            
            if (fileMainRef.current) fileMainRef.current.value = '';
            if (file1Ref.current) file1Ref.current.value = '';
            if (file2Ref.current) file2Ref.current.value = '';
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    // Export to Excel
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Daily Monitoring');

        const NAVY = 'FF1A1A2E';
        const CREAM = 'FFF5EDE8';
        const LGRAY = 'FFF2F2F2';
        const MGRAY = 'FFE0E0E0';
        const DGRAY = 'FF4A4A4A';
        const WHITE = 'FFFFFFFF';

        const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
        const thin = (argb = 'FFB0B0B0') => ({ style: 'thin', color: { argb } });
        const thick = (argb = 'FF1A1A2E') => ({ style: 'medium', color: { argb } });
        const brd = (c = 'FFB0B0B0') => ({ top: thin(c), bottom: thin(c), left: thin(c), right: thin(c) });
        const brdThick = () => ({ top: thick(), bottom: thick(), left: thick(), right: thick() });
        const ctr = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const font = (opts = {}) => ({
            name: 'Arial',
            size: opts.size ?? 10,
            bold: opts.bold ?? false,
            color: { argb: opts.color ?? 'FF000000' },
            italic: opts.italic ?? false,
        });

        const style = (cell, opts = {}) => {
            if (opts.font) cell.font = opts.font;
            if (opts.fill) cell.fill = opts.fill;
            if (opts.alignment) cell.alignment = opts.alignment;
            if (opts.border) cell.border = opts.border;
        };

        ws.columns = [
            { width: 5 }, { width: 26 }, { width: 16 },
            { width: 16 }, { width: 16 }, { width: 32 },
        ];

        let r = 1;

        // Company Header
        ws.mergeCells(`A${r}:F${r}`);
        const hdr = ws.getCell(`A${r}`);
        hdr.value = 'VISION INTERNATIONAL CONSTRUCTION OPC\n"You Envision, We Build"';
        style(hdr, { font: font({ size: 14, bold: true, color: WHITE }), fill: fill(NAVY), alignment: ctr, border: brdThick() });
        ws.getRow(r).height = 48;
        r++;

        // Subtitle
        ws.mergeCells(`A${r}:F${r}`);
        const sub = ws.getCell(`A${r}`);
        sub.value = "INSTALLER'S DAILY MONITORING ON SITE";
        style(sub, { font: font({ size: 11, bold: true }), fill: fill(CREAM), alignment: ctr, border: brd() });
        ws.getRow(r).height = 22;
        r++;

        // Project Info
        const fmtDate = (d) => {
            if (!d) return '—';
            const dt = new Date(d + 'T00:00:00');
            return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        const infoRows = [
            ['Project', projectName],
            ['Location', location],
            ['Requirement', requirement],
            ['Installer (Lead Man)', leadMan],
            ['Total Area Logged', currentLog.totalArea || '—'],
            ['Date', fmtDate(currentLog.date)],
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

        // Status/Remarks
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
        ws.getRow(r).height = 6;
        r++;

        // Timeline Logs
        ws.mergeCells(`A${r}:F${r}`);
        const tlHdr = ws.getCell(`A${r}`);
        tlHdr.value = 'TIMELINE LOGS';
        style(tlHdr, { font: font({ size: 10, bold: true, color: WHITE }), fill: fill(NAVY), alignment: lft, border: brdThick() });
        ws.getRow(r).height = 20;
        r++;

        const tlSubHeaders = ['', 'From Client — Start', 'Actual Start', '', 'From Client — End', 'Actual End'];
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tlSubHeaders[i];
            style(c, { font: font({ bold: true, size: 9 }), fill: fill(MGRAY), alignment: ctr, border: brd() });
        });
        ws.getRow(r).height = 16;
        r++;

        const tlValues = [
            '', fmtDate(currentLog.clientStart), fmtDate(currentLog.actualStart),
            '', fmtDate(currentLog.clientEnd), fmtDate(currentLog.actualEnd),
        ];
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tlValues[i];
            style(c, { font: font(), fill: fill(WHITE), alignment: ctr, border: brd() });
        });
        ws.getRow(r).height = 18;
        r++;
        ws.getRow(r).height = 6;
        r++;

        // Installer Table
        ws.mergeCells(`A${r}:F${r}`);
        const instHdr = ws.getCell(`A${r}`);
        instHdr.value = `INSTALLERS — ${formatDateForInput(selectedDate)}`;
        style(instHdr, { font: font({ size: 10, bold: true, color: WHITE }), fill: fill(NAVY), alignment: lft, border: brdThick() });
        ws.getRow(r).height = 20;
        r++;

        const tblHeaders = ['#', 'Name', 'Position', 'Time In', 'Time Out', 'Remarks'];
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
            const c = ws.getCell(`${col}${r}`);
            c.value = tblHeaders[i];
            style(c, {
                font: font({ bold: true, size: 9, color: WHITE }),
                fill: fill('FF2D2D44'),
                alignment: i === 0 ? ctr : lft,
                border: brd('FF000000'),
            });
        });
        ws.getRow(r).height = 18;
        r++;

        const fmt12hr = (t) => {
            if (!t) return '—';
            const [h, m] = t.split(':');
            const hh = parseInt(h);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            const disp = hh % 12 || 12;
            return `${disp}:${m} ${ampm}`;
        };

        (currentLog.rows || []).forEach((row, idx) => {
            const rowFill = idx % 2 === 0 ? WHITE : 'FFFAFAFA';
            const cells = [
                [idx + 1, ctr],
                [row.name || '—', lft],
                [row.position || '—', lft],
                [fmt12hr(row.timeIn), ctr],
                [fmt12hr(row.timeOut), ctr],
                [row.remarks || '', lft],
            ];
            ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
                const c = ws.getCell(`${col}${r}`);
                c.value = cells[i][0];
                style(c, { font: font(), fill: fill(rowFill), alignment: cells[i][1], border: brd() });
            });
            ws.getRow(r).height = 18;
            r++;
        });

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
            style(sumCell, { font: font({ size: 9, italic: true, color: DGRAY }), fill: fill(LGRAY), alignment: lft, border: brd() });
            ws.getRow(r).height = 16;
            r++;
        }

        ws.getRow(r).height = 6;
        r++;

        // Photo Attachments
        ws.mergeCells(`A${r}:F${r}`);
        const photoHdr = ws.getCell(`A${r}`);
        photoHdr.value = 'PHOTO ATTACHMENTS';
        style(photoHdr, { font: font({ size: 10, bold: true, color: WHITE }), fill: fill(NAVY), alignment: lft, border: brdThick() });
        ws.getRow(r).height = 20;
        r++;

        const photoEntries = [
            ['Main Progress Photo', existingPhotoUrl],
            ['Team Photo 1', existingTeamPhoto1Url],
            ['Team Photo 2', existingTeamPhoto2Url],
        ];

        for (const [label, photoUrl] of photoEntries) {
            ws.mergeCells(`A${r}:B${r}`);
            ws.mergeCells(`C${r}:F${r}`);

            const lc = ws.getCell(`A${r}`);
            lc.value = label;
            style(lc, { font: font({ bold: true }), fill: fill(LGRAY), alignment: lft, border: brd() });

            const vc = ws.getCell(`C${r}`);
            if (photoUrl) {
                vc.value = '📸 Photo attached (see separate file)';
            } else {
                vc.value = '(no photo attached)';
            }
            style(vc, { font: font({ italic: true, color: DGRAY }), fill: fill(WHITE), alignment: lft, border: brd() });
            r++;
        }

        ws.getRow(r).height = 6;
        r++;

        // Footer
        ws.mergeCells(`A${r}:F${r}`);
        const footer = ws.getCell(`A${r}`);
        footer.value = `Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · Vision International Construction OPC`;
        style(footer, { font: font({ size: 8, italic: true, color: DGRAY }), fill: fill(LGRAY), alignment: ctr, border: brd() });
        ws.getRow(r).height = 14;

        ws.pageSetup = {
            paperSize: 9,
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        };

        const buf = await wb.xlsx.writeBuffer();
        const dateStr = new Date(currentLog.date + 'T00:00:00')
            .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            .replace(/ /g, '-');
        saveAs(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_DailyLog_${dateStr}.xlsx`
        );
    };

    if (loading) return <div className="im-loading">⏳ Loading logs...</div>;

    
    return (
        <div className="im-section">
            <div className="im-page-header">
                <div className="im-header-meta">
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Lead Installer', leadMan]].map(([l, v]) => (
                        <div key={l} className="im-header-field">
                            <span className="im-header-label">{l}</span>
                            <span className="im-header-value">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="im-header-actions">
                    <SaveIndicator status={saveStatus} />
                    <button className="im-btn im-btn-outline" onClick={exportExcel}>⬇️ Excel</button>
                    <button className="im-btn im-btn-navy" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save'}
                    </button>
                </div>
            </div>

            <div className="im-body">
                {error && <div className="im-error">⚠️ {error}</div>}

                <div className="im-top-row">
                    <div className="im-top-field">
                        <span className="im-input-label">Total Area Logged</span>
                        <input type="text" value={currentLog.totalArea}
                            onChange={e => setCurrentLog({ ...currentLog, totalArea: e.target.value })}
                            className="im-input" placeholder="e.g. 134 Lm" />
                    </div>
                    <div className="im-top-field im-top-remarks">
                        <span className="im-input-label">Status / Remarks</span>
                        <textarea value={currentLog.remarks}
                            onChange={e => setCurrentLog({ ...currentLog, remarks: e.target.value })}
                            className="im-textarea im-textarea-sm"
                            rows={2} placeholder="Describe current site status..." />
                    </div>
                    <div className="im-top-datepicker">
                        <span className="im-input-label">📅 Log Date</span>
                        <input type="date" value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="im-date-input-inline" />
                        <span className={`im-date-status ${logExists ? 'im-exists' : 'im-new'}`}>
                            {logExists ? '✅ Log exists' : '🆕 New entry'}
                        </span>
                    </div>
                </div>

                <div className="im-timeline-block">
                    <div className="im-block-header">
                        <span className="im-block-title">📅 Timeline Logs</span>
                    </div>
                    <div className="im-timeline-paired">
                        <div className="im-timeline-col">
                            <div className="im-input-group">
                                <span className="im-input-label">From Client — Start</span>
                                <input type="date" value={formatDateForInput(currentLog.clientStart)}
                                    onChange={e => setCurrentLog({ ...currentLog, clientStart: e.target.value })}
                                    className="im-input" />
                            </div>
                            <div className="im-input-group">
                                <span className="im-input-label">Actual Start</span>
                                <input type="date" value={formatDateForInput(currentLog.actualStart)}
                                    onChange={e => setCurrentLog({ ...currentLog, actualStart: e.target.value })}
                                    className="im-input im-input-actual" />
                            </div>
                        </div>
                        <div className="im-timeline-col">
                            <div className="im-input-group">
                                <span className="im-input-label">From Client — End</span>
                                <input type="date" value={formatDateForInput(currentLog.clientEnd)}
                                    onChange={e => setCurrentLog({ ...currentLog, clientEnd: e.target.value })}
                                    className="im-input" />
                            </div>
                            <div className="im-input-group">
                                <span className="im-input-label">Actual End</span>
                                <input type="date" value={formatDateForInput(currentLog.actualEnd)}
                                    onChange={e => setCurrentLog({ ...currentLog, actualEnd: e.target.value })}
                                    className="im-input im-input-actual" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="im-table-card">
                    <div className="im-table-toolbar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="im-table-title">👷 Installers — {formatDateForInput(selectedDate)}</span>
                            {roster.length > 0 && (
                                <span className="im-roster-badge">{roster.length} from roster</span>
                            )}
                        </div>
                        <button className="im-add-btn" onClick={addRow}>+ Add Row</button>
                    </div>
                    <div className="im-table-scroll">
                        <table className="im-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36, minWidth: 36 }}>#</th>
                                    <th className="im-th-left" style={{ minWidth: 120 }}>Name</th>
                                    <th className="im-th-left" style={{ minWidth: 100 }}>Position</th>
                                    <th style={{ minWidth: 80 }}>Time In</th>
                                    <th style={{ minWidth: 80 }}>Time Out</th>
                                    <th style={{ minWidth: 100 }}>Remarks</th>
                                    <th style={{ width: 36, minWidth: 36 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentLog.rows.map((row, idx) => (
                                    <tr key={row.id} className={row.name ? 'im-row-filled' : ''}>
                                        <td className="im-td-num">{idx + 1}</td>
                                        <td className="im-td-left">
                                            <input type="text" value={row.name}
                                                onChange={e => updateRow(row.id, 'name', e.target.value)}
                                                className="im-cell-input im-input-wide" placeholder="Full name" />
                                        </td>
                                        <td className="im-td-left">
                                            <select value={row.position}
                                                onChange={e => updateRow(row.id, 'position', e.target.value)}
                                                className="im-cell-select">
                                                <option value="">— Select —</option>
                                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="time" value={row.timeIn}
                                                onChange={e => updateRow(row.id, 'timeIn', e.target.value)}
                                                className="im-cell-input" />
                                        </td>
                                        <td>
                                            <input type="time" value={row.timeOut}
                                                onChange={e => updateRow(row.id, 'timeOut', e.target.value)}
                                                className="im-cell-input" />
                                        </td>
                                        <td>
                                            <input type="text" value={row.remarks}
                                                onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                                                className="im-cell-input im-input-wide" placeholder="Notes…" />
                                        </td>
                                        <td>
                                            <button className="im-remove-btn"
                                                onClick={() => removeRow(row.id)}
                                                disabled={currentLog.rows.length <= 1}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {roster.length > 0 && (
                        <div className="im-roster-summary">
                            {['Lead Installer', 'Installer', 'Helper', 'Supervisor'].map(pos => {
                                const count = roster.filter(r => r.position === pos).length;
                                return count > 0 ? (
                                    <span key={pos} className="im-roster-pill">{count} {pos}</span>
                                ) : null;
                            })}
                        </div>
                    )}
                </div>

                {/* Photo Uploads Section */}
                <div className="im-photo-section">
                    <div className="im-block-header">
                        <span className="im-block-title">📸 Photo Attachments</span>
                    </div>
                    <div className="im-photo-grid">
                        {/* Main Progress Photo */}
                        <div className="im-photo-item">
                            <span className="im-photo-label">Main Progress Photo</span>
                            
                            {existingPhotoUrl && !photoMain && (
                                <div className="im-existing-photo">
                                    <img 
                                        src={existingPhotoUrl} 
                                        alt="Existing main photo" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <button 
                                        className="im-change-photo-btn"
                                        onClick={() => {
                                            setExistingPhotoUrl(null);
                                            fileMainRef.current?.click();
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#C20100', cursor: 'pointer' }}
                                    >
                                        Change Photo
                                    </button>
                                </div>
                            )}
                            
                            {photoMain && (
                                <div className="im-new-photo">
                                    <img 
                                        src={URL.createObjectURL(photoMain)} 
                                        alt="New main photo" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <span className="im-file-name">{photoMain.name}</span>
                                    <button 
                                        className="im-remove-photo-btn"
                                        onClick={() => {
                                            setPhotoMain(null);
                                            if (fileMainRef.current) fileMainRef.current.value = '';
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            
                            {!existingPhotoUrl && !photoMain && (
                                <label className="im-upload-trigger">
                                    <span className="im-upload-icon">📎</span>
                                    <span className="im-upload-name">Click to choose image…</span>
                                    <input type="file" accept="image/*" ref={fileMainRef}
                                        onChange={e => setPhotoMain(e.target.files[0])}
                                        className="im-file-hidden" />
                                </label>
                            )}
                        </div>

                        {/* Team Photo 1 */}
                        <div className="im-photo-item">
                            <span className="im-photo-label">Team Photo 1</span>
                            
                            {existingTeamPhoto1Url && !photo1 && (
                                <div className="im-existing-photo">
                                    <img 
                                        src={existingTeamPhoto1Url} 
                                        alt="Existing team photo 1" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <button 
                                        className="im-change-photo-btn"
                                        onClick={() => {
                                            setExistingTeamPhoto1Url(null);
                                            file1Ref.current?.click();
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#C20100', cursor: 'pointer' }}
                                    >
                                        Change Photo
                                    </button>
                                </div>
                            )}
                            
                            {photo1 && (
                                <div className="im-new-photo">
                                    <img 
                                        src={URL.createObjectURL(photo1)} 
                                        alt="New team photo 1" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <span className="im-file-name">{photo1.name}</span>
                                    <button 
                                        className="im-remove-photo-btn"
                                        onClick={() => {
                                            setPhoto1(null);
                                            if (file1Ref.current) file1Ref.current.value = '';
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            
                            {!existingTeamPhoto1Url && !photo1 && (
                                <label className="im-upload-trigger">
                                    <span className="im-upload-icon">📎</span>
                                    <span className="im-upload-name">Click to choose image…</span>
                                    <input type="file" accept="image/*" ref={file1Ref}
                                        onChange={e => setPhoto1(e.target.files[0])}
                                        className="im-file-hidden" />
                                </label>
                            )}
                        </div>

                        {/* Team Photo 2 */}
                        <div className="im-photo-item">
                            <span className="im-photo-label">Team Photo 2</span>
                            
                            {existingTeamPhoto2Url && !photo2 && (
                                <div className="im-existing-photo">
                                    <img 
                                        src={existingTeamPhoto2Url} 
                                        alt="Existing team photo 2" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <button 
                                        className="im-change-photo-btn"
                                        onClick={() => {
                                            setExistingTeamPhoto2Url(null);
                                            file2Ref.current?.click();
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#C20100', cursor: 'pointer' }}
                                    >
                                        Change Photo
                                    </button>
                                </div>
                            )}
                            
                            {photo2 && (
                                <div className="im-new-photo">
                                    <img 
                                        src={URL.createObjectURL(photo2)} 
                                        alt="New team photo 2" 
                                        className="im-photo-preview"
                                        style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <span className="im-file-name">{photo2.name}</span>
                                    <button 
                                        className="im-remove-photo-btn"
                                        onClick={() => {
                                            setPhoto2(null);
                                            if (file2Ref.current) file2Ref.current.value = '';
                                        }}
                                        style={{ fontSize: '12px', marginTop: '5px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            
                            {!existingTeamPhoto2Url && !photo2 && (
                                <label className="im-upload-trigger">
                                    <span className="im-upload-icon">📎</span>
                                    <span className="im-upload-name">Click to choose image…</span>
                                    <input type="file" accept="image/*" ref={file2Ref}
                                        onChange={e => setPhoto2(e.target.files[0])}
                                        className="im-file-hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* History */}
                {allLogs.length > 0 && (
                    <div className="im-history">
                        <div className="im-history-header">
                            <div>
                                <span className="im-history-title">Log History</span>
                                <span className="im-history-count">{allLogs.length}</span>
                            </div>
                            <button className="im-toggle-btn" onClick={() => setShowHistory(!showHistory)}>
                                {showHistory ? 'Hide' : 'Show all'}
                            </button>
                        </div>
                        {showHistory && (
                            <div className="im-history-list">
                                {allLogs.map(l => (
                                    <div 
                                        key={l.id} 
                                        className="im-history-item"
                                        onClick={() => {
                                            const dateToSelect = l.log_date_formatted || (l.log_date ? l.log_date.split('T')[0] : l.log_date);
                                            setSelectedDate(dateToSelect);
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="im-history-date">{formatDateForInput(l.log_date)}</div>
                                            <div className="im-history-meta">
                                                {l.accomplishment_percent ?? 0}% · Area: {l.total_area ?? '—'}
                                            </div>
                                        </div>
                                        <span className="im-history-badge">View</span>
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