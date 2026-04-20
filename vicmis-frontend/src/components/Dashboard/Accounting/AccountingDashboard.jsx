import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  Truck, Ship, Plus, Loader2, RefreshCw, Layers,
  Trash2, Globe, Building2, Package, ChevronDown,
  Box, FolderOpen, AlertTriangle, RotateCcw, CheckCircle, XCircle
} from 'lucide-react';
import './AccountingDashboard.css';

// ─── Empty row templates ──────────────────────────────────────────────────────
const EMPTY_ROW_RESERVE = {
  project_name: '',
  product_category: '',
  product_code: '',
  unit: '',
  quantity: '',
  coverage_sqm: '',
  _catMode: 'pick',
  _codeMode: 'pick',
};

const EMPTY_ROW_STOCK = {
  product_category: '',
  product_code: '',
  unit: '',
  quantity: '',
  _catMode: 'pick',
  _codeMode: 'pick',
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

// ─── Confirmation Modal ───────────────────────────────────────────────────────
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  if (!isOpen) return null;
  
  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-confirm-modal">
        <div className="ac-confirm-header">
          <div className="ac-confirm-icon">
            <Ship size={24} />
          </div>
          <h3 className="ac-confirm-title">{title}</h3>
        </div>
        <div className="ac-confirm-body">
          <div className="ac-confirm-message">{message}</div>
        </div>
        <div className="ac-confirm-footer">
          <button className="ac-confirm-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="ac-confirm-submit" onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="ac-spinner" /> Registering…</> : 'Confirm & Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Error Modal with better styling ──────────────────────────────────────────
const ErrorModal = ({ isOpen, onClose, errors, title = 'Cannot Register Shipment' }) => {
  if (!isOpen) return null;
  
  const errorList = Array.isArray(errors) ? errors : [errors];
  
  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-error-modal">
        <div className="ac-error-header">
          <div className="ac-error-icon">
            <XCircle size={28} />
          </div>
          <h3 className="ac-error-title">{title}</h3>
          <button className="ac-error-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ac-error-body">
          <ul className="ac-error-list">
            {errorList.map((err, i) => (
              <li key={i}>
                <span className="ac-error-bullet">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ac-error-footer">
          <button className="ac-error-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Success Toast ────────────────────────────────────────────────────────────
const SuccessToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="ac-success-toast">
      <CheckCircle size={16} />
      <span>{message}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
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
          <input className="ac-input" type="number" min="1" placeholder="0"
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
              <th>Quantity</th>
              <th>Issue</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            {report.items?.map((item, i) => (
              <tr key={i}>
                <td>{item.product_category}</td>
                <td className="ac-code">{item.product_code}</td>
                <td className="ac-code">{item.quantity_affected || '-'}</td>
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
  const [reorders, setReorders]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reorderActionLoading, setReorderActionLoading] = useState({});
  const [form, setForm]                   = useState(buildEmptyForm());
  const [categories, setCategories]       = useState([]);
  const [codesByCategory, setCodesByCategory] = useState({});
  const [selectedReport, setSelectedReport]   = useState(null);
  const [activeTab, setActiveTab]             = useState('activity');
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    api.get('/inventory/shipments/meta').then(res => {
      setCategories(res.data.categories || []);
      setCodesByCategory(res.data.codes_by_category || {});
    }).catch(console.error);
  }, []);

  useEffect(() => {
  const hasModal = showConfirmModal || showErrorModal || !!selectedReport;
  document.body.classList.toggle('modal-open', hasModal);
  return () => document.body.classList.remove('modal-open');
}, [showConfirmModal, showErrorModal, selectedReport]);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setIsRefreshing(true);
      const [delRes, shipRes, reportRes, reorderRes] = await Promise.all([
        api.get('/inventory/logistics').catch(() => ({ data: [] })),
        api.get('/inventory/shipments'),
        api.get('/inventory/shipments/reports').catch(() => ({ data: [] })),
        api.get('/inventory/reorder-requests').catch(() => ({ data: [] })),
      ]);
      setDeliveries((delRes.data?.data || delRes.data || []).slice(0, 10));
      setShipments((shipRes.data?.data || []).slice(0, 10));
      setReports(reportRes.data || []);
      setReorders(reorderRes.data || []);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReorderStatus = async (id, newStatus) => {
    setReorderActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/inventory/reorder-requests/${id}/status`, { status: newStatus });
      setReorders(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );
      setSuccessMessage(`Reorder request ${newStatus === 'ordered' ? 'marked as ordered' : 'acknowledged'}!`);
      setShowSuccessToast(true);
    } catch (err) {
      setValidationErrors([err.response?.data?.message || 'Failed to update reorder status.']);
      setShowErrorModal(true);
    } finally {
      setReorderActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

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

  // Validation function
  const validateForm = () => {
    const errors = [];
    
    if (!form.shipment_number || !form.shipment_number.trim()) {
      errors.push('Shipment number is required');
    }
    
    if (!form.projects || form.projects.length === 0) {
      errors.push('At least one item is required');
    }
    
    form.projects.forEach((proj, idx) => {
      if (!proj.product_category || !proj.product_category.trim()) {
        errors.push(`Item ${idx + 1}: Product category is required`);
      }
      if (!proj.product_code || !proj.product_code.trim()) {
        errors.push(`Item ${idx + 1}: Product code is required`);
      }
      if (form.shipment_purpose === 'RESERVE_FOR_PROJECT') {
        if (!proj.project_name || !proj.project_name.trim()) {
          errors.push(`Item ${idx + 1}: Project name is required for Reserve shipments`);
        }
      }
      if (!proj.quantity || parseInt(proj.quantity) <= 0) {
        errors.push(`Item ${idx + 1}: Quantity must be greater than 0`);
      }
    });
    
    return errors;
  };

  // Submit handler with confirmation
  const handleConfirmSubmit = async () => {
    setActionLoading(true);
    setShowConfirmModal(false);
    
    try {
      const payload = {
        origin_type: form.origin_type,
        shipment_purpose: form.shipment_purpose,
        shipment_number: form.shipment_number,
        container_type: form.container_type,
        status: form.status,
        location: form.location || null,
        shipment_status: form.shipment_status,
        projects: form.projects.map(({ _catMode, _codeMode, ...rest }) => rest),
      };
      
      const response = await api.post('/inventory/shipments', payload);
      
      if (response.status === 201 || response.status === 200) {
        setForm(buildEmptyForm());
        await fetchData(true);
        setSuccessMessage(`Shipment ${form.shipment_number} registered successfully!`);
        setShowSuccessToast(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      const errorData = err.response?.data;
      const statusCode = err.response?.status;
      
      if (statusCode === 422 && errorData?.errors) {
        const serverErrors = [];
        Object.keys(errorData.errors).forEach(key => {
          if (Array.isArray(errorData.errors[key])) {
            serverErrors.push(`${key.replace('projects.', 'Item ')}: ${errorData.errors[key].join(', ')}`);
          } else {
            serverErrors.push(errorData.errors[key]);
          }
        });
        setValidationErrors(serverErrors);
        setShowErrorModal(true);
      } else if (errorData?.message) {
        setValidationErrors([errorData.message]);
        setShowErrorModal(true);
      } else {
        setValidationErrors([
          'Unable to register shipment. Please check:',
          '• All fields are filled correctly',
          '• Product codes exist in inventory',
          '• Shipment number is unique',
          'Contact support if issue persists.'
        ]);
        setShowErrorModal(true);
      }
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleSubmitClick = (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorModal(true);
      return;
    }
    
    const purposeText = form.shipment_purpose === 'RESERVE_FOR_PROJECT' ? 'Reserve for Project' : 'New Stock';
    const itemsCount = form.projects.length;
    const totalQty = form.projects.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    
    let message = `📦 Shipment: ${form.shipment_number}\n`;
    message += `🎯 Purpose: ${purposeText}\n`;
    message += `📋 Items: ${itemsCount} item(s)\n`;
    message += `📊 Total Quantity: ${totalQty} units\n\n`;
    message += `Items:\n`;
    form.projects.forEach((p, i) => {
      if (form.shipment_purpose === 'RESERVE_FOR_PROJECT') {
        message += `  ${i + 1}. ${p.product_code} - ${p.quantity} ${p.unit} (${p.project_name})\n`;
      } else {
        message += `  ${i + 1}. ${p.product_code} - ${p.quantity} ${p.unit}\n`;
      }
    });
    message += `\nPlease verify all information before confirming.`;
    
    setConfirmMessage(message);
    setShowConfirmModal(true);
  };

  const isReserve = form.shipment_purpose === 'RESERVE_FOR_PROJECT';
  const pendingReorders = reorders.filter(r => r.status === 'pending');

  return (
    <div className="ac-wrapper">

      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast message={successMessage} onClose={() => setShowSuccessToast(false)} />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Shipment Registration"
        message={confirmMessage}
        loading={actionLoading}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errors={validationErrors}
      />

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

            <form className="ac-form" onSubmit={handleSubmitClick}>
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
                  <input
                    type="text"
                    autoComplete="off"
                    className="ac-input"
                    required
                    placeholder="e.g. SHIP-2026-001"
                    value={form.shipment_number}
                    onChange={e => setForm(f => ({ ...f, shipment_number: e.target.value }))}
                  />
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

            {/* Reorders tab */}
            {activeTab === 'reorders' && (
              reorders.length === 0 ? (
                <div className="ac-empty">
                  <Package size={28} style={{ color: '#C8BDB8', display: 'block', margin: '0 auto 8px' }} />
                  No reorder requests yet.
                </div>
              ) : (
                <div className="ac-feed">
                  {reorders.map((req) => {
                    const isBusy = reorderActionLoading[req.id];
                    const isOrdered = req.status === 'ordered';
                    const statusCls = req.status === 'pending' ? 'reorder-pending'
                                    : req.status === 'acknowledged' ? 'reorder-ack'
                                    : 'reorder-ordered';
                    const statusLabel = req.status === 'pending' ? 'Pending'
                                      : req.status === 'acknowledged' ? 'Acknowledged'
                                      : 'Ordered';
                    return (
                      <div key={req.id} className={`ac-feed-item ac-reorder-feed-item ${isOrdered ? 'reorder-done' : ''}`}>
                        <div className={`ac-feed-icon ${req.status === 'pending' ? 'icon-warn' : req.status === 'acknowledged' ? 'icon-blue' : 'icon-green'}`}>
                          <Package size={13} />
                        </div>
                        <div className="ac-feed-body">
                          <div className="ac-feed-meta-row">
                            <span className="ac-reorder-category">{req.product_category}</span>
                            <span className={`ac-purpose-tag ${statusCls}`}>{statusLabel}</span>
                          </div>
                          <p className="ac-feed-title" style={{ marginTop: 2 }}>{req.product_code}</p>
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
                          {req.notes && (
                            <p className="ac-reorder-notes-text">"{req.notes}"</p>
                          )}
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