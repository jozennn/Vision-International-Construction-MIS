import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/api/axios.js';
import './NotificationBell.css';

// ── Toast component ───────────────────────────────────────────────────────────
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

    const getModalStyle = (msg) => {
        if (msg?.includes('REJECTED') || msg?.includes('Rejected')) {
            return { borderTop: '3px solid #b91c1c' };
        }
        if (msg?.includes('NO STOCK')) {
            return { borderTop: '3px solid #dc2626' };
        }
        if (msg?.includes('LOW STOCK')) {
            return { borderTop: '3px solid #d97706' };
        }
        return { borderTop: '3px solid #C20100' };
    };

    const getModalIcon = (msg) => {
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-PH', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="notif-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="notif-modal" style={getModalStyle(notif.message)}>
                <div className="notif-modal-header">
                    <div className="notif-modal-header-left">
                        <span className="notif-modal-icon">{getModalIcon(notif.message)}</span>
                        <h3>Notification Details</h3>
                    </div>
                    <button className="notif-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="notif-modal-body">
                    <div className="notif-modal-message">
                        <p className="notif-modal-text">{notif.message}</p>
                    </div>

                    <div className="notif-modal-meta">
                        <span className="notif-modal-label">Received:</span>
                        <span className="notif-modal-value">{formatDate(notif.created_at)}</span>
                    </div>

                    {notif.project_id && (
                        <div className="notif-modal-meta">
                            <span className="notif-modal-label">Project ID:</span>
                            <span className="notif-modal-value">#{notif.project_id}</span>
                        </div>
                    )}

                    {notif.project_name && (
                        <div className="notif-modal-meta">
                            <span className="notif-modal-label">Project Name:</span>
                            <span className="notif-modal-value">{notif.project_name}</span>
                        </div>
                    )}

                    {notif.target_department && (
                        <div className="notif-modal-meta">
                            <span className="notif-modal-label">Department:</span>
                            <span className="notif-modal-value">{notif.target_department}</span>
                        </div>
                    )}

                    <div className="notif-modal-meta">
                        <span className="notif-modal-label">Status:</span>
                        <span className={`notif-modal-status ${notif.is_read ? 'status-read' : 'status-unread'}`}>
                            {notif.is_read ? '✓ Read' : '🔴 Unread'}
                        </span>
                    </div>
                </div>

                <div className="notif-modal-footer">
                    {notif.project_id && (
                        <button 
                            className="notif-modal-btn notif-modal-btn-primary"
                            onClick={() => {
                                onClose();
                                onViewProject(notif);
                            }}
                        >
                            View Project
                        </button>
                    )}
                    <button className="notif-modal-btn notif-modal-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main bell ─────────────────────────────────────────────────────────────────
const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [readIds, setReadIds]             = useState(new Set());
    const [isOpen, setIsOpen]               = useState(false);
    const [toasts, setToasts]               = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const prevIdsRef                        = useRef(new Set());
    const dropdownRef                       = useRef(null);

    // ── Message classifiers ───────────────────────────────────────────────────
    const isRejected      = (msg) => msg?.includes('REJECTED') || msg?.includes('Rejected');
    const isNoStock       = (msg) => msg?.includes('NO STOCK');
    const isLowStock      = (msg) => msg?.includes('LOW STOCK');
    const isReorder       = (msg) => msg?.includes('Reorder') || msg?.includes('reorder');
    const isDispatched    = (msg) => msg?.includes('Dispatched') || msg?.includes('In Transit');
    const isShipment      = (msg) => msg?.includes('Shipment') || msg?.includes('🚢');
    const isMaterial      = (msg) => msg?.includes('Material Request') || msg?.includes('📦');
    const isUrgent        = (msg) => msg?.includes('Approval Needed') || msg?.includes('Action Required');
    const isCompleted     = (msg) => msg?.includes('✅');
    const isBilling       = (msg) => msg?.includes('Billing');
    const isLeadConverted = (msg) => msg?.includes('Lead Converted');

    const getNotifStyle = (msg, isRead) => {
        if (isRead) return { borderLeft: '3px solid #cbd5e1', backgroundColor: '#f8fafc', opacity: 0.55 };
        if (isRejected(msg))      return { borderLeft: '3px solid #b91c1c', backgroundColor: '#fef2f2' };
        if (isNoStock(msg))       return { borderLeft: '3px solid #dc2626', backgroundColor: '#fff1f2' };
        if (isLowStock(msg))      return { borderLeft: '3px solid #d97706', backgroundColor: '#fffbeb' };
        if (isReorder(msg))       return { borderLeft: '3px solid #ea580c', backgroundColor: '#fff7ed' };
        if (isDispatched(msg))    return { borderLeft: '3px solid #2563eb', backgroundColor: '#eff6ff' };
        if (isShipment(msg))      return { borderLeft: '3px solid #0891b2', backgroundColor: '#ecfeff' };
        if (isMaterial(msg))      return { borderLeft: '3px solid #0369a1', backgroundColor: '#f0f9ff' };
        if (isUrgent(msg))        return { borderLeft: '3px solid #d97706', backgroundColor: '#fffbeb' };
        if (isCompleted(msg))     return { borderLeft: '3px solid #15803d', backgroundColor: '#f0fdf4' };
        if (isBilling(msg))       return { borderLeft: '3px solid #7c3aed', backgroundColor: '#faf5ff' };
        if (isLeadConverted(msg)) return { borderLeft: '3px solid #059669', backgroundColor: '#ecfdf5' };
        return { borderLeft: '3px solid #497B97', backgroundColor: '#f8fafc' };
    };

    const getNotifIcon = (msg, isRead) => {
        if (isRead) return '✓';
        if (isRejected(msg))      return '❌';
        if (isNoStock(msg))       return '🚨';
        if (isLowStock(msg))      return '⚠️';
        if (isReorder(msg))       return '🔄';
        if (isDispatched(msg))    return '🚚';
        if (isShipment(msg))      return '🚢';
        if (isMaterial(msg))      return '📦';
        if (isUrgent(msg))        return '🔴';
        if (isCompleted(msg))     return '✅';
        if (isBilling(msg))       return '💳';
        if (isLeadConverted(msg)) return '🎉';
        return '🔔';
    };

    // ── Format message with details ──────────────────────────────────────────
    const formatMessage = (notif) => {
        let message = notif.message;
        if (notif.project_name && !message.includes(notif.project_name)) {
            message = `${message} (${notif.project_name})`;
        }
        return message;
    };

    // ── Show modal instead of navigating directly ────────────────────────────
    const showNotificationModal = (notif) => {
        setSelectedNotification(notif);
        setIsOpen(false);
    };

    const closeModal = () => {
        setSelectedNotification(null);
    };

    // ── Navigate to project (from modal) ─────────────────────────────────────
    const navigateToProject = useCallback((notif) => {
        if (!notif.project_id) return;
        sessionStorage.setItem('autoOpenProjectId', notif.project_id);
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Project' }));
        window.dispatchEvent(new CustomEvent('open-project', { detail: notif.project_id }));
    }, []);

    // ── Mark single as read ───────────────────────────────────────────────────
    const markRead = async (notif) => {
        if (readIds.has(notif.id)) return;
        try {
            await api.post(`/notifications/${notif.id}/read`);
            setReadIds(prev => new Set([...prev, notif.id]));
            // Update the notification in the list to mark as read
            setNotifications(prev => prev.map(n => 
                n.id === notif.id ? { ...n, is_read: true } : n
            ));
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    // ── Handle notification click - SHOW MODAL instead of direct navigation ───
    const handleNotificationClick = async (notif) => {
        if (!readIds.has(notif.id)) {
            await markRead(notif);
        }
        // Show the modal with notification details
        showNotificationModal(notif);
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

    // ── Fetch notifications ───────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        try {
            const res  = await api.get('/notifications');
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
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

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
            {/* Toast stack */}
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
                    onClose={closeModal}
                    onViewProject={navigateToProject}
                />
            )}

            {/* Bell and Dropdown */}
            <div className="notif-wrapper" ref={dropdownRef}>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(o => !o);
                    }} 
                    className="notif-button"
                >
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>

                {isOpen && (
                    <div className="notif-dropdown">
                        <div className="notif-header">
                            <span>Alerts & Updates</span>
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
                                <div className="notif-empty">You're all caught up! 🎉</div>
                            ) : (
                                notifications.map(notif => {
                                    const isRead = readIds.has(notif.id);
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`notif-item ${isRead ? 'notif-item--read' : ''}`}
                                            style={getNotifStyle(notif.message, isRead)}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <p className={`notif-text ${isRead ? 'notif-text--read' : ''}`}>
                                                {getNotifIcon(notif.message, isRead)} {formatMessage(notif)}
                                            </p>
                                            {notif.project_id && (
                                                <p className="notif-hint">
                                                    Click to view details →
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationBell;