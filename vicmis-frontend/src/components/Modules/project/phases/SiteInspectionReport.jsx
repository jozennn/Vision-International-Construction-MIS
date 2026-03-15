// src/phases/SiteInspectionReport.jsx
import React, { useRef, useState } from 'react';
import PrimaryButton from '../components/PrimaryButton.jsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useSiteInspectionReport } from '../hooks/useSiteInspectionReport.js';
import { resolveRoster } from '../hooks/useInstallerMonitoring.js';
import '../css/CommandCenter.css';

const SiteInspectionReport = ({ project, user }) => {
    const {
        report, loading, saving, error,
        updateReport,
        addProblem, removeProblem, updateProblem,
        saveInspection,
    } = useSiteInspectionReport(project?.id, user?.id);

    const [photoFile, setPhotoFile] = useState(null);
    const photoRef = useRef();

    const projectName = project?.project_name ?? '';
    const location    = project?.location     ?? '';
    const requirement = project?.project_type ?? '';

    // ── Lead Installer from mobilization roster (same source as InstallerMonitoring)
    const roster  = resolveRoster(project);
    const leadMan = roster.find(i => i.position === 'Lead Installer')?.name
                 ?? roster[0]?.name
                 ?? '—';

    const handleSave = async () => {
        try {
            await saveInspection({ photoFile });
            setPhotoFile(null);
            if (photoRef.current) photoRef.current.value = '';
        } catch {}
    };

    // ── Excel Export ──────────────────────────────────────────────────────
    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Site Inspection');
        const LGREEN = 'FFD6E4BC';
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allB = { top: thin, bottom: thin, left: thin, right: thin };
        const fillG = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGREEN } };
        const bold  = { bold: true,  name: 'Arial', size: 10 };
        const norm  = { bold: false, name: 'Arial', size: 10 };
        const ctr   = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const left  = { horizontal: 'left',   vertical: 'middle', wrapText: true };
        const top   = { horizontal: 'left',   vertical: 'top',    wrapText: true };

        ws.columns = [{ width: 28 }, { width: 50 }];
        let r = 1;

        ws.mergeCells(`A${r}:B${r}`);
        Object.assign(ws.getCell(`A${r}`), {
            value: 'SITE INSPECTION',
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } },
            alignment: ctr, border: allB,
        });
        ws.getCell(`A${r}`).font = { bold: true, size: 14, name: 'Arial' };
        ws.getRow(r).height = 26; r++;

        [['Project', projectName], ['Location', location], ['Requirement:', requirement],
         ['Installer (Lead Man):', leadMan],
         ['Date:', new Date(report.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })]
        ].forEach(([lbl, val]) => {
            Object.assign(ws.getCell(`A${r}`), { value: lbl, alignment: left, border: allB }); ws.getCell(`A${r}`).font = bold;
            Object.assign(ws.getCell(`B${r}`), { value: val, alignment: left, border: allB }); ws.getCell(`B${r}`).font = norm;
            ws.getRow(r).height = 18; r++;
        });
        r++;

        Object.assign(ws.getCell(`A${r}`), { value: 'Prepared By:', alignment: left, border: allB }); ws.getCell(`A${r}`).font = bold;
        Object.assign(ws.getCell(`B${r}`), { value: report.preparedBy, alignment: left, border: allB }); ws.getCell(`B${r}`).font = norm;
        ws.getRow(r).height = 18; r++;
        Object.assign(ws.getCell(`A${r}`), { value: 'Checked By:', alignment: left, border: allB }); ws.getCell(`A${r}`).font = bold;
        Object.assign(ws.getCell(`B${r}`), { value: report.checkedBy, alignment: left, border: allB }); ws.getCell(`B${r}`).font = norm;
        ws.getRow(r).height = 18; r++;
        r++;

        ws.mergeCells(`A${r}:B${r}`);
        Object.assign(ws.getCell(`A${r}`), { value: 'OBSERVATION', fill: fillG, alignment: left, border: allB });
        ws.getCell(`A${r}`).font = { bold: true, size: 11, name: 'Arial' };
        ws.getRow(r).height = 20; r++;

        ws.mergeCells(`A${r}:B${r + 5}`);
        Object.assign(ws.getCell(`A${r}`), { value: report.observation, alignment: top, border: allB });
        ws.getCell(`A${r}`).font = norm;
        for (let i = 0; i <= 5; i++) ws.getRow(r + i).height = 20;
        r += 6; r++;

        if (report.problems.length > 0) {
            Object.assign(ws.getCell(`A${r}`), { value: 'PROBLEM ENCOUNTERED', fill: fillG, alignment: left, border: allB });
            ws.getCell(`A${r}`).font = { bold: true, size: 10, name: 'Arial' };
            Object.assign(ws.getCell(`B${r}`), { value: 'SOLUTION', fill: fillG, alignment: left, border: allB });
            ws.getCell(`B${r}`).font = { bold: true, size: 10, name: 'Arial' };
            ws.getRow(r).height = 20; r++;

            report.problems.forEach(p => {
                ws.mergeCells(`A${r}:A${r + 4}`); ws.mergeCells(`B${r}:B${r + 4}`);
                Object.assign(ws.getCell(`A${r}`), { value: p.problem,  alignment: top, border: allB }); ws.getCell(`A${r}`).font = norm;
                Object.assign(ws.getCell(`B${r}`), { value: p.solution, alignment: top, border: allB }); ws.getCell(`B${r}`).font = norm;
                for (let i = 0; i < 5; i++) ws.getRow(r + i).height = 18;
                r += 5;
            });
        }

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${projectName}_SiteInspection_${report.date}.xlsx`);
    };

    if (loading) return <div className="cc-loading">Loading inspection...</div>;

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

            {/* Form Meta */}
            <div className="cc-insp-form-row">
                <div>
                    <label className="pm-label">Inspection Date</label>
                    <input type="date" value={report.date}
                        onChange={e => updateReport('date', e.target.value)}
                        className="pm-input" />
                </div>
                <div>
                    <label className="pm-label">Prepared By</label>
                    <input type="text" value={report.preparedBy}
                        onChange={e => updateReport('preparedBy', e.target.value)}
                        className="pm-input" placeholder="Inspector name" />
                </div>
                <div>
                    <label className="pm-label">Checked By (Project Manager)</label>
                    <input type="text" value={report.checkedBy}
                        onChange={e => updateReport('checkedBy', e.target.value)}
                        className="pm-input" placeholder="PM name" />
                </div>
            </div>

            {/* Observation — always blank until user types */}
            <div className="cc-insp-block">
                <div className="cc-insp-block-header cc-insp-header-green">OBSERVATION</div>
                <textarea
                    value={report.observation}
                    onChange={e => updateReport('observation', e.target.value)}
                    className="pm-textarea cc-insp-textarea"
                    rows={6}
                    placeholder="Describe site observation, conditions, scope of work completed..." />
            </div>

            {/* Problem / Solution — empty until user adds rows */}
            <div className="cc-insp-block">
                <div className="cc-insp-ps-header">
                    <div className="cc-insp-block-header cc-insp-header-green cc-insp-col-header">
                        PROBLEM ENCOUNTERED
                    </div>
                    <div className="cc-insp-block-header cc-insp-header-green cc-insp-col-header">
                        SOLUTION
                    </div>
                </div>

                {report.problems.length === 0 && (
                    <div className="cc-insp-empty-state">
                        No problems logged yet. Click below to add one.
                    </div>
                )}

                {report.problems.map((p, idx) => (
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
                    <input type="file" accept="image/*" ref={photoRef}
                        onChange={e => setPhotoFile(e.target.files[0])}
                        className="cc-file-hidden" />
                </label>
            </div>

            {/* Actions */}
            <div className="cc-action-row">
                <PrimaryButton variant="navy" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save Inspection Report'}
                </PrimaryButton>
                <button className="pm-btn-success-sm" onClick={exportExcel}>
                    ⬇️ Download Excel
                </button>
            </div>
        </div>
    );
};

export default SiteInspectionReport;