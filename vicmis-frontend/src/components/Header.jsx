import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import NotificationBell from './NotificationBell';

const Header = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcement, setAnnouncement] = useState(null);
  
  // ─── PROFILE MODAL STATES ─────────────────────────────────
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || null);
  const fileInputRef = useRef(null);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── PHOTO UPLOAD HANDLER ─────────────────────────────────
  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Instantly preview the image on the frontend
    const previewUrl = URL.createObjectURL(file);
    setProfilePhoto(previewUrl);
    
    // NOTE: This is where you will send it to Laravel later!
    // const formData = new FormData();
    // formData.append('profile_photo', file);
    // await api.post('/user/profile-photo', formData);
  };

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // 👇 UPDATED: Filter out unfinished modules AND restrict 'Setting'
  const hiddenModules = ['Documents', 'Human Resource', 'Accounting'];
  
  // If they are not the Super Admin, hide the Settings module from their passport!
  if (user?.role !== 'super_admin') {
    hiddenModules.push('Setting', 'Settings'); 
  }

  const activePermissions = user?.permissions?.filter(mod => !hiddenModules.includes(mod)) || [];

  return (
    <div className="header-wrapper">
      <header className="main-header">
        <div className="header-left">
          <div className="user-info">
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

        <div className="header-right flex items-center gap-4">
          <NotificationBell />

          {/* ─── HEADER AVATAR (CLICK TO OPEN MODAL) ─── */}
          <div 
            className="user-avatar" 
            onClick={openProfileModal}
            style={{ 
              cursor: 'pointer', 
              backgroundImage: profilePhoto ? `url(${profilePhoto})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: profilePhoto ? 'transparent' : 'inherit'
            }}
            title="View Profile & Settings"
          >
            {!profilePhoto && (user?.name?.charAt(0).toUpperCase() || 'U')}
          </div>
        </div>
      </header>

      {/* =========================================
          🚀 THE NEW PROFILE MODAL
          ========================================= */}
      {isProfileModalOpen && (
        <div className="profile-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeProfileModal()}>
          <div className="profile-modal-content">
            <button className="profile-close-btn" onClick={closeProfileModal}>✕</button>
            
            <div className="profile-modal-grid">
              
              {/* LEFT COLUMN: IDENTITY */}
              <div className="profile-identity-section">
                <div className="profile-avatar-large-wrapper">
                  <div 
                    className="profile-avatar-large"
                    style={{ 
                      backgroundImage: profilePhoto ? `url(${profilePhoto})` : 'none',
                    }}
                  >
                    {!profilePhoto && (user?.name?.charAt(0).toUpperCase() || 'U')}
                    
                    {/* CAMERA OVERLAY FOR UPLOAD */}
                    <div className="avatar-upload-overlay" onClick={() => fileInputRef.current.click()}>
                      <span>📷</span>
                      <small>Change Photo</small>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                </div>

                <h2 className="profile-name">{user?.name || 'Staff User'}</h2>
                <p className="profile-email">{user?.email || 'No email provided'}</p>
                <div className="profile-badges">
                  <span className="profile-badge dept">{user?.department || 'Unassigned'}</span>
                  <span className="profile-badge role">{user?.role ? user.role.replace('_', ' ').toUpperCase() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;