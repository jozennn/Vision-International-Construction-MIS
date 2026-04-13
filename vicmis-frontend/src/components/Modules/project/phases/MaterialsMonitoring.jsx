// src/phases/MaterialsMonitoring.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    useMaterialsMonitoring,
    totalDelivered,
    getRemainingInventory,
} from '../hooks/useMaterialsMonitoring.js';
import '../css/MonitoringComponents.css';

// Save Indicator Component
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

const MaterialsMonitoring = ({ project, trackingData, boqData }) => {
    const {
        items,
        currentDate,
        saving,
        saveStatus,
        saveSuccess,
        error,
        setCurrentDate,
        addItem,
        removeItem,
        updateItem,
        updateDelivery,
        updateInstalled,
        saveMaterials,
    } = useMaterialsMonitoring(
        project?.id,
        trackingData?.material_items,
        boqData,
    );

    const projectName  = project?.project_name ?? '';
    const location     = project?.location     ?? '';
    const requirement  = project?.project_type ?? '';
    const salesAgent   = project?.created_by_name ?? '—';

    const resolveLeadEngineer = () => {
        const engineers = project?.assigned_engineers;
        if (Array.isArray(engineers) && engineers.length > 0) {
            const first = engineers[0];
            if (typeof first === 'string') return first;
            if (first?.name) return first.name;
        }
        const eng = (project?.assignments ?? []).find(a =>
            ['lead_engineer','support_engineer','engineer'].includes((a.role ?? '').toLowerCase())
        );
        return eng?.user?.name ?? '—';
    };
    const leadEngineer = resolveLeadEngineer();

    const currentDateLabel = new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });

    // Get previous date's remaining inventory for initial display
    const getStartingInventory = (item) => {
        const dates = Object.keys(item.dailyConsumed || {}).sort();
        const prevDate = dates.filter(d => d < currentDate).pop();
        if (!prevDate) return totalDelivered(item);
        return getRemainingInventory(item, prevDate);
    };

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
        ws.columns = [
            {width:20},{width:18},{width:12},{width:12},{width:12},
            {width:12},{width:16},{width:16},
        ];
        let r = 1;
        [['Project Name',projectName],['Location',location],['Requirements',requirement],
         ['Engineer',leadEngineer],['Sales Agent',salesAgent]].forEach(([l,v])=>{
            ws.getCell(r,1).value=l; ws.getCell(r,1).font=bold;
            ws.getCell(r,2).value=v; ws.getCell(r,2).font=norm;
            ws.getRow(r).height=16; r++;
        });
        r++;
        ws.mergeCells(r,1,r,8);
        ws.getCell(r,1).value='MATERIALS MONITORING';
        ws.getCell(r,1).font={bold:true,size:13,name:'Arial'};
        ws.getCell(r,1).fill=fill(LGRAY); ws.getCell(r,1).alignment=ctr; ws.getCell(r,1).border=allB;
        ws.getRow(r).height=24; r++;
        ['NAME','DESCRIPTION','DEL. DATE','DEL. QTY','TOTAL DELIVERED','INSTALLED','REMAINING INVENTORY','REMARKS'].forEach((h,ci)=>{
            const c=ws.getCell(r,ci+1); c.value=h;
            c.font={bold:true,size:9,name:'Arial',color:{argb:'FFFFFFFF'}};
            c.fill=fill(NAVY); c.alignment=ctr; c.border=allB;
        });
        ws.getRow(r).height=22; r++;
        items.forEach(item=>{
            const delivered = totalDelivered(item);
            const lastDel = item.deliveries?.[item.deliveries.length-1] ?? {};
            const installed = item.installed?.[currentDate] ?? 0;
            const remaining = getRemainingInventory(item, currentDate);
            [item.name,item.description,lastDel.date??'',lastDel.qty??0,delivered,installed,remaining,item.remarks??''].forEach((v,ci)=>{
                const c=ws.getCell(r,ci+1); c.value=v; c.font=norm; c.border=allB; c.alignment=ci<2?lft:ctr;
            });
            ws.getRow(r).height=18; r++;
        });
        const buf=await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
            `${projectName}_Materials_${currentDate}.xlsx`);
    };

    return (
        <div className="mon-section">
            {/* Header */}
            <div className="mon-page-header">
                <div className="mon-header-meta">
                    {[['Project',projectName],['Location',location],
                      ['Requirement',requirement],['Engineer',leadEngineer],
                      ['Sales Agent',salesAgent]].map(([l,v]) => (
                        <div key={l} className="mon-header-field">
                            <span className="mon-header-label">{l}</span>
                            <span className="mon-header-value">{v || '—'}</span>
                        </div>
                    ))}
                </div>
                <div className="mon-header-actions">
                    <SaveIndicator status={saveStatus} />
                    <button className="mon-btn mon-btn-outline" onClick={exportExcel}>⬇️ Excel</button>
                    <button className="mon-btn mon-btn-navy" onClick={saveMaterials} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="mon-body">
                {error       && <div className="mon-error">⚠️ {error}</div>}
                {saveSuccess && <div className="mon-success">✅ Materials saved!</div>}

                {boqData && Object.values(boqData).flat().some(r => r?.product_code) && (
                    <div className="mon-boq-notice">
                        <span className="mon-boq-notice-icon">🔗</span>
                        Items synced from the approved BOQ are marked with a
                        <span className="mon-boq-badge">BOQ</span> badge.
                    </div>
                )}

                {/* Date selector */}
                <div className="mon-mat-toolbar">
                    <div className="mon-date-row">
                        <span className="mon-field-label">📅 Date</span>
                        <input type="date" value={currentDate}
                            onChange={e => setCurrentDate(e.target.value)}
                            className="mon-date-input" />
                    </div>
                    <div className="mon-date-hint">
                        Showing data for {currentDateLabel}. Switch date to view another day.
                    </div>
                </div>

                {/* Table */}
                <div className="mon-table-card">
                    <div className="mon-table-toolbar">
                        <span className="mon-table-title">📦 Materials Monitoring</span>
                        <button className="mon-add-btn" onClick={addItem}>+ Add Item</button>
                    </div>
                    <div className="mon-table-scroll">
                        <table className="mon-table">
                            <thead>
                                <tr>
                                    <th className="th-left" style={{ minWidth: 140 }}>NAME</th>
                                    <th style={{ minWidth: 120 }}>DESCRIPTION</th>
                                    <th>DELIVERY DATE</th>
                                    <th>QTY</th>
                                    <th>TOTAL</th>
                                    <th style={{ minWidth: 90 }}>INSTALLED</th>
                                    <th style={{ minWidth: 110 }}>REMAINING<br/>INVENTORY</th>
                                    <th style={{ minWidth: 100 }}>REMARKS</th>
                                    <th style={{ width: 36 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#bbb', fontStyle: 'italic', fontSize: 12 }}>
                                            No items yet. Items from the approved BOQ appear here automatically.
                                        </td>
                                    </tr>
                                )}
                                {items.map(item => {
                                    const delivered = totalDelivered(item);
                                    const lastDel = item.deliveries?.[item.deliveries.length - 1] ?? {};
                                    const fromBoq = Boolean(item.boqKey);
                                    const installedToday = item.installed?.[currentDate] ?? 0;
                                    const remainingInventory = getRemainingInventory(item, currentDate);
                                    const startingInventory = getStartingInventory(item);

                                    return (
                                        <tr key={item.id} className={fromBoq ? 'mon-row-boq' : ''}>
                                            <td className="td-left">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {fromBoq && <span className="mon-boq-badge" title={item.boqKey}>BOQ</span>}
                                                    <input type="text" value={item.name}
                                                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                                                        className="mon-cell-input input-wide" placeholder="Item name" />
                                                </div>
                                            </td>
                                            <td>
                                                <input type="text" value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    className="mon-cell-input input-wide" placeholder="Description" />
                                            </td>
                                            <td>
                                                <input type="date" value={lastDel.date ?? ''}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'date', e.target.value)}
                                                    className="mon-cell-input input-date" />
                                            </td>
                                            <td>
                                                <input type="number" value={lastDel.qty ?? 0}
                                                    onChange={e => updateDelivery(item.id, item.deliveries.length - 1, 'qty', e.target.value)}
                                                    className="mon-cell-input input-num" min="0" />
                                            </td>
                                            <td className="td-bold">{delivered}</td>
                                            <td>
                                                <input type="number"
                                                    value={installedToday}
                                                    onChange={e => updateInstalled(item.id, e.target.value)}
                                                    className="mon-cell-input input-num"
                                                    style={{ background: '#f0f9ff' }}
                                                    placeholder="0" min="0"
                                                    max={startingInventory} />
                                            </td>
                                            <td className={`td-bold ${remainingInventory <= 0 ? 'td-red' : remainingInventory < 10 ? 'td-orange' : 'td-green'}`}>
                                                {remainingInventory}
                                            </td>
                                            <td>
                                                <input type="text" value={item.remarks ?? ''}
                                                    onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                    className="mon-cell-input input-wide" placeholder="Notes" />
                                            </td>
                                            <td>
                                                <button className="mon-remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mon-table-footer-hint">
                        <span>💡 Installed quantity reduces remaining inventory. Remaining carries over to next date.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialsMonitoring;