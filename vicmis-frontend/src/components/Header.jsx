import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="header-wrapper">
      <header className="main-header">
        
        {/* --- LEFT: User Greeting & Clock --- */}
        <div className="header-left">
          <div className="user-info">
            <h1 className="welcome-msg">Hello, {user?.name || 'Anonymous'}</h1>
            <p className="live-date">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="live-time"> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        {/* --- RIGHT: User Avatar --- */}
        <div className="header-right">
          <div className="user-avatar">{user?.name?.charAt(0) || 'G'}</div>
        </div>

      </header>
    </div>
  );
};

export default Header;