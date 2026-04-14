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
        availableDates,  // 👈 ADDED THIS
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

    const hasExistingReport = availableDates.includes(selectedDate); // 👈 Check if report exists

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
        <div className="cc-section">
            {error && <div className="pm-card-red"><p className="pm-text-muted">{error}</p></div>}

            {/* Project Meta */}
            <div className="pm-card-gray cc-insp-meta">
                <div className="cc-meta-grid-4">
                    {[['Project', projectName], ['Location', location],
                      ['Requirement', requirement], ['Lead Installer', leadMan]].map(([l, v]) => (
                        <div key={l}>
                            <span className="cc-meta-label">{l}</span>
                            <span className="cc-meta-value">{v || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Date Selector with Save Status */}
            <div className="cc-date-selector-row">
                <div className="cc-date-selector-group">
                    <label className="pm-label">📅 Inspection Date</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="pm-input"
                            style={{ width: '180px' }}
                        />
                        <span className={`cc-date-status ${hasExistingReport ? 'exists' : 'new'}`}>
                            {hasExistingReport ? '✅ Report exists' : '🆕 New report'}
                        </span>
                        <SaveIndicator status={saveStatus} />
                    </div>
                </div>
                <div className="cc-date-hint">
                    Showing report for {currentDateLabel}
                </div>
            </div>

            {/* 👇 ADDED: Available Dates Chips */}
            {availableDates.length > 0 && (
                <div className="cc-available-dates">
                    <span className="cc-dates-label">📋 Saved reports:</span>
                    <div className="cc-dates-chips">
                        {availableDates.map(date => (
                            <button
                                key={date}
                                className={`cc-date-chip ${date === selectedDate ? 'active' : ''}`}
                                onClick={() => setSelectedDate(date)}
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
            <div className="cc-insp-form-row">
                <div>
                    <label className="pm-label">Inspection Time</label>
                    <input 
                        type="time" 
                        value={currentReport.time}
                        onChange={e => updateReport('time', e.target.value)}
                        className="pm-input" 
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
                    placeholder="Describe site observation, conditions, scope of work completed..." />
            </div>

            {/* Problem / Solution */}
            <div className="cc-insp-block">
                <div className="cc-insp-ps-header">
                    <div className="cc-insp-block-header cc-insp-header-red cc-insp-col-header">
                        ⚠️ PROBLEM ENCOUNTERED
                    </div>
                    <div className="cc-insp-block-header cc-insp-header-green cc-insp-col-header">
                        ✅ SOLUTION
                    </div>
                </div>

                {currentReport.problems.length === 0 && (
                    <div className="cc-insp-empty-state">
                        No problems logged yet. Click below to add one.
                    </div>
                )}

                {currentReport.problems.map((p, idx) => (
                    <div key={p.id} className="cc-insp-ps-row">
                        <div className="cc-insp-ps-num">{idx + 1}</div>
                        <textarea
                            value={p.problem}
                            onChange={e => updateProblem(p.id, 'problem', e.target.value)}
                            className="pm-textarea cc-insp-ps-area"
                            rows={4}
                            placeholder="Describe the problem encountered on site..." />
                        <textarea
                            value={p.solution}
                            onChange={e => updateProblem(p.id, 'solution', e.target.value)}
                            className="pm-textarea cc-insp-ps-area"
                            rows={4}
                            placeholder="Describe the solution or corrective action taken..." />
                        <button
                            className="cc-remove-btn cc-ps-remove"
                            onClick={() => removeProblem(p.id)}>✕</button>
                    </div>
                ))}

                <button className="cc-add-problem-btn" onClick={addProblem}>
                    + Add Problem / Solution Row
                </button>
            </div>

            {/* Photo */}
            <div className="pm-card-gray cc-insp-photo-block">
                <label className="pm-label">📸 Site Photo (optional)</label>
                <label className={`cc-upload-zone ${photoFile ? 'cc-upload-has-file' : ''}`}>
                    <span className="cc-upload-icon">{photoFile ? '✅' : '📎'}</span>
                    <span>{photoFile ? photoFile.name : 'Click to choose inspection photo'}</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={photoRef}
                        onChange={e => setPhotoFile(e.target.files[0])}
                        className="cc-file-hidden" 
                    />
                </label>
            </div>

            {/* Actions */}
            <div className="cc-action-row">
                <PrimaryButton variant="navy" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save Report'}
                </PrimaryButton>
                <button className="pm-btn-success-sm" onClick={exportExcel}>
                    ⬇️ Download Excel
                </button>
            </div>
        </div>
    );
};

export default SiteInspectionReport;