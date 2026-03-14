import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import {
  AlertTriangle, Package, Truck, Ship, RefreshCw,
  CheckCircle, Box, PackageCheck,
  FolderOpen, Globe, Building2, ShieldCheck, Warehouse
} from 'lucide-react';
import './InventoryDashboard.css';

// ─── Config ───────────────────────────────────────────────────────────────────
const AVAIL_CONFIG = {
  'ON STOCK':  { cls: 'avail-on',  dot: '#10B981' },
  'LOW STOCK': { cls: 'avail-low', dot: '#F59E0B' },
  'NO STOCK':  { cls: 'avail-no',  dot: '#EF4444' },
};

const SHIPMENT_STATUS = {
  ARRIVED:   { cls: 'badge-arrived',   label: 'ARRIVED'   },
  DEPARTURE: { cls: 'badge-departure', label: 'DEPARTURE' },
  WAITING:   { cls: 'badge-waiting',   label: 'WAITING'   },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent, delay }) => (
  <div className="id-stat-card" style={{ '--accent': accent, animationDelay: delay }}>
    <div className="id-stat-icon" style={{ background: `${accent}18`, color: accent }}>
      <Icon size={20} />
    </div>
    <div className="id-stat-body">
      <span className="id-stat-value">{value}</span>
      <span className="id-stat-label">{label}</span>
      {sub && <span className="id-stat-sub">{sub}</span>}
    </div>
    <div className="id-stat-accent-bar" style={{ background: accent }} />
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, sub }) => (
  <div className="id-section-header">
    <div className="id-section-title-group">
      <div className="id-section-icon"><Icon size={15} /></div>
      <div>
        <h3 className="id-section-title">{title}</h3>
        {sub && <p className="id-section-sub">{sub}</p>}
      </div>
    </div>
  </div>
);

const SectionError = ({ msg }) => (
  <div className="id-section-error">
    <AlertTriangle size={14} />
    <span>{msg}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const InventoryDashboard = ({ user }) => {

  // ── All inventory items (full table scan, no pagination limit) ─────────────
  // We fetch ALL rows with per_page=9999 so stat counts are accurate
  const [allInventory,   setAllInventory]   = useState([]);
  const [shipments,      setShipments]      = useState([]);
  const [deliveries,     setDeliveries]     = useState([]);

  const [loadingInv,  setLoadingInv]  = useState(true);
  const [loadingShip, setLoadingShip] = useState(true);
  const [loadingDel,  setLoadingDel]  = useState(true);

  const [errInv,  setErrInv]  = useState(null);
  const [errShip, setErrShip] = useState(null);
  const [errDel,  setErrDel]  = useState(null);

  const [lastSync,     setLastSync]     = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch ALL warehouse_inventory rows ─────────────────────────────────────
  // Uses per_page=9999 to bypass pagination and get full counts
  const fetchInventory = useCallback(async () => {
    setLoadingInv(true);
    setErrInv(null);
    try {
      const res = await api.get('/warehouse-inventory', {
        params: { per_page: 9999 },
      });
      // Response: { data: [], total, last_page, ... }
      const rows = res.data?.data ?? res.data ?? [];
      setAllInventory(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('[Dashboard] inventory:', err?.response?.status, err?.message);
      setErrInv('Could not load inventory data.');
    } finally {
      setLoadingInv(false);
    }
  }, []);

  // ── Fetch shipments ────────────────────────────────────────────────────────
  const fetchShipments = useCallback(async () => {
    setLoadingShip(true);
    setErrShip(null);
    try {
      const res = await api.get('/inventory/shipments');
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setShipments(rows);
    } catch (err) {
      console.error('[Dashboard] shipments:', err?.response?.status, err?.message);
      setErrShip('Could not load shipments.');
    } finally {
      setLoadingShip(false);
    }
  }, []);

  // ── Fetch deliveries ───────────────────────────────────────────────────────
  const fetchDeliveries = useCallback(async () => {
    setLoadingDel(true);
    setErrDel(null);
    try {
      const res = await api.get('/inventory/logistics', {
        params: { per_page: 9999 },
      });
      // May be plain array or paginated
      const rows = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? []);
      setDeliveries(rows);
    } catch (err) {
      console.error('[Dashboard] deliveries:', err?.response?.status, err?.message);
      setErrDel('Could not load deliveries.');
    } finally {
      setLoadingDel(false);
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    await Promise.all([fetchInventory(), fetchShipments(), fetchDeliveries()]);
    setLastSync(new Date());
    if (silent) setIsRefreshing(false);
  }, [fetchInventory, fetchShipments, fetchDeliveries]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Derived — computed directly from warehouse_inventory table ─────────────
  const noStockItems  = allInventory.filter(i => i.availability === 'NO STOCK');
  const lowStockItems = allInventory.filter(i => i.availability === 'LOW STOCK');
  const onStockItems  = allInventory.filter(i => i.availability === 'ON STOCK');

  // "Critical alerts" = NO STOCK + LOW STOCK rows
  const criticalItems = allInventory
    .filter(i => i.availability === 'NO STOCK' || i.availability === 'LOW STOCK')
    .slice(0, 6);

  // Shipment derived
  const pendingShipments = shipments.filter(s => s.shipment_status !== 'ARRIVED');
  const arrivedPending   = shipments.filter(s => s.shipment_status === 'ARRIVED' && !s.added_to_inventory);

  // Delivery derived
  const inTransit  = deliveries.filter(d => d.status !== 'Delivered');
  const delivered  = deliveries.filter(d => d.status === 'Delivered');

  // Recent slices for feeds
  const recentShipments  = shipments.slice(0, 5);
  const recentDeliveries = deliveries.slice(0, 5);

  const initialLoading = loadingInv && loadingShip && loadingDel;

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="id-wrapper">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="id-header">
        <div className="id-header-left">
          <div className="id-header-icon"><Warehouse size={22} /></div>
          <div>
            <h1 className="id-header-title">Inventory Operations</h1>
            <p className="id-header-sub">
              Welcome back, <strong>{user?.name || 'Staff'}</strong> · {today}
            </p>
          </div>
        </div>
        <div className="id-header-right">
          <div className="id-live-pill">
            <span className="id-live-dot" />
            Real-time
          </div>
          <button
            className={`id-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => fetchAll(true)}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {initialLoading ? (
        <div className="id-loading-screen">
          <div className="id-loading-spinner" />
          <p>Syncing inventory data…</p>
        </div>
      ) : (
        <>
          {/* ══ STAT CARDS ═══════════════════════════════════════════════════ */}
          <div className="id-stats-grid">
            {/* Critical Alerts = total NO STOCK + LOW STOCK across ALL rows */}
            <StatCard
              icon={AlertTriangle}
              label="Critical Alerts"
              value={loadingInv ? '…' : noStockItems.length + lowStockItems.length}
              sub={`${noStockItems.length} no stock · ${lowStockItems.length} low stock`}
              accent="#C20100"
              delay="0ms"
            />
            {/* Active Shipments = not ARRIVED yet */}
            <StatCard
              icon={Ship}
              label="Active Shipments"
              value={loadingShip ? '…' : pendingShipments.length}
              sub={
                arrivedPending.length > 0
                  ? `${arrivedPending.length} pending check-in`
                  : 'All checked in'
              }
              accent="#497B97"
              delay="60ms"
            />
            {/* In-Transit = deliveries not yet marked Delivered */}
            <StatCard
              icon={Truck}
              label="In-Transit Deliveries"
              value={loadingDel ? '…' : inTransit.length}
              sub={`${delivered.length} delivered total`}
              accent="#221F1F"
              delay="120ms"
            />
            {/* Total SKUs = all rows in warehouse_inventory */}
            <StatCard
              icon={Package}
              label="Warehouse SKUs"
              value={loadingInv ? '…' : allInventory.length}
              sub={`${onStockItems.length} on stock`}
              accent="#059669"
              delay="180ms"
            />
          </div>

          {/* ══ MAIN GRID ════════════════════════════════════════════════════ */}
          <div className="id-main-grid">

            {/* ── LEFT ─────────────────────────────────────────────────────── */}
            <div className="id-col-left">

              {/* Critical Stock Alerts */}
              <div className="id-card">
                <SectionHeader
                  icon={AlertTriangle}
                  title="Critical Stock Alerts"
                  sub="Items needing immediate replenishment"
                />
                <div className="id-card-body">
                  {loadingInv ? (
                    <div className="id-section-loading">
                      <div className="id-loading-spinner id-spinner-sm" /> Loading…
                    </div>
                  ) : errInv ? (
                    <SectionError msg={errInv} />
                  ) : criticalItems.length === 0 ? (
                    <div className="id-empty-state">
                      <CheckCircle size={28} style={{ color: '#10B981' }} />
                      <p>All stock levels are healthy</p>
                    </div>
                  ) : criticalItems.map((item, idx) => (
                    <div key={item.id ?? idx} className="id-alert-row">
                      <span
                        className="id-alert-dot"
                        style={{ background: AVAIL_CONFIG[item.availability]?.dot || '#EF4444' }}
                      />
                      <div className="id-alert-info">
                        <span className="id-alert-name">{item.product_code}</span>
                        <span className="id-alert-meta">
                          {item.product_category} ·{' '}
                          <strong style={{ color: item.availability === 'NO STOCK' ? '#C20100' : '#F59E0B' }}>
                            {item.current_stock} {item.unit} remaining
                          </strong>
                        </span>
                      </div>
                      <span className={`id-avail-badge ${AVAIL_CONFIG[item.availability]?.cls || 'avail-no'}`}>
                        {item.availability}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Deliveries */}
              <div className="id-card">
                <SectionHeader
                  icon={Truck}
                  title="Recent Deliveries"
                  sub="Latest dispatch activity"
                />
                <div className="id-card-body">
                  {loadingDel ? (
                    <div className="id-section-loading">
                      <div className="id-loading-spinner id-spinner-sm" /> Loading…
                    </div>
                  ) : errDel ? (
                    <SectionError msg={errDel} />
                  ) : recentDeliveries.length === 0 ? (
                    <div className="id-empty-state">
                      <Truck size={28} style={{ color: '#C8BDB8' }} />
                      <p>No deliveries recorded</p>
                    </div>
                  ) : recentDeliveries.map((d, idx) => (
                    <div key={d.id ?? idx} className="id-feed-row">
                      <div className={`id-feed-icon ${d.status === 'Delivered' ? 'feed-done' : 'feed-transit'}`}>
                        <Truck size={13} />
                      </div>
                      <div className="id-feed-info">
                        <span className="id-feed-title">
                          {d.product_code || '—'}
                          {d.product_category && (
                            <span className="id-feed-cat"> · {d.product_category}</span>
                          )}
                        </span>
                        <span className="id-feed-meta">
                          {d.destination ? `→ ${d.destination}` : ''}
                          {d.driver_name  ? ` · ${d.driver_name}` : ''}
                          {d.project_name ? ` · ${d.project_name}` : ''}
                        </span>
                      </div>
                      <div className="id-feed-right">
                        <span className={`id-delivery-badge ${d.status === 'Delivered' ? 'badge-delivered' : 'badge-transit'}`}>
                          {d.status || 'In Transit'}
                        </span>
                        <span className="id-feed-date">{d.date_of_delivery || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT ────────────────────────────────────────────────────── */}
            <div className="id-col-right">

              {/* Incoming Shipments */}
              <div className="id-card">
                <SectionHeader
                  icon={Ship}
                  title="Incoming Shipments"
                  sub="Active procurement pipeline"
                />
                {!loadingShip && arrivedPending.length > 0 && (
                  <div className="id-arrived-banner">
                    <PackageCheck size={14} />
                    <span>
                      <strong>{arrivedPending.length}</strong>{' '}
                      shipment{arrivedPending.length !== 1 ? 's' : ''} arrived — pending inventory check-in
                    </span>
                  </div>
                )}
                <div className="id-card-body">
                  {loadingShip ? (
                    <div className="id-section-loading">
                      <div className="id-loading-spinner id-spinner-sm" /> Loading…
                    </div>
                  ) : errShip ? (
                    <SectionError msg={errShip} />
                  ) : recentShipments.length === 0 ? (
                    <div className="id-empty-state">
                      <Ship size={28} style={{ color: '#C8BDB8' }} />
                      <p>No shipments found</p>
                    </div>
                  ) : recentShipments.map((s, idx) => {
                    const statusCfg = SHIPMENT_STATUS[s.shipment_status] || SHIPMENT_STATUS.WAITING;
                    const isReserve = !s.shipment_purpose || s.shipment_purpose === 'RESERVE_FOR_PROJECT';
                    return (
                      <div key={s.id ?? idx} className="id-feed-row">
                        <div className={`id-feed-icon ${s.origin_type === 'INTERNATIONAL' ? 'feed-intl' : 'feed-local'}`}>
                          {s.origin_type === 'INTERNATIONAL'
                            ? <Globe size={13} />
                            : <Building2 size={13} />}
                        </div>
                        <div className="id-feed-info">
                          <span className="id-feed-title">
                            {s.shipment_number}
                            {s.added_to_inventory && (
                              <span className="id-inv-chip">✓ In Inventory</span>
                            )}
                          </span>
                          <span className="id-feed-meta">
                            {s.container_type} ·{' '}
                            {isReserve
                              ? <><FolderOpen size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Reserve</>
                              : <><Box size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> New Stock</>}
                            {(s.projects?.length ?? 0) > 0 &&
                              ` · ${s.projects.length} item${s.projects.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                        <div className="id-feed-right">
                          <span className={`id-ship-badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                          {s.tentative_arrival
                            ? <span className="id-feed-date">{s.tentative_arrival}</span>
                            : <span className="id-feed-date id-tba">TBA</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inventory Snapshot */}
              <div className="id-card">
                <SectionHeader
                  icon={Warehouse}
                  title="Inventory Snapshot"
                  sub="Full warehouse stock health"
                />
                {loadingInv ? (
                  <div className="id-section-loading" style={{ padding: '1.5rem' }}>
                    <div className="id-loading-spinner id-spinner-sm" /> Loading…
                  </div>
                ) : errInv ? (
                  <SectionError msg={errInv} />
                ) : (
                  <>
                    <div className="id-snapshot-bars">
                      {[
                        { label: 'On Stock',  count: onStockItems.length,  cls: 'on'   },
                        { label: 'Low Stock', count: lowStockItems.length, cls: 'low'  },
                        { label: 'No Stock',  count: noStockItems.length,  cls: 'none' },
                      ].map(({ label, count, cls }) => (
                        <div key={label} className="id-snapshot-row">
                          <span className="id-snap-label">{label}</span>
                          <div className="id-snap-bar-track">
                            <div
                              className={`id-snap-bar ${cls}`}
                              style={{
                                width: allInventory.length
                                  ? `${(count / allInventory.length) * 100}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="id-snap-count">{count}</span>
                        </div>
                      ))}
                    </div>

                    {noStockItems.length > 0 && (
                      <div className="id-nostock-list">
                        <p className="id-nostock-label">Out of Stock — Immediate Action Required</p>
                        {noStockItems.slice(0, 4).map((item, i) => (
                          <div key={i} className="id-nostock-row">
                            <span className="id-nostock-dot" />
                            <span className="id-nostock-cat">{item.product_category}</span>
                            <span className="id-nostock-code">{item.product_code}</span>
                          </div>
                        ))}
                        {noStockItems.length > 4 && (
                          <p className="id-nostock-more">+{noStockItems.length - 4} more items</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryDashboard;