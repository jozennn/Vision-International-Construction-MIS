import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios.js';
import './NotificationBell.css';

// ── Toast component for popup notifications ───────────────────────────────────
const NotifToast = ({ notif, onClose, onView }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [onClose]);

    const isRejectedMsg = notif.message?.includes('REJECTED') || notif.message?.includes('Rejected');

    return (
        <div className={`notif-toast ${isRejectedMsg ? 'notif-toast--rejected' : ''}`}>
            <div className="notif-toast__icon">{isRejectedMsg ? '⚠️' : '🔔'}</div>
            <div className="notif-toast__body">
                <p className="notif-toast__title">{isRejectedMsg ? 'Rejected' : 'New Notification'}</p>
                <p className="notif-toast__msg">{notif.message}</p>
                {notif.project_id && (
                    <button className="notif-toast__link" onClick={() => { onView(notif); onClose(); }}>
                        View project →
                    </button>
                )}
            </div>
            <button className="notif-toast__close" onClick={onClose}>✕</button>
        </div>
    );
};

// ── Individual Notification Item Component ────────────────────────────────────
const NotificationItem = ({ notif, isRead, onMarkRead, onViewDetails }) => {
    const getIcon = () => {
        const msg = notif.message;
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) return '❌';
        if (msg?.includes('NO STOCK')) return '🚨';
        if (msg?.includes('LOW STOCK')) return '⚠️';
        if (msg?.includes('Dispatched') || msg?.includes('In Transit')) return '🚚';
        if (msg?.includes('Shipment')) return '🚢';
        if (msg?.includes('Material Request')) return '📦';
        if (msg?.includes('Reorder')) return '🔄';
        if (msg?.includes('✅')) return '✅';
        if (msg?.includes('Lead Converted')) return '🎉';
        if (msg?.includes('Billing')) return '💳';
        return '🔔';
    };

    const getStatusColor = () => {
        const msg = notif.message;
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) return '#b91c1c';
        if (msg?.includes('NO STOCK')) return '#dc2626';
        if (msg?.includes('LOW STOCK')) return '#d97706';
        if (msg?.includes('Dispatched')) return '#2563eb';
        if (msg?.includes('Shipment')) return '#0891b2';
        if (msg?.includes('Material Request')) return '#0369a1';
        if (msg?.includes('✅')) return '#15803d';
        return '#497B97';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    };

    return (
        <div 
            className={`notif-modal-item ${isRead ? 'notif-modal-item--read' : ''}`}
            onClick={() => onViewDetails(notif)}
            style={{ borderLeftColor: getStatusColor() }}
        >
            <div className="notif-modal-item-icon">{getIcon()}</div>
            <div className="notif-modal-item-content">
                <p className="notif-modal-item-message">{notif.message}</p>
                <div className="notif-modal-item-meta">
                    <span className="notif-modal-item-time">{formatDate(notif.created_at)}</span>
                    {notif.project_name && (
                        <span className="notif-modal-item-project">📁 {notif.project_name}</span>
                    )}
                    {notif.target_department && (
                        <span className="notif-modal-item-dept">🏢 {notif.target_department}</span>
                    )}
                </div>
            </div>
            {!isRead && <div className="notif-modal-item-unread-dot" />}
        </div>
    );
};

// ── Main Notification Modal Component ─────────────────────────────────────────
const NotificationModal = ({ notifications, readIds, onClose, onMarkRead, onViewDetails, onMarkAllRead, onRefresh }) => {
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
    
    const filteredNotifications = notifications.filter(notif => {
        const isRead = readIds.has(notif.id);
        if (filter === 'unread') return !isRead;
        if (filter === 'read') return isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    return (
        <div className="notif-modal-overlay" onClick={onClose}>
            <div className="notif-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="notif-modal-header">
                    <div className="notif-modal-header-left">
                        <span className="notif-modal-header-icon">🔔</span>
                        <h2>Notifications</h2>
                        {unreadCount > 0 && (
                            <span className="notif-modal-header-badge">{unreadCount} new</span>
                        )}
                    </div>
                    <div className="notif-modal-header-right">
                        <button className="notif-modal-refresh" onClick={onRefresh} title="Refresh">
                            🔄
                        </button>
                        <button className="notif-modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="notif-modal-tabs">
                    <button 
                        className={`notif-modal-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button 
                        className={`notif-modal-tab ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Unread
                        {unreadCount > 0 && <span className="notif-modal-tab-badge">{unreadCount}</span>}
                    </button>
                    <button 
                        className={`notif-modal-tab ${filter === 'read' ? 'active' : ''}`}
                        onClick={() => setFilter('read')}
                    >
                        Read
                    </button>
                    {unreadCount > 0 && (
                        <button className="notif-modal-mark-all" onClick={onMarkAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="notif-modal-list">
                    {filteredNotifications.length === 0 ? (
                        <div className="notif-modal-empty">
                            <span className="notif-modal-empty-icon">📭</span>
                            <p>No notifications</p>
                            <span className="notif-modal-empty-sub">You're all caught up!</span>
                        </div>
                    ) : (
                        filteredNotifications.map(notif => (
                            <NotificationItem
                                key={notif.id}
                                notif={notif}
                                isRead={readIds.has(notif.id)}
                                onMarkRead={onMarkRead}
                                onViewDetails={onViewDetails}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="notif-modal-footer">
                    <span className="notif-modal-footer-text">
                        {notifications.length} total notifications
                    </span>
                </div>
            </div>
        </div>
    );
};

// ── Notification Detail View Modal ───────────────────────────────────────────
const NotificationDetailModal = ({ notif, onClose, onViewProject }) => {
    if (!notif) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getIcon = () => {
        const msg = notif.message;
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) return '❌';
        if (msg?.includes('NO STOCK')) return '🚨';
        if (msg?.includes('LOW STOCK')) return '⚠️';
        if (msg?.includes('Dispatched') || msg?.includes('In Transit')) return '🚚';
        if (msg?.includes('Shipment')) return '🚢';
        if (msg?.includes('Material Request')) return '📦';
        if (msg?.includes('Reorder')) return '🔄';
        if (msg?.includes('✅')) return '✅';
        return '🔔';
    };

    const getHeaderColor = () => {
        const msg = notif.message;
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) return '#b91c1c';
        if (msg?.includes('NO STOCK')) return '#dc2626';
        if (msg?.includes('LOW STOCK')) return '#d97706';
        if (msg?.includes('Dispatched')) return '#2563eb';
        return '#C20100';
    };

    return (
        <div className="notif-detail-overlay" onClick={onClose}>
            <div className="notif-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="notif-detail-header" style={{ borderBottomColor: getHeaderColor() }}>
                    <div className="notif-detail-header-left">
                        <span className="notif-detail-icon">{getIcon()}</span>
                        <h3>Notification Details</h3>
                    </div>
                    <button className="notif-detail-close" onClick={onClose}>✕</button>
                </div>

                <div className="notif-detail-body">
                    <div className="notif-detail-message">
                        <p>{notif.message}</p>
                    </div>

                    <div className="notif-detail-info">
                        <div className="notif-detail-row">
                            <span className="notif-detail-label">📅 Received:</span>
                            <span className="notif-detail-value">{formatDate(notif.created_at)}</span>
                        </div>
                        {notif.project_id && (
                            <div className="notif-detail-row">
                                <span className="notif-detail-label">📁 Project ID:</span>
                                <span className="notif-detail-value">#{notif.project_id}</span>
                            </div>
                        )}
                        {notif.project_name && (
                            <div className="notif-detail-row">
                                <span className="notif-detail-label">🏗️ Project Name:</span>
                                <span className="notif-detail-value">{notif.project_name}</span>
                            </div>
                        )}
                        {notif.target_department && (
                            <div className="notif-detail-row">
                                <span className="notif-detail-label">🏢 Department:</span>
                                <span className="notif-detail-value">{notif.target_department}</span>
                            </div>
                        )}
                        <div className="notif-detail-row">
                            <span className="notif-detail-label">📌 Status:</span>
                            <span className={`notif-detail-status ${notif.is_read ? 'status-read' : 'status-unread'}`}>
                                {notif.is_read ? '✓ Read' : '● Unread'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="notif-detail-footer">
                    {notif.project_id && (
                        <button className="notif-detail-btn-primary" onClick={() => { onClose(); onViewProject(notif); }}>
                            View Project
                        </button>
                    )}
                    <button className="notif-detail-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Bell Component ──────────────────────────────────────────────────────
const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [readIds, setReadIds]             = useState(new Set());
    const [isModalOpen, setIsModalOpen]     = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [toasts, setToasts]               = useState([]);
    const prevIdsRef                        = useRef(new Set());
    const [isLoading, setIsLoading]         = useState(false);

    // ── Mark single as read ───────────────────────────────────────────────────
    const markRead = async (notifId) => {
        if (readIds.has(notifId)) return;
        try {
            await api.post(`/notifications/${notifId}/read`);
            setReadIds(prev => new Set([...prev, notifId]));
            setNotifications(prev => prev.map(n => 
                n.id === notifId ? { ...n, is_read: true } : n
            ));
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    // ── Mark all as read ──────────────────────────────────────────────────────
    const handleMarkAllRead = async () => {
        try {
            const unread = notifications.filter(n => !readIds.has(n.id));
            await Promise.all(unread.map(n => api.post(`/notifications/${n.id}/read`)));
            const allIds = new Set(notifications.map(n => n.id));
            setReadIds(allIds);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    // ── Navigate to project ───────────────────────────────────────────────────
    const navigateToProject = useCallback((notif) => {
        if (!notif.project_id) return;
        sessionStorage.setItem('autoOpenProjectId', notif.project_id);
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Project' }));
        window.dispatchEvent(new CustomEvent('open-project', { detail: notif.project_id }));
    }, []);

    // ── View notification details ────────────────────────────────────────────
    const viewNotificationDetails = (notif) => {
        if (!readIds.has(notif.id)) {
            markRead(notif.id);
        }
        setSelectedNotification(notif);
    };

    const closeDetailModal = () => {
        setSelectedNotification(null);
    };

    // ── Refresh notifications ─────────────────────────────────────────────────
    const refreshNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/notifications');
            const data = res.data ?? [];

            setReadIds(prev => {
                const next = new Set(prev);
                data.forEach(n => { if (n.is_read) next.add(n.id); });
                return next;
            });

            const newOnes = data.filter(n => !prevIdsRef.current.has(n.id) && !n.is_read);
            if (prevIdsRef.current.size > 0 && newOnes.length > 0) {
                newOnes.forEach(n => {
                    setToasts(prev => [...prev, { ...n, toastId: Date.now() + Math.random() }]);
                });
            }

            prevIdsRef.current = new Set(data.map(n => n.id));
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Initial fetch and polling ─────────────────────────────────────────────
    useEffect(() => {
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 15000);
        return () => clearInterval(interval);
    }, [refreshNotifications]);

    const removeToast = (toastId) => setToasts(prev => prev.filter(t => t.toastId !== toastId));
    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    return (
        <>
            {/* Toast stack for popup notifications */}
            <div className="notif-toast-stack">
                {toasts.map(t => (
                    <NotifToast
                        key={t.toastId}
                        notif={t}
                        onClose={() => removeToast(t.toastId)}
                        onView={navigateToProject}
                    />
                ))}
            </div>

            {/* Main Notifications Modal */}
            {isModalOpen && (
                <NotificationModal
                    notifications={notifications}
                    readIds={readIds}
                    onClose={() => setIsModalOpen(false)}
                    onMarkRead={markRead}
                    onViewDetails={viewNotificationDetails}
                    onMarkAllRead={handleMarkAllRead}
                    onRefresh={refreshNotifications}
                />
            )}

            {/* Individual Notification Detail Modal */}
            {selectedNotification && (
                <NotificationDetailModal
                    notif={selectedNotification}
                    onClose={closeDetailModal}
                    onViewProject={navigateToProject}
                />
            )}

            {/* Bell Button */}
            <div className="notif-bell-wrapper">
                <button 
                    className="notif-bell-button"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    {unreadCount > 0 && (
                        <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>
            </div>
        </>
    );
};

export default NotificationBell;