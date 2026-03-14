import React, { useState, useEffect } from 'react';
// 1. Import your custom api instance
import api from '@/api/axios.js'; 
import './NotificationBell.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    // Note: 'token' is now handled automatically by the api interceptor, 
    // but we keep it here to check if the user is logged in before fetching.
    const token = sessionStorage.getItem('token');

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            // 2. Used 'api' and a relative path. Headers are handled automatically.
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
    }, [token]);

    const handleNotificationClick = async (notif) => {
        setIsOpen(false);
        setNotifications(prev => prev.filter(n => n.id !== notif.id));

        try {
            // 3. Updated to 'api' instance and relative URL.
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

    return (
        <div className="notif-wrapper">
            <button onClick={() => setIsOpen(!isOpen)} className="notif-button">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {notifications.length > 0 && (
                    <span className="notif-badge">{notifications.length}</span>
                )}
            </button>

            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        Alerts & Updates
                        <span className="notif-header-badge">{notifications.length} New</span>
                    </div>
                    <div className="notif-body">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">You're all caught up! 🎉</div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    className={`notif-item ${notif.message.includes('REJECTED') ? 'rejected' : ''}`} 
                                    onClick={() => handleNotificationClick(notif)} 
                                >
                                    <p className={`notif-text ${notif.message.includes('REJECTED') ? 'rejected-text' : ''}`}>
                                        {notif.message.includes('REJECTED') ? '⚠️ ' : '🔔 '}
                                        {notif.message}
                                    </p>
                                    <p className="notif-hint">Click to view project</p>
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