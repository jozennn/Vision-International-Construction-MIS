// src/phases/SiteInspectionReport.jsx
import React, { useRef, useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useSiteInspectionReport } from '../hooks/useSiteInspectionReport.js';
import { resolveRoster } from '../hooks/useInstallerMonitoring.js';
import '../css/CommandCenter.css';

// Save Indicator Component
const SaveIndicator = ({ status }) => {
    if (!status) return null;
    const styles = {
        saving: { color: '#6b7280', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
        saved:  { color: '#16a34a', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
        error:  { color: '#dc2626', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
    };
    const labels = { 
        saving: <><span className="cc-saving-dot" /> Saving…</>, 
        saved:  <>✓ Auto-saved</>, 
        error:  <>✗ Auto-save failed</> 
    };
    return <span style={styles[status]}>{labels[status]}</span>;
};

const SiteInspectionReport = ({ project, user }) => {
    const {
        selectedDate,
        setSelectedDate,
        currentReport,
        availableDates,
        loading,
        saving,
        saveStatus,
        error,
        updateReport,
        addProblem,
        removeProblem,
        updateProblem,
        saveInspection,
    } = useSiteInspectionReport(project?.id, project?.location, user?.id, project);

    const [photoFile, setPhotoFile] = useState(null);
    const photoRef = useRef();

    const projectName = project?.project_name ?? '';
    const location    = project?.location     ?? '';
    const requirement = project?.project_type ?? '';

    const roster  = resolveRoster(project);
    const leadMan = roster.find(i => i.position === 'Lead Installer')?.name
                 ?? roster[0]?.name
                 ?? '—';

    const currentDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    const hasExistingReport = availableDates.includes(selectedDate);

    const handleSave = async () => {
        try {
            await saveInspection({ photoFile });
            setPhotoFile(null);
            if (photoRef.current) photoRef.current.value = '';
        } catch {}
    };

    // ── Professional Excel Export ──────────────────────────────────────────
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Site Inspection Report');
        
        const NAVY = 'FF1A365D';
        const GOLD = 'FFD69E2E';
        const LGREEN = 'FFC6F6D5';
        const LRED = 'FFFED7D7';
        const LGRAY = 'FFF3F4F6';
        const WHITE = 'FFFFFFFF';
        const DARK = 'FF1F2937';
        
        const thin = { style: 'thin', color: { argb: 'FFD1D5DB' } };
        const thick = { style: 'medium', color: { argb: NAVY } };
        const allB = { top: thin, bottom: thin, left: thin, right: thin };
        const allThick = { top: thick, bottom: thick, left: thick, right: thick };
        
        const fill = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
        const ctr = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const lft = { horizontal: 'left', vertical: 'middle', wrapText: true };
        const top = { horizontal: 'left', vertical: 'top', wrapText: true };
        
        const bold = (sz = 11) => ({ bold: true, name: 'Calibri', size: sz });
        const norm = (sz = 10) => ({ bold: false, name: 'Calibri', size: sz });
        
        ws.columns = [{ width: 28 }, { width: 55 }];
        
        let r = 1;
        
        // Header
        ws.mergeCells(`A${r}:B${r}`);
        const headerCell = ws.getCell(`A${r}`);
        headerCell.value = 'VISION INTERNATIONAL CONSTRUCTION OPC';
        headerCell.font = { bold: true, size: 16, name: 'Calibri', color: { argb: WHITE } };
        headerCell.fill = fill(NAVY);
        headerCell.alignment = ctr;
        headerCell.border = allThick;
        ws.getRow(r).height = 35;
        r++;
        
        ws.mergeCells(`A${r}:B${r}`);
        const subtitleCell = ws.getCell(`A${r}`);
        subtitleCell.value = 'SITE INSPECTION REPORT';
        subtitleCell.font = { bold: true, size: 13, name: 'Calibri', color: { argb: DARK } };
        subtitleCell.fill = fill(GOLD);
        subtitleCell.alignment = ctr;
        subtitleCell.border = allB;
        ws.getRow(r).height = 25;
        r += 2;
        
        // Project Info
        const infoRows = [
            ['Project Name:', projectName],
            ['Location:', location],
            ['Project Requirement:', requirement],
            ['Lead Installer:', leadMan],
            ['Inspection Date:', new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })],
            ['Inspection Time:', currentReport.time],
        ];
        
        infoRows.forEach(([label, value]) => {
            ws.getCell(`A${r}`).value = label;
            ws.getCell(`A${r}`).font = bold(11);
            ws.getCell(`A${r}`).fill = fill(LGRAY);
            ws.getCell(`A${r}`).alignment = lft;
            ws.getCell(`A${r}`).border = allB;
            
            ws.getCell(`B${r}`).value = value || '—';
            ws.getCell(`B${r}`).font = norm(11);
            ws.getCell(`B${r}`).alignment = lft;
            ws.getCell(`B${r}`).border = allB;
            
            ws.getRow(r).height = 22;
            r++;
        });
        r++;
        
        // Personnel
        ws.getCell(`A${r}`).value = 'Prepared By:';
        ws.getCell(`A${r}`).font = bold(11);
        ws.getCell(`A${r}`).fill = fill(LGRAY);
        ws.getCell(`A${r}`).alignment = lft;
        ws.getCell(`A${r}`).border = allB;
        
        ws.getCell(`B${r}`).value = `${currentReport.preparedBy || '—'} (${currentReport.position || 'Engineer'})`;
        ws.getCell(`B${r}`).font = norm(11);
        ws.getCell(`B${r}`).alignment = lft;
        ws.getCell(`B${r}`).border = allB;
        ws.getRow(r).height = 22;
        r++;
        
        ws.getCell(`A${r}`).value = 'Checked By (Project Manager):';
        ws.getCell(`A${r}`).font = bold(11);
        ws.getCell(`A${r}`).fill = fill(LGRAY);
        ws.getCell(`A${r}`).alignment = lft;
        ws.getCell(`A${r}`).border = allB;
        
        ws.getCell(`B${r}`).value = currentReport.checkedBy || '—';
        ws.getCell(`B${r}`).font = norm(11);
        ws.getCell(`B${r}`).alignment = lft;
        ws.getCell(`B${r}`).border = allB;
        ws.getRow(r).height = 22;
        r += 2;
        
        // Observation
        ws.mergeCells(`A${r}:B${r}`);
        const obsHeader = ws.getCell(`A${r}`);
        obsHeader.value = '📋 SITE OBSERVATION';
        obsHeader.font = bold(12);
        obsHeader.fill = fill(LGREEN);
        obsHeader.alignment = lft;
        obsHeader.border = allB;
        ws.getRow(r).height = 25;
        r++;
        
        ws.mergeCells(`A${r}:B${r + 5}`);
        const obsCell = ws.getCell(`A${r}`);
        obsCell.value = currentReport.observation || 'No observations recorded.';
        obsCell.font = norm(11);
        obsCell.alignment = top;
        obsCell.border = allB;
        for (let i = 0; i <= 5; i++) ws.getRow(r + i).height = 22;
        r += 6;
        r++;
        
        // Problems & Solutions
        if (currentReport.problems.length > 0) {
            ws.mergeCells(`A${r}:B${r}`);
            const psHeader = ws.getCell(`A${r}`);
            psHeader.value = '⚠️ PROBLEMS ENCOUNTERED & SOLUTIONS';
            psHeader.font = bold(12);
            psHeader.fill = fill(LRED);
            psHeader.alignment = ctr;
            psHeader.border = allB;
            ws.getRow(r).height = 25;
            r++;
            
            currentReport.problems.forEach((p, idx) => {
                ws.getCell(`A${r}`).value = `Problem ${idx + 1}:`;
                ws.getCell(`A${r}`).font = bold(10);
                ws.getCell(`A${r}`).fill = fill('FFDBEAFE');
                ws.getCell(`A${r}`).alignment = lft;
                ws.getCell(`A${r}`).border = allB;
                
                ws.getCell(`B${r}`).value = p.problem || '—';
                ws.getCell(`B${r}`).font = norm(10);
                ws.getCell(`B${r}`).alignment = lft;
                ws.getCell(`B${r}`).border = allB;
                ws.getRow(r).height = 20;
                r++;
                
                ws.getCell(`A${r}`).value = `Solution ${idx + 1}:`;
                ws.getCell(`A${r}`).font = bold(10);
                ws.getCell(`A${r}`).fill = fill(LGREEN);
                ws.getCell(`A${r}`).alignment = lft;
                ws.getCell(`A${r}`).border = allB;
                
                ws.getCell(`B${r}`).value = p.solution || '—';
                ws.getCell(`B${r}`).font = norm(10);
                ws.getCell(`B${r}`).alignment = lft;
                ws.getCell(`B${r}`).border = allB;
                ws.getRow(r).height = 20;
                r++;
                
                if (idx < currentReport.problems.length - 1) {
                    ws.getRow(r).height = 8;
                    r++;
                }
            });
        } else {
            ws.mergeCells(`A${r}:B${r}`);
            const noPsCell = ws.getCell(`A${r}`);
            noPsCell.value = '✅ No problems were encountered during this inspection.';
            noPsCell.font = { ...norm(11), italic: true };
            noPsCell.fill = fill(LGREEN);
            noPsCell.alignment = ctr;
            noPsCell.border = allB;
            ws.getRow(r).height = 30;
            r++;
        }
        r++;
        
        // Signatures
        ws.mergeCells(`A${r}:B${r}`);
        const sigHeader = ws.getCell(`A${r}`);
        sigHeader.value = 'SIGNATURES';
        sigHeader.font = bold(11);
        sigHeader.fill = fill(LGRAY);
        sigHeader.alignment = ctr;
        sigHeader.border = allB;
        ws.getRow(r).height = 22;
        r++;
        
        ws.getCell(`A${r}`).value = 'Prepared By:';
        ws.getCell(`A${r}`).font = norm(10);
        ws.getCell(`A${r}`).alignment = lft;
        ws.getCell(`A${r}`).border = { ...allB, bottom: thin };
        
        ws.getCell(`B${r}`).value = '__________________________';
        ws.getCell(`B${r}`).font = norm(10);
        ws.getCell(`B${r}`).alignment = ctr;
        ws.getCell(`B${r}`).border = { ...allB, bottom: thin };
        ws.getRow(r).height = 25;
        r++;
        
        ws.getCell(`A${r}`).value = '';
        ws.getCell(`A${r}`).border = allB;
        ws.getCell(`B${r}`).value = `${currentReport.preparedBy || 'Inspector'}`;
        ws.getCell(`B${r}`).font = { ...norm(9), italic: true };
        ws.getCell(`B${r}`).alignment = ctr;
        ws.getCell(`B${r}`).border = allB;
        ws.getRow(r).height = 18;
        r += 2;
        
        ws.getCell(`A${r}`).value = 'Checked By:';
        ws.getCell(`A${r}`).font = norm(10);
        ws.getCell(`A${r}`).alignment = lft;
        ws.getCell(`A${r}`).border = { ...allB, bottom: thin };
        
        ws.getCell(`B${r}`).value = '__________________________';
        ws.getCell(`B${r}`).font = norm(10);
        ws.getCell(`B${r}`).alignment = ctr;
        ws.getCell(`B${r}`).border = { ...allB, bottom: thin };
        ws.getRow(r).height = 25;
        r++;
        
        ws.getCell(`A${r}`).value = '';
        ws.getCell(`A${r}`).border = allB;
        ws.getCell(`B${r}`).value = `${currentReport.checkedBy || 'Project Manager'}`;
        ws.getCell(`B${r}`).font = { ...norm(9), italic: true };
        ws.getCell(`B${r}`).alignment = ctr;
        ws.getCell(`B${r}`).border = allB;
        ws.getRow(r).height = 18;
        r += 2;
        
        // Footer
        ws.mergeCells(`A${r}:B${r}`);
        const footerCell = ws.getCell(`A${r}`);
        footerCell.value = `Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        })} | VICMIS Construction Management System`;
        footerCell.font = { ...norm(8), italic: true, color: { argb: 'FF6B7280' } };
        footerCell.alignment = ctr;
        ws.getRow(r).height = 20;
        
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_SiteInspection_${selectedDate}.xlsx`);
    };

    if (loading) return <div className="cc-loading">Loading inspection data...</div>;

    return (
        <div className="cc-section" style={{ minWidth: 0, width: '100%', overflowX: 'hidden' }}>
            {error && <div className="pm-card-red"><p className="pm-text-muted">{error}</p></div>}

            {/* Project Meta */}
            <div className="pm-card-gray cc-insp-meta" style={{ width: '100%', padding: '16px', overflow: 'hidden' }}>
                <div className="cc-meta-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Lead Installer', leadMan]].map(([l, v]) => (
                        <div key={l} style={{ minWidth: 0 }}>
                            <span className="cc-meta-label" style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>{l}</span>
                            <span className="cc-meta-value" style={{ display: 'block', fontWeight: 600, wordBreak: 'break-word' }}>{v || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Date Selector with Save Status */}
            <div className="cc-date-selector-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div className="cc-date-selector-group" style={{ flex: '1 1 min-content' }}>
                    <label className="pm-label">📅 Inspection Date</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="pm-input"
                            style={{ width: '100%', maxWidth: '200px' }}
                        />
                        <span className={`cc-date-status ${hasExistingReport ? 'exists' : 'new'}`}>
                            {hasExistingReport ? '✅ Report exists' : '🆕 New report'}
                        </span>
                        <SaveIndicator status={saveStatus} />
                    </div>
                </div>
                <div className="cc-date-hint" style={{ width: '100%' }}>
                    Showing report for {currentDateLabel}
                </div>
            </div>

            {/* Available Dates Chips */}
            {availableDates.length > 0 && (
                <div className="cc-available-dates" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span className="cc-dates-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>📋 Saved reports:</span>
                    <div className="cc-dates-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {availableDates.map(date => (
                            <button
                                key={date}
                                className={`cc-date-chip ${date === selectedDate ? 'active' : ''}`}
                                onClick={() => setSelectedDate(date)}
                                style={{ padding: '4px 10px', borderRadius: '16px', border: '1px solid #ccc', background: date === selectedDate ? '#e0f2fe' : '#fff', cursor: 'pointer' }}
                            >
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Form Meta */}
            <div className="cc-insp-form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', margin: '16px 0' }}>
                <div>
                    <label className="pm-label">Inspection Time</label>
                    <input 
                        type="time" 
                        value={currentReport.time}
                        onChange={e => updateReport('time', e.target.value)}
                        className="pm-input" 
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label className="pm-label">Prepared By</label>
                    <input 
                        type="text" 
                        value={currentReport.preparedBy}
                        onChange={e => updateReport('preparedBy', e.target.value)}
                        className="pm-input" 
                        placeholder="Inspector name" 
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label className="pm-label">Position</label>
                    <input 
                        type="text" 
                        value={currentReport.position}
                        onChange={e => updateReport('position', e.target.value)}
                        className="pm-input" 
                        placeholder="Position" 
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label className="pm-label">Checked By (Project Manager)</label>
                    <input 
                        type="text" 
                        value={currentReport.checkedBy}
                        onChange={e => updateReport('checkedBy', e.target.value)}
                        className="pm-input" 
                        placeholder="PM name" 
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Observation */}
            <div className="cc-insp-block">
                <div className="cc-insp-block-header cc-insp-header-green">📋 OBSERVATION</div>
                <textarea
                    value={currentReport.observation}
                    onChange={e => updateReport('observation', e.target.value)}
                    className="pm-textarea cc-insp-textarea"
                    rows={6}
                    style={{ width: '100%' }}
                    placeholder="Describe site observation, conditions, scope of work completed..." />
            </div>

            {/* Problem / Solution */}
            <div className="cc-insp-block" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#f9fafb' }}>
                {currentReport.problems.length === 0 && (
                    <div className="cc-insp-empty-state">
                        No problems logged yet. Click below to add one.
                    </div>
                )}

                {currentReport.problems.map((p, idx) => (
                    <div key={p.id} className="cc-insp-ps-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #d1d5db' }}>
                        <div style={{ fontWeight: 'bold' }}>Problem {idx + 1}</div>
                        <textarea
                            value={p.problem}
                            onChange={e => updateProblem(p.id, 'problem', e.target.value)}
                            className="pm-textarea cc-insp-ps-area"
                            rows={3}
                            style={{ width: '100%' }}
                            placeholder="Describe the problem encountered on site..." />
                        <textarea
                            value={p.solution}
                            onChange={e => updateProblem(p.id, 'solution', e.target.value)}
                            className="pm-textarea cc-insp-ps-area"
                            rows={3}
                            style={{ width: '100%' }}
                            placeholder="Describe the solution or corrective action taken..." />
                        <button
                            className="cc-remove-btn cc-ps-remove"
                            style={{ alignSelf: 'flex-end', padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => removeProblem(p.id)}>✕ Remove</button>
                    </div>
                ))}

                <button className="cc-add-problem-btn" onClick={addProblem} style={{ width: '100%', padding: '10px', background: '#e0f2fe', color: '#0284c7', border: '1px dashed #bae6fd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Add Problem / Solution Row
                </button>
            </div>

            {/* Photo */}
            <div className="pm-card-gray cc-insp-photo-block" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="pm-label">📸 Site Photo (optional)</label>
                <label className={`cc-upload-zone ${photoFile ? 'cc-upload-has-file' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1.5px dashed #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', wordBreak: 'break-word' }}>
                    <span className="cc-upload-icon">{photoFile ? '✅' : '📎'}</span>
                    <span>{photoFile ? photoFile.name : 'Click to choose inspection photo'}</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={photoRef}
                        onChange={e => setPhotoFile(e.target.files[0])}
                        className="cc-file-hidden" 
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {/* Actions */}
            <div className="cc-action-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                <PrimaryButton variant="navy" onClick={handleSave} disabled={saving} style={{ flex: '1 1 140px' }}>
                    {saving ? 'Saving...' : '💾 Save Report'}
                </PrimaryButton>
                <button className="pm-btn-success-sm" onClick={exportExcel} style={{ flex: '1 1 140px', padding: '10px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', borderRadius: '6px' }}>
                    ⬇️ Download Excel
                </button>
            </div>
        </div>
    );
};

export default SiteInspectionReport;