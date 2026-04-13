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

    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Daily Monitoring');
        const NAVY='FF1A1A2E',RED='FFFF1817',YELLOW='FFFFFF00',CREAM='FFEBDBD6',LGRAY='FFF2F2F2';
        const b=(sz=10)=>({bold:true,size:sz,name:'Arial'});
        const n=(sz=10)=>({bold:false,size:sz,name:'Arial'});
        const ctr={horizontal:'center',vertical:'middle',wrapText:true};
        const lft={horizontal:'left',vertical:'middle',wrapText:true};
        const fill=(c)=>({type:'pattern',pattern:'solid',fgColor:{argb:c}});
        const thin={style:'thin',color:{argb:'FF000000'}};
        const brd={top:thin,bottom:thin,left:thin,right:thin};
        ws.columns=[{width:6},{width:28},{width:14},{width:14},{width:22},{width:28}];
        let r=1;
        ws.mergeCells(`A${r}:F${r}`);
        ws.getCell(`A${r}`).value='VISION INTERNATIONAL CONSTRUCTION OPC\n"You Envision, We Build"';
        ws.getCell(`A${r}`).font={bold:true,size:13,name:'Arial',color:{argb:'FFFFFFFF'}};
        ws.getCell(`A${r}`).fill=fill(NAVY); ws.getCell(`A${r}`).alignment=ctr; ws.getCell(`A${r}`).border=brd;
        ws.getRow(r).height=40; r++;
        ws.mergeCells(`A${r}:F${r}`);
        ws.getCell(`A${r}`).value="INSTALLER'S DAILY MONITORING ON SITE";
        ws.getCell(`A${r}`).font=b(12); ws.getCell(`A${r}`).fill=fill(CREAM);
        ws.getCell(`A${r}`).alignment=ctr; ws.getCell(`A${r}`).border=brd;
        ws.getRow(r).height=22; r++;
        [['Project',projectName],['Location',location],['Requirement:',requirement],
         ['Installer (Lead Man):',leadMan],['Total Area:',currentLog.totalArea],
         ['Date:',new Date(currentLog.date+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})]
        ].forEach(([lbl,val])=>{
            ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`C${r}:F${r}`);
            ws.getCell(`A${r}`).value=lbl; ws.getCell(`A${r}`).font=b(); ws.getCell(`A${r}`).alignment=lft; ws.getCell(`A${r}`).border=brd;
            ws.getCell(`C${r}`).value=val; ws.getCell(`C${r}`).font=n(); ws.getCell(`C${r}`).alignment=lft; ws.getCell(`C${r}`).border=brd;
            ws.getRow(r).height=18; r++;
        });
        r++;
        const buf=await wb.xlsx.writeBuffer();
        const dateStr=new Date(currentLog.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}).replace(/ /g,'-');
        saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
            `${projectName}_DailyLog_${dateStr}.xlsx`);
    };

    if (loading) return <div className="mon-loading">⏳ Loading logs...</div>;

    return (
        <div className="mon-section">
            {/* Header */}
            <div className="mon-page-header">
                <div className="mon-header-meta">
                    {[['Project',projectName],['Location',location],
                      ['Requirement',requirement],['Lead Installer',leadMan]].map(([l,v]) => (
                        <div key={l} className="mon-header-field">
                            <span className="mon-header-label">{l}</span>
                            <span className="mon-header-value">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mon-header-actions">
                    {/* Auto-save indicator sits next to the buttons */}
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
                            {['Lead Installer','Installer','Helper','Supervisor'].map(pos => {
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
                        {[['Main Progress Photo',photoMain,setPhotoMain,fileMainRef],
                          ['Team Photo 1',photo1,setPhoto1,file1Ref],
                          ['Team Photo 2',photo2,setPhoto2,file2Ref]].map(([label,state,setter,ref]) => (
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