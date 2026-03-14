import React, { useState, useEffect } from 'react';
import './Header.css';
import NotificationBell from './NotificationBell'; // 🚨 Kept the owner's new bell import!

const Header = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcement, setAnnouncement] = useState(null);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


  return (
    <div className="header-wrapper">
      <header className="main-header">
        <div className="header-left">
          <div className="user-info">
            {/* Merged the fallback name to 'Staff User' from the owner */}
            <h1 className="welcome-msg">Hello, {user?.name || 'Staff User'}</h1>
            <p className="live-date">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="live-time"> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        <div className="header-center">
          {announcement && (
            <div className={`announcement-capsule ${announcement.type || 'notice'}`}>
              <span className="capsule-icon">📢</span>
              <div className="marquee-container">
                <p className="marquee-text">
                  <span className="announcement-date-badge">{announcement.date}</span>
                  <span className="capsule-label">{announcement.type}:</span> {announcement.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 🚨 MERGED SECTION: Owner's flex classes + Your Button + Owner's Bell 🚨 */}
        <div className="header-right flex items-center gap-4">

          <NotificationBell />

          <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
        </div>
      </header>
    </div>
  );
};

export default Header;