import React, { useState, useEffect } from 'react';
import api from '@/api/axios.js';
import './NotificationBell.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen]               = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []); // 👈 empty dependency array, no token needed

    const handleNotificationClick = async (notif) => {
        setIsOpen(false);
        setNotifications(prev => prev.filter(n => n.id !== notif.id));

        try {
            await api.post(`/notifications/${notif.id}/read`);
        } catch (err) {
            console.error("Failed to mark as read", err);
        }

        if (notif.project_id) {
            sessionStorage.setItem('autoOpenProjectId', notif.project_id);
            alert(`🔔 NOTIFICATION:\n\n${notif.message}`);
            window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Project' }));
            window.dispatchEvent(new CustomEvent('open-project', { detail: notif.project_id }));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await Promise.all(
                notifications.map(n => api.post(`/notifications/${n.id}/read`))
            );
            setNotifications([]);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const isRejected  = (msg) => msg?.includes('REJECTED');
    const isUrgent    = (msg) => msg?.includes('Approval Needed') || msg?.includes('Action Required');
    const isMaterial  = (msg) => msg?.includes('Material Request') || msg?.includes('📦');
    const isCompleted = (msg) => msg?.includes('✅');
    const isBilling   = (msg) => msg?.includes('Billing');

    const getNotifStyle = (msg) => {
        if (isRejected(msg))  return { borderLeft: '3px solid var(--color-border-danger)',  background: 'var(--color-background-danger)'  };
        if (isUrgent(msg))    return { borderLeft: '3px solid var(--color-border-warning)', background: 'var(--color-background-warning)' };
        if (isCompleted(msg)) return { borderLeft: '3px solid var(--color-border-success)', background: 'var(--color-background-success)' };
        if (isMaterial(msg))  return { borderLeft: '3px solid var(--color-border-info)',    background: 'var(--color-background-info)'    };
        if (isBilling(msg))   return { borderLeft: '3px solid var(--color-border-info)',    background: 'var(--color-background-info)'    };
        return {};
    };

    const getNotifIcon = (msg) => {
        if (isRejected(msg))  return '⚠️';
        if (isUrgent(msg))    return '🔴';
        if (isCompleted(msg)) return '✅';
        if (isMaterial(msg))  return '📦';
        if (isBilling(msg))   return '💳';
        return '🔔';
    };

    return (
        <div className="notif-wrapper">
            <button onClick={() => setIsOpen(!isOpen)} className="notif-button">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {notifications.length > 0 && (
                    <span className="notif-badge">{notifications.length}</span>
                )}
            </button>

            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span>Alerts & Updates</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="notif-header-badge">{notifications.length} New</span>
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    style={{
                                        fontSize: '11px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-secondary)',
                                        textDecoration: 'underline',
                                        padding: 0,
                                    }}
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notif-body">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">You're all caught up! 🎉</div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className="notif-item"
                                    style={getNotifStyle(notif.message)}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <p className="notif-text">
                                        {getNotifIcon(notif.message)} {notif.message}
                                    </p>
                                    {notif.project_id && (
                                        <p className="notif-hint">Click to view project</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;