import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  Truck, Ship, Plus, Loader2, RefreshCw, Layers,
  Trash2, Globe, Building2, Package, ChevronDown,
  Box, FolderOpen, AlertTriangle, RotateCcw
} from 'lucide-react';
import './AccountingDashboard.css';

// ─── Empty row templates ──────────────────────────────────────────────────────

  const EMPTY_ROW_RESERVE = {
    project_name: '', product_category: '', product_code: '',
    unit: '', quantity: '', coverage_sqm: '',
    _catMode: 'pick', _codeMode: 'pick',
  };
  const EMPTY_ROW_STOCK = {
    product_category: '', product_code: '',
    unit: '', quantity: '',
    _catMode: 'pick', _codeMode: 'pick',
  };

  const buildEmptyForm = () => ({
    origin_type:      'INTERNATIONAL',
    shipment_purpose: 'RESERVE_FOR_PROJECT',
    shipment_number:  '',
    container_type:   '20 FOOTER',
    projects:         [{ ...EMPTY_ROW_RESERVE }],
    status:           'ONGOING PRODUCTION',
    location:         '',
    shipment_status:  'WAITING',
  });

  const STATUS_CLASS = {
    ARRIVED:   'tag-arrived',
    DEPARTURE: 'tag-departure',
    WAITING:   'tag-waiting',
  };

// ─── Shared smart category/code pickers ──────────────────────────────────────

const CategoryPicker = ({ value, catMode, categories, onPick, onType, onBackToPick }) => {
  if (catMode === 'new') {
    return (
      <div className="ac-new-field-wrap">
        <input className="ac-input" required autoFocus
          placeholder="Type new category name"
          value={value} onChange={e => onType(e.target.value)} />
        <button type="button" className="ac-back-pick-btn" onClick={onBackToPick}>← Pick</button>
      </div>
    );
  }
  return (
    <div className="ac-select-wrap">
      <select className="ac-input" required value={value} onChange={e => onPick(e.target.value)}>
        <option value="">— Select —</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__new__">+ Add New Category</option>
      </select>
      <ChevronDown size={13} className="ac-select-icon" />
    </div>
  );
};

const CodePicker = ({ value, codeMode, isNewCat, codesForCat, onPick, onType, onBackToPick }) => {
  if (isNewCat || codeMode === 'new') {
    return (
      <div className="ac-new-field-wrap">
        <input className="ac-input" required
          placeholder="Type new product code"
          value={value} onChange={e => onType(e.target.value)} />
        {!isNewCat && (
          <button type="button" className="ac-back-pick-btn" onClick={onBackToPick}>← Pick</button>
        )}
      </div>
    );
  }
  return (
    <div className="ac-select-wrap">
      <select className="ac-input" required value={value}
        onChange={e => onPick(e.target.value)} disabled={!codesForCat.length && value === ''}>
        <option value="">— Select —</option>
        {codesForCat.map(c => <option key={c.product_code} value={c.product_code}>{c.product_code}</option>)}
        <option value="__new__">+ Add New Code</option>
      </select>
      <ChevronDown size={13} className="ac-select-icon" />
    </div>
  );
};

// ─── Reserve for Project row ──────────────────────────────────────────────────

const ProjectRowReserve = ({ proj, idx, onUpdate, onRemove, categories, codesByCategory }) => {
  const codesForCat = proj._catMode === 'pick' && proj.product_category
    ? (codesByCategory[proj.product_category] || []) : [];

  const handleCatPick = (val) => {
    if (val === '__new__') {
      onUpdate(idx, '_catMode',        'new');
      onUpdate(idx, 'product_category','');
      onUpdate(idx, 'product_code',    '');
      onUpdate(idx, '_codeMode',       'pick');
      onUpdate(idx, 'unit',            '');
    } else {
      onUpdate(idx, '_catMode',        'pick');
      onUpdate(idx, 'product_category', val);
      onUpdate(idx, 'product_code',    '');
      onUpdate(idx, '_codeMode',       'pick');
      onUpdate(idx, 'unit',            '');
    }
  };
  const handleCodePick = (val) => {
    if (val === '__new__') {
      onUpdate(idx, '_codeMode',    'new');
      onUpdate(idx, 'product_code', '');
      onUpdate(idx, 'unit',         '');
    } else {
      onUpdate(idx, '_codeMode',    'pick');
      onUpdate(idx, 'product_code', val);
      const match = codesForCat.find(c => c.product_code === val);
      if (match) onUpdate(idx, 'unit', match.unit || '');
    }
  };

  return (
    <div className="ac-project-card">
      <div className="ac-project-head">
        <span className="ac-project-num">Project {idx + 1}</span>
        {idx > 0 && (
          <button type="button" className="ac-remove-btn" onClick={() => onRemove(idx)}>
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      <input className="ac-input" required
        placeholder="Project Name (e.g. Barangay Kapasigan Court)"
        value={proj.project_name}
        onChange={e => onUpdate(idx, 'project_name', e.target.value)} />

      <div className="ac-form-row mt-6">
        <div className="ac-form-group">
          <label className="ac-label-sm">Product Category</label>
          <CategoryPicker
            value={proj.product_category} catMode={proj._catMode}
            categories={categories}
            onPick={handleCatPick}
            onType={v => onUpdate(idx, 'product_category', v)}
            onBackToPick={() => { onUpdate(idx, '_catMode', 'pick'); onUpdate(idx, 'product_category', ''); }} />
        </div>
        <div className="ac-form-group">
          <label className="ac-label-sm">Product Code</label>
          <CodePicker
            value={proj.product_code} codeMode={proj._codeMode}
            isNewCat={proj._catMode === 'new'} codesForCat={codesForCat}
            onPick={handleCodePick}
            onType={v => onUpdate(idx, 'product_code', v)}
            onBackToPick={() => { onUpdate(idx, '_codeMode', 'pick'); onUpdate(idx, 'product_code', ''); }} />
        </div>
      </div>

      <div className="ac-form-row ac-form-row-3 mt-6">
        <div className="ac-form-group">
          <label className="ac-label-sm">Quantity</label>
          <input className="ac-input" type="number" min="0" placeholder="0"
            value={proj.quantity} onChange={e => onUpdate(idx, 'quantity', e.target.value)} />
        </div>
        <div className="ac-form-group">
          <label className="ac-label-sm">Unit</label>
          <input className="ac-input" placeholder="e.g. Rolls"
            value={proj.unit} onChange={e => onUpdate(idx, 'unit', e.target.value)} />
        </div>
        <div className="ac-form-group">
          <label className="ac-label-sm">Area (SQM)</label>
          <div className="ac-sqm-wrap">
            <input className="ac-input" type="number" min="0" placeholder="0"
              value={proj.coverage_sqm} onChange={e => onUpdate(idx, 'coverage_sqm', e.target.value)} />
            <span className="ac-unit-tag">SQM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── For New Stock row ────────────────────────────────────────────────────────

const StockRow = ({ proj, idx, onUpdate, onRemove, categories, codesByCategory }) => {
  const codesForCat = proj._catMode === 'pick' && proj.product_category
    ? (codesByCategory[proj.product_category] || []) : [];

  const handleCatPick = (val) => {
    if (val === '__new__') {
      onUpdate(idx, '_catMode',        'new');
      onUpdate(idx, 'product_category','');
      onUpdate(idx, 'product_code',    '');
      onUpdate(idx, '_codeMode',       'pick');
      onUpdate(idx, 'unit',            '');
    } else {
      onUpdate(idx, '_catMode',        'pick');
      onUpdate(idx, 'product_category', val);
      onUpdate(idx, 'product_code',    '');
      onUpdate(idx, '_codeMode',       'pick');
      onUpdate(idx, 'unit',            '');
    }
  };
  const handleCodePick = (val) => {
    if (val === '__new__') {
      onUpdate(idx, '_codeMode',    'new');
      onUpdate(idx, 'product_code', '');
      onUpdate(idx, 'unit',         '');
    } else {
      onUpdate(idx, '_codeMode',    'pick');
      onUpdate(idx, 'product_code', val);
      const match = codesForCat.find(c => c.product_code === val);
      if (match) onUpdate(idx, 'unit', match.unit || '');
    }
  };

  return (
    <div className="ac-project-card ac-stock-card">
      <div className="ac-project-head">
        <span className="ac-project-num">Item {idx + 1}</span>
        {idx > 0 && (
          <button type="button" className="ac-remove-btn" onClick={() => onRemove(idx)}>
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      <div className="ac-form-row">
        <div className="ac-form-group">
          <label className="ac-label-sm">Product Category</label>
          <CategoryPicker
            value={proj.product_category} catMode={proj._catMode}
            categories={categories}
            onPick={handleCatPick}
            onType={v => onUpdate(idx, 'product_category', v)}
            onBackToPick={() => { onUpdate(idx, '_catMode', 'pick'); onUpdate(idx, 'product_category', ''); }} />
        </div>
        <div className="ac-form-group">
          <label className="ac-label-sm">Product Code</label>
          <CodePicker
            value={proj.product_code} codeMode={proj._codeMode}
            isNewCat={proj._catMode === 'new'} codesForCat={codesForCat}
            onPick={handleCodePick}
            onType={v => onUpdate(idx, 'product_code', v)}
            onBackToPick={() => { onUpdate(idx, '_codeMode', 'pick'); onUpdate(idx, 'product_code', ''); }} />
        </div>
      </div>

      <div className="ac-form-row mt-6">
        <div className="ac-form-group">
          <label className="ac-label-sm">Quantity</label>
          <input className="ac-input" type="number" min="0" placeholder="0"
            value={proj.quantity} onChange={e => onUpdate(idx, 'quantity', e.target.value)} />
        </div>
        <div className="ac-form-group">
          <label className="ac-label-sm">Unit</label>
          <input className="ac-input" placeholder="e.g. Rolls, Pcs"
            value={proj.unit} onChange={e => onUpdate(idx, 'unit', e.target.value)} />
        </div>
      </div>
    </div>
  );
};

// ─── Report Detail Modal ───────────────────────────────────────────────────────
const ReportDetailModal = ({ report, onClose }) => (
  <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="ac-modal ac-modal-report">
      <div className="ac-modal-header ac-modal-header-warn">
        <div>
          <h2 className="ac-modal-title"><AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />Return / Report Details</h2>
          <p className="ac-modal-sub">Shipment: {report.shipment_number}</p>
        </div>
        <button className="ac-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="ac-modal-body">
        <table className="ac-report-table">
          <thead>
            <tr>
              <th>Product Category</th>
              <th>Product Code</th>
              <th>Issue</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            {report.items?.map((item, i) => (
              <tr key={i}>
                <td>{item.product_category}</td>
                <td className="ac-code">{item.product_code}</td>
                <td className="ac-issue">{item.issue}</td>
                <td>
                  <span className={`ac-cond-tag cond-${item.condition?.toLowerCase().replace(/\s/g, '-')}`}>
                    {item.condition}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ac-report-meta">
          <span>Filed: {report.created_at ? new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Just now'}</span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const AccountingDashboard = ({ user }) => {
  const [shipments, setShipments]         = useState([]);
  const [deliveries, setDeliveries]       = useState([]);
  const [reports, setReports]             = useState([]);
  const [reorders, setReorders]           = useState([]);                    // ← NEW
  const [loading, setLoading]             = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reorderActionLoading, setReorderActionLoading] = useState({});      // ← NEW  { [id]: true/false }
  const [form, setForm]                   = useState(buildEmptyForm());
  const [categories, setCategories]       = useState([]);
  const [codesByCategory, setCodesByCategory] = useState({});
  const [selectedReport, setSelectedReport]   = useState(null);
  const [activeTab, setActiveTab]             = useState('activity'); // 'activity' | 'reports' | 'reorders'

  useEffect(() => {
    api.get('/inventory/shipments/meta').then(res => {
      setCategories(res.data.categories || []);
      setCodesByCategory(res.data.codes_by_category || {});
    }).catch(console.error);
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setIsRefreshing(true);
      const [delRes, shipRes, reportRes, reorderRes] = await Promise.all([  // ← UPDATED
        api.get('/inventory/logistics'),
        api.get('/inventory/shipments'),
        api.get('/inventory/shipments/reports').catch(() => ({ data: [] })),
        api.get('/inventory/reorder-requests').catch(() => ({ data: [] })),  // ← NEW
      ]);
      setDeliveries((delRes.data?.data || delRes.data || []).slice(0, 10));
      setShipments((shipRes.data || []).slice(0, 10));
      setReports(reportRes.data || []);
      setReorders(reorderRes.data || []);                                     // ← NEW
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Reorder status action ──────────────────────────────────────────────────
  const handleReorderStatus = async (id, newStatus) => {               // ← NEW
    setReorderActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/inventory/reorder-requests/${id}/status`, { status: newStatus });
      setReorders(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update reorder status.');
    } finally {
      setReorderActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Called from IncomingShipment when a report is filed
  const handleReportFiled = (payload) => {
    setReports(prev => [{ ...payload, created_at: new Date().toISOString() }, ...prev]);
    setActiveTab('reports');
  };

  const handlePurposeChange = (purpose) => {
    setForm(f => ({
      ...f,
      shipment_purpose: purpose,
      projects: [purpose === 'RESERVE_FOR_PROJECT' ? { ...EMPTY_ROW_RESERVE } : { ...EMPTY_ROW_STOCK }],
    }));
  };

  const addRow = () => {
    const empty = form.shipment_purpose === 'RESERVE_FOR_PROJECT'
      ? { ...EMPTY_ROW_RESERVE } : { ...EMPTY_ROW_STOCK };
    setForm(f => ({ ...f, projects: [...f.projects, empty] }));
  };

  const removeRow = (i) =>
    setForm(f => ({ ...f, projects: f.projects.filter((_, idx) => idx !== i) }));

  const updateRow = (i, field, value) =>
    setForm(f => {
      const updated = [...f.projects];
      updated[i] = { ...updated[i], [field]: value };
      return { ...f, projects: updated };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        projects: form.projects.map(({ _catMode, _codeMode, ...rest }) => rest),
      };
      await api.post('/inventory/shipments', payload);
      setForm(buildEmptyForm());
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ')
        || 'Error saving shipment.';
      alert(msg);
    } finally { setActionLoading(false); }
  };

  const isReserve = form.shipment_purpose === 'RESERVE_FOR_PROJECT';
  const pendingReorders = reorders.filter(r => r.status === 'pending');   // ← NEW

  return (
    <div className="ac-wrapper">

      <header className="ac-header">
        <div className="ac-header-left">
          <div className="ac-header-icon"><Ship size={20} /></div>
          <div>
            <h1 className="ac-title">Logistics Control Center</h1>
            <p className="ac-subtitle">Procurement &amp; International Shipping</p>
          </div>
        </div>
        <button className={`ac-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={() => fetchData(true)}><RefreshCw size={16} /></button>
      </header>

      <div className="ac-stats">
        <div className="ac-stat">
          <div className="ac-stat-icon icon-red"><Ship size={18} /></div>
          <div><p className="ac-stat-label">Active Shipments</p><p className="ac-stat-value">{shipments.length}</p></div>
        </div>
        <div className="ac-stat">
          <div className="ac-stat-icon icon-blue"><Truck size={18} /></div>
          <div><p className="ac-stat-label">Local Deliveries</p><p className="ac-stat-value">{deliveries.length}</p></div>
        </div>
        {reports.length > 0 && (
          <div className="ac-stat ac-stat-warn" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer' }}>
            <div className="ac-stat-icon icon-warn"><AlertTriangle size={18} /></div>
            <div><p className="ac-stat-label">Reports Filed</p><p className="ac-stat-value">{reports.length}</p></div>
          </div>
        )}
        {/* ── NEW: Reorder Requests stat card ── */}
        {pendingReorders.length > 0 && (
          <div className="ac-stat ac-stat-warn" onClick={() => setActiveTab('reorders')} style={{ cursor: 'pointer' }}>
            <div className="ac-stat-icon icon-warn"><Package size={18} /></div>
            <div>
              <p className="ac-stat-label">Reorder Requests</p>
              <p className="ac-stat-value">{pendingReorders.length}</p>
            </div>
          </div>
        )}
      </div>

      <div className="ac-body">
        <div className="ac-col-left">
          <div className="ac-card">
            <div className="ac-card-head"><Layers size={16} /><span>Register Incoming Shipment</span></div>

            <form className="ac-form" onSubmit={handleSubmit}>

              {/* Purpose */}
              <div className="ac-form-group">
                <label className="ac-label">Shipment Purpose <span className="ac-req">*</span></label>
                <div className="ac-purpose-toggle">
                  <button type="button"
                    className={`ac-purpose-btn ${isReserve ? 'active' : ''}`}
                    onClick={() => handlePurposeChange('RESERVE_FOR_PROJECT')}>
                    <FolderOpen size={14} /><span>Reserve for Project</span>
                  </button>
                  <button type="button"
                    className={`ac-purpose-btn ${!isReserve ? 'active' : ''}`}
                    onClick={() => handlePurposeChange('NEW_STOCK')}>
                    <Box size={14} /><span>For New Stock</span>
                  </button>
                </div>
                <p className="ac-purpose-hint">
                  {isReserve
                    ? 'Materials reserved for a specific project — includes project name and area (SQM).'
                    : 'Materials going to warehouse stock — no project assignment needed.'}
                </p>
              </div>

              {/* Origin */}
              <div className="ac-form-group">
                <label className="ac-label">Logistics Type</label>
                <div className="ac-origin-toggle">
                  {['INTERNATIONAL', 'LOCAL'].map(t => (
                    <button key={t} type="button"
                      className={`ac-origin-btn ${form.origin_type === t ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, origin_type: t }))}>
                      {t === 'INTERNATIONAL' ? <Globe size={13} /> : <Building2 size={13} />}{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipment # + Container */}
              <div className="ac-form-row">
                <div className="ac-form-group">
                  <label className="ac-label">Shipment Number <span className="ac-req">*</span></label>
                  <input className="ac-input" required placeholder="e.g. SHIP-2026-001"
                    value={form.shipment_number}
                    onChange={e => setForm(f => ({ ...f, shipment_number: e.target.value }))} />
                </div>
                <div className="ac-form-group">
                  <label className="ac-label">Container Type</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" value={form.container_type}
                      onChange={e => setForm(f => ({ ...f, container_type: e.target.value }))}>
                      <option value="20 FOOTER">20 FOOTER</option>
                      <option value="40 FOOTER">40 FOOTER</option>
                    </select>
                    <ChevronDown size={13} className="ac-select-icon" />
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="ac-form-group">
                <label className="ac-label">
                  {isReserve ? 'Project Allocation' : 'Stock Items'} <span className="ac-req">*</span>
                </label>
                <div className="ac-projects">
                  {form.projects.map((proj, idx) =>
                    isReserve
                      ? <ProjectRowReserve key={idx} proj={proj} idx={idx}
                          onUpdate={updateRow} onRemove={removeRow}
                          categories={categories} codesByCategory={codesByCategory} />
                      : <StockRow key={idx} proj={proj} idx={idx}
                          onUpdate={updateRow} onRemove={removeRow}
                          categories={categories} codesByCategory={codesByCategory} />
                  )}
                  <button type="button" className="ac-add-project-btn" onClick={addRow}>
                    <Plus size={13} />{isReserve ? 'Add Another Project' : 'Add Another Item'}
                  </button>
                </div>
              </div>

              {/* Status + Location */}
              <div className="ac-form-row">
                <div className="ac-form-group">
                  <label className="ac-label">Production Status</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option>ONGOING PRODUCTION</option>
                      <option>ON STOCK</option>
                      <option>READY FOR SHIPMENT</option>
                    </select>
                    <ChevronDown size={13} className="ac-select-icon" />
                  </div>
                </div>
                <div className="ac-form-group">
                  <label className="ac-label">Material Location</label>
                  <input className="ac-input" placeholder="Current warehouse / port"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>

              <div className="ac-form-group">
                <label className="ac-label">Shipment Progress</label>
                <div className="ac-select-wrap">
                  <select className="ac-input" value={form.shipment_status}
                    onChange={e => setForm(f => ({ ...f, shipment_status: e.target.value }))}>
                    <option value="WAITING">WAITING</option>
                    <option value="DEPARTURE">DEPARTURE</option>
                  </select>
                  <ChevronDown size={13} className="ac-select-icon" />
                </div>
              </div>

              <button type="submit" className="ac-submit-btn" disabled={actionLoading}>
                {actionLoading ? <><Loader2 size={15} className="ac-spinner" /> Registering…</> : 'Register Shipment'}
              </button>
            </form>
          </div>
        </div>

        {/* Feed */}
        <div className="ac-col-right">
          <div className="ac-card">
            {/* Tab switcher */}
            <div className="ac-card-head ac-card-head-tabs">
              <button
                className={`ac-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                <Package size={14} /> Activity
              </button>
              <button
                className={`ac-tab-btn ${activeTab === 'reports' ? 'active' : ''} ${reports.length > 0 ? 'has-alert' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                <AlertTriangle size={14} /> Reports
                {reports.length > 0 && <span className="ac-tab-badge">{reports.length}</span>}
              </button>
              {/* ── NEW: Reorders tab ── */}
              <button
                className={`ac-tab-btn ${activeTab === 'reorders' ? 'active' : ''} ${pendingReorders.length > 0 ? 'has-alert' : ''}`}
                onClick={() => setActiveTab('reorders')}
              >
                <RotateCcw size={14} /> Reorders
                {pendingReorders.length > 0 && <span className="ac-tab-badge">{pendingReorders.length}</span>}
              </button>
            </div>

            {/* Activity tab */}
            {activeTab === 'activity' && (
              loading ? (
                <div className="ac-loading"><Loader2 size={20} className="ac-spinner" /> Loading…</div>
              ) : shipments.length === 0 ? (
                <p className="ac-empty">No shipments yet.</p>
              ) : (
                <div className="ac-feed">
                  {shipments.map(ship => (
                    <div key={ship.id} className="ac-feed-item">
                      <div className={`ac-feed-icon ${ship.origin_type === 'INTERNATIONAL' ? 'icon-red' : 'icon-blue'}`}>
                        {ship.origin_type === 'INTERNATIONAL' ? <Globe size={13} /> : <Building2 size={13} />}
                      </div>
                      <div className="ac-feed-body">
                        <p className="ac-feed-title">{ship.shipment_number}</p>
                        <div className="ac-feed-meta-row">
                          <p className="ac-feed-sub">{ship.container_type} · {ship.origin_type}</p>
                          {ship.shipment_purpose && (
                            <span className={`ac-purpose-tag ${ship.shipment_purpose === 'NEW_STOCK' ? 'purpose-stock' : 'purpose-reserve'}`}>
                              {ship.shipment_purpose === 'NEW_STOCK' ? 'New Stock' : 'Reserve'}
                            </span>
                          )}
                        </div>
                        <div className="ac-feed-tags">
                          {ship.projects?.map((p, i) => (
                            <span key={i} className="ac-project-tag">
                              {ship.shipment_purpose === 'NEW_STOCK' ? p.product_category : p.project_name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`ac-status-tag ${STATUS_CLASS[ship.shipment_status] || 'tag-waiting'}`}>
                        {ship.shipment_status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Reports tab */}
            {activeTab === 'reports' && (
              reports.length === 0 ? (
                <div className="ac-empty">
                  <RotateCcw size={28} style={{ color: '#C8BDB8', display: 'block', margin: '0 auto 8px' }} />
                  No reports filed yet.
                </div>
              ) : (
                <div className="ac-feed">
                  {reports.map((report, i) => (
                    <button key={i} className="ac-feed-item ac-feed-item-btn ac-report-feed-item"
                      onClick={() => setSelectedReport(report)}>
                      <div className="ac-feed-icon icon-warn">
                        <AlertTriangle size={13} />
                      </div>
                      <div className="ac-feed-body">
                        <p className="ac-feed-title">{report.shipment_number}</p>
                        <p className="ac-feed-sub">{report.items?.length || 0} item(s) reported</p>
                        <div className="ac-feed-tags">
                          {report.items?.slice(0, 3).map((item, j) => (
                            <span key={j} className="ac-report-tag">{item.product_code}</span>
                          ))}
                          {(report.items?.length || 0) > 3 && (
                            <span className="ac-report-tag">+{report.items.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <span className="ac-view-report">View →</span>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* ── Reorders tab ── */}
            {activeTab === 'reorders' && (
              reorders.length === 0 ? (
                <div className="ac-empty">
                  <Package size={28} style={{ color: '#C8BDB8', display: 'block', margin: '0 auto 8px' }} />
                  No reorder requests yet.
                </div>
              ) : (
                <div className="ac-feed">
                  {reorders.map((req) => {
                    const isBusy    = reorderActionLoading[req.id];
                    const isOrdered = req.status === 'ordered';
                    const statusCls = req.status === 'pending' ? 'reorder-pending'
                                    : req.status === 'acknowledged' ? 'reorder-ack'
                                    : 'reorder-ordered';
                    const statusLabel = req.status === 'pending'      ? 'Pending'
                                      : req.status === 'acknowledged' ? 'Acknowledged'
                                      : 'Ordered';
                    return (
                      <div key={req.id} className={`ac-feed-item ac-reorder-feed-item ${isOrdered ? 'reorder-done' : ''}`}>
                        <div className={`ac-feed-icon ${req.status === 'pending' ? 'icon-warn' : req.status === 'acknowledged' ? 'icon-blue' : 'icon-green'}`}>
                          <Package size={13} />
                        </div>
                        <div className="ac-feed-body">

                          {/* Category + status badge on same row */}
                          <div className="ac-feed-meta-row">
                            <span className="ac-reorder-category">{req.product_category}</span>
                            <span className={`ac-purpose-tag ${statusCls}`}>{statusLabel}</span>
                          </div>

                          {/* Item code — prominent */}
                          <p className="ac-feed-title" style={{ marginTop: 2 }}>{req.product_code}</p>

                          {/* Quantity needed row */}
                          {req.quantity_needed && (
                            <div className="ac-reorder-qty-row">
                              <span className="ac-reorder-qty-label">Qty Needed:</span>
                              <span className="ac-reorder-qty-value">
                                {req.quantity_needed} <em>{req.unit}</em>
                              </span>
                              <span className="ac-reorder-stock-hint">
                                (stock: {req.current_stock} {req.unit})
                              </span>
                            </div>
                          )}

                          {/* Notes */}
                          {req.notes && (
                            <p className="ac-reorder-notes-text">"{req.notes}"</p>
                          )}

                          {/* Action buttons */}
                          {!isOrdered && (
                            <div className="ac-reorder-actions">
                              {req.status === 'pending' && (
                                <button
                                  className="ac-reorder-btn ac-reorder-btn-ack"
                                  disabled={isBusy}
                                  onClick={() => handleReorderStatus(req.id, 'acknowledged')}
                                >
                                  {isBusy ? <Loader2 size={11} className="ac-spinner" /> : null}
                                  Acknowledge
                                </button>
                              )}
                              <button
                                className="ac-reorder-btn ac-reorder-btn-order"
                                disabled={isBusy}
                                onClick={() => handleReorderStatus(req.id, 'ordered')}
                              >
                                {isBusy ? <Loader2 size={11} className="ac-spinner" /> : null}
                                Mark as Ordered
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

export default AccountingDashboard;