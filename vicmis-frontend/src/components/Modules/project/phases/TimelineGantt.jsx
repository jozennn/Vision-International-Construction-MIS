// src/phases/TimelineGantt.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useTimelineGantt, fmtDate, parseDate } from '../hooks/useTimelineGantt.js';
import '../css/TimelineGantt.css';

const TimelineGantt = ({ project, trackingData }) => {
    const {
        tasks, ganttDates,
        projectStart, projectEnd, projectDuration,
        saving, saveSuccess, error,
        addTask, addGroup, removeTask, updateTask, toggleActual,
        saveTimeline,
    } = useTimelineGantt(project?.id, trackingData);

    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Timeline');
        const NAVY = 'FF1A1A2E', RED = 'FFFF1817', GREEN = 'FF16A34A', LGRAY = 'FFF1F5F9';
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allB = { top: thin, bottom: thin, left: thin, right: thin };
        const fill = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
        const ctr  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft  = { horizontal: 'left',   vertical: 'middle', wrapText: true };
        ws.columns = [
            { width: 30 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 8 }, { width: 8 },
            ...ganttDates.map(() => ({ width: 4 })),
        ];
        let r = 1;
        ['PROJECT NAME','PROJECT DURATION','PROJECT START DATE','PROJECT END DATE','DATE AS OF',''].forEach((h,ci)=>{
            const c=ws.getCell(r,ci+1); c.value=h; c.font={bold:true,size:9,name:'Arial',color:{argb:'FFFFFFFF'}};
            c.fill=fill(NAVY); c.alignment=ctr; c.border=allB;
        });
        ws.getRow(r).height=24; r++;
        [project.project_name,`${projectDuration}`,projectStart??'',projectEnd??'',new Date().toLocaleDateString('en-US'),''].forEach((v,ci)=>{
            const c=ws.getCell(r,ci+1); c.value=v; c.font={bold:true,size:10,name:'Arial'}; c.alignment=ctr; c.border=allB;
        });
        ws.getRow(r).height=20; r+=2;
        ['TASK NAME','START DATE','END DATE','DURATION*','UNIT','PERCENT\nCOMPLETE'].forEach((h,ci)=>{
            const c=ws.getCell(r,ci+1); c.value=h; c.font={bold:true,size:9,name:'Arial',color:{argb:'FFFFFFFF'}};
            c.fill=fill(NAVY); c.alignment=ctr; c.border=allB;
        });
        ganttDates.forEach((d,di)=>{
            const c=ws.getCell(r,7+di); c.value=fmtDate(d); c.font={bold:true,size:7,name:'Arial',color:{argb:'FFFFFFFF'}};
            c.fill=fill(NAVY); c.alignment=ctr; c.border=allB;
        });
        ws.getRow(r).height=22; r++;
        tasks.forEach(t=>{
            if(t.type==='group'){
                for(let ci=1;ci<=6+ganttDates.length;ci++){
                    const c=ws.getCell(r,ci); if(ci===1)c.value=t.name;
                    c.font={bold:true,size:10,name:'Arial'}; c.fill=fill(LGRAY); c.border=allB; c.alignment=ci===1?lft:ctr;
                }
                ws.getRow(r).height=18; r++;
            }else{
                [t.name,t.start,t.end,t.duration??'',t.unit,`${t.percent??0}%`].forEach((v,ci)=>{
                    const c=ws.getCell(r,ci+1); c.value=v; c.font={name:'Arial',size:9}; c.border=allB; c.alignment=ci===0?lft:ctr;
                });
                const ts=parseDate(t.start),te=parseDate(t.end);
                ganttDates.forEach((d,di)=>{
                    const c=ws.getCell(r,7+di); const inR=ts&&te&&d>=ts&&d<=te;
                    c.value=inR?'TARGET':''; c.font={bold:true,size:6,name:'Arial',color:{argb:'FFFFFFFF'}};
                    c.fill=inR?fill(RED):{type:'pattern',pattern:'none'}; c.alignment=ctr; c.border=allB;
                });
                ws.getRow(r).height=16; r++;
                for(let ci=1;ci<=6;ci++){ws.getCell(r,ci).border=allB;}
                ganttDates.forEach((d,di)=>{
                    const dStr=d.toISOString().split('T')[0]; const c=ws.getCell(r,7+di); const done=t.actualDates?.[dStr];
                    c.value=done?'ACTUAL':''; c.font={bold:true,size:6,name:'Arial',color:{argb:'FFFFFFFF'}};
                    c.fill=done?fill(GREEN):{type:'pattern',pattern:'none'}; c.alignment=ctr; c.border=allB;
                });
                ws.getRow(r).height=16; r++;
            }
        });
        r++; ws.getCell(r,1).value='PROJECT DURATION'; ws.getCell(r,2).value=projectDuration;
        [1,2].forEach(ci=>{
            ws.getCell(r,ci).font={bold:true,size:10,name:'Arial',color:{argb:'FFFFFFFF'}};
            ws.getCell(r,ci).fill=fill(NAVY); ws.getCell(r,ci).border=allB; ws.getCell(r,ci).alignment=ctr;
        });
        ws.getRow(r).height=20;
        const buf=await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${project.project_name}_Timeline.xlsx`);
    };

    return (
        <div className="tg-section">
            {error       && <div className="tg-error">⚠️ {error}</div>}
            {saveSuccess && <div className="tg-success">✅ Timeline saved successfully!</div>}

            {/* Summary — 2×2 mobile, 4-col tablet+ via CSS */}
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
                    {saving ? 'Saving...' : '💾 Save'}
                </button>
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
                                            className="tg-input group-input" placeholder="Section name..." />
                                    </td>
                                    <td><button className="tg-remove-btn" onClick={() => removeTask(t.id)}>✕</button></td>
                                </tr>
                            ) : (
                                <tr key={t.id}>
                                    <td className="td-left">
                                        <input type="text" value={t.name}
                                            onChange={e => updateTask(t.id, 'name', e.target.value)}
                                            className="tg-input" placeholder="Task..." />
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