import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ── Notification Detail Modal ─────────────────────────────────────────────────
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
        <div className="notif-modal-overlay" onClick={onClose}>
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
    const [isOpen, setIsOpen]               = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [toasts, setToasts]               = useState([]);
    const prevIdsRef                        = useRef(new Set());
    const dropdownRef                       = useRef(null);

    // ── Message classifiers for styling ───────────────────────────────────────
    const getNotifStyle = (msg, isRead) => {
        if (isRead) return { borderLeftColor: '#cbd5e1', backgroundColor: '#f8fafc', opacity: 0.55 };
        
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) {
            return { borderLeftColor: '#b91c1c', backgroundColor: '#fef2f2' };
        }
        if (msg?.includes('NO STOCK')) {
            return { borderLeftColor: '#dc2626', backgroundColor: '#fff1f2' };
        }
        if (msg?.includes('LOW STOCK')) {
            return { borderLeftColor: '#d97706', backgroundColor: '#fffbeb' };
        }
        if (msg?.includes('Dispatched') || msg?.includes('In Transit')) {
            return { borderLeftColor: '#2563eb', backgroundColor: '#eff6ff' };
        }
        if (msg?.includes('Shipment')) {
            return { borderLeftColor: '#0891b2', backgroundColor: '#ecfeff' };
        }
        if (msg?.includes('Material Request')) {
            return { borderLeftColor: '#0369a1', backgroundColor: '#f0f9ff' };
        }
        if (msg?.includes('Reorder')) {
            return { borderLeftColor: '#ea580c', backgroundColor: '#fff7ed' };
        }
        if (msg?.includes('✅')) {
            return { borderLeftColor: '#15803d', backgroundColor: '#f0fdf4' };
        }
        return { borderLeftColor: '#497B97', backgroundColor: '#ffffff' };
    };

    const getNotifIcon = (msg, isRead) => {
        if (isRead) return '✓';
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

    // ── Format message for dropdown ──────────────────────────────────────────
    const formatMessage = (message) => {
        if (!message) return 'No message';
        if (message.length > 80) {
            return message.substring(0, 77) + '...';
        }
        return message;
    };

    // ── Format time for dropdown ─────────────────────────────────────────────
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    };

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
    const navigateToProject = (notif) => {
        if (!notif.project_id) return;
        sessionStorage.setItem('autoOpenProjectId', notif.project_id);
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Project' }));
        window.dispatchEvent(new CustomEvent('open-project', { detail: notif.project_id }));
    };

    // ── Show detail modal when clicking a notification ────────────────────────
    const openNotificationDetail = (notif) => {
        setIsOpen(false);
        if (!readIds.has(notif.id)) {
            markRead(notif.id);
        }
        setSelectedNotification(notif);
    };

    const closeDetailModal = () => {
        setSelectedNotification(null);
    };

    // ── Refresh notifications ─────────────────────────────────────────────────
    const refreshNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            const data = res.data ?? [];
            console.log('Notifications fetched:', data.length);

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
        }
    };

    // ── Initial fetch and polling ─────────────────────────────────────────────
    useEffect(() => {
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    // ── Close dropdown on outside click ──────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

            {/* Notification Detail Modal */}
            {selectedNotification && (
                <NotificationDetailModal
                    notif={selectedNotification}
                    onClose={closeDetailModal}
                    onViewProject={navigateToProject}
                />
            )}

            {/* Bell Button with Dropdown */}
            <div className="notif-wrapper" ref={dropdownRef}>
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="notif-button"
                >
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    {unreadCount > 0 && (
                        <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="notif-dropdown">
                        <div className="notif-header">
                            <span>🔔 Alerts & Updates</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="notif-header-badge">{unreadCount} New</span>
                                {unreadCount > 0 && (
                                    <button className="notif-mark-all" onClick={handleMarkAllRead}>
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="notif-body">
                            {notifications.length === 0 ? (
                                <div className="notif-empty">
                                    <span>📭</span>
                                    <p>You're all caught up!</p>
                                    <small>No new notifications</small>
                                </div>
                            ) : (
                                notifications.map(notif => {
                                    const isRead = readIds.has(notif.id);
                                    const style = getNotifStyle(notif.message, isRead);
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`notif-item ${isRead ? 'notif-item--read' : ''}`}
                                            style={{ 
                                                borderLeft: `3px solid ${style.borderLeftColor}`,
                                                backgroundColor: style.backgroundColor,
                                                opacity: style.opacity || 1
                                            }}
                                            onClick={() => openNotificationDetail(notif)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                                                    {getNotifIcon(notif.message, isRead)}
                                                </span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p className="notif-text" style={{ margin: '0 0 6px 0' }}>
                                                        {formatMessage(notif.message)}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
                                                        <span>🕐 {formatTime(notif.created_at)}</span>
                                                        {notif.project_name && (
                                                            <span>📁 {notif.project_name.length > 20 ? notif.project_name.substring(0, 20) + '...' : notif.project_name}</span>
                                                        )}
                                                        {notif.target_department && (
                                                            <span>🏢 {notif.target_department}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!isRead && (
                                                    <div style={{ width: '8px', height: '8px', backgroundColor: '#C20100', borderRadius: '50%', flexShrink: 0, marginTop: '6px' }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        {notifications.length > 0 && (
                            <div className="notif-footer">
                                <span>{notifications.length} total notifications</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationBell;