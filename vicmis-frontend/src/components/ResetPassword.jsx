import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './ResetPassword.css';

const ResetPassword = () => {
  // 1. Grab token and email from the URL ONCE when the component first loads and save them to state.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [email] = useState(() => new URLSearchParams(window.location.search).get('email'));

  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: ''
  });

  const [status, setStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      // If they arrived without a token/email, show an error
      setStatus('error');
      setErrorMessage('Invalid or expired password reset link. Please contact the Super Admin.');
    } else {
      // 2. THE MAGIC TRICK: If token and email exist, erase them from the browser's address bar instantly!
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [token, email]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirmation) {
      setStatus('error');
      setErrorMessage('Passwords do not match. Please try again.');
      return;
    }

    if (formData.password.length < 6) {
      setStatus('error');
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      setStatus('loading');
      setErrorMessage('');

      await api.post('/reset-password', {
        token: token, // Uses the state we saved in step 1
        email: email, // Uses the state we saved in step 1
        password: formData.password,
        password_confirmation: formData.password_confirmation
      });

      setStatus('success');
    } catch (err) {
      console.error("Reset error:", err);
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    }
  };

  return (
    <div className="landing-screen"
    style={{ backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.72), rgba(10, 25, 47, 0.72)), url('/login-2.jpg')` }}>
      
      {/* BRAND BLOCK (Outside the card, just like Login) */}
      <div className="brand-above">
        <img className="brand-logo" src="/vite.svg.jpg" alt="Logo" /> 
        <h1 className="brand-name">VISION INTERNATIONAL<br />CONSTRUCTION OPC</h1>
        <p className="brand-tagline">"You Envision, We build!"</p>
      </div>

      {/* LOGIN CARD CLONE */}
      <div className="login-box animate-fade-in">
        <p className="card-system-label">PASSWORD RESET SYSTEM</p>

        {status === 'success' ? (
          <div className="reset-success-box">
            <div className="success-icon">✅</div>
            <h3 style={{ color: '#1e293b', marginTop: 0 }}>Password Updated</h3>
            <p className="helper-text" style={{ marginBottom: '20px' }}>
              Your password has been successfully reset. You can now securely access the system.
            </p>
            <button className="enter-btn" onClick={() => window.location.href = '/'}>
              Proceed to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {status === 'error' && (
              <div className="login-error">
                {errorMessage}
              </div>
            )}

            <div className="input-group">
              <label>EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={email || ''} 
                disabled 
                style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }}
              />
            </div>

            <div className="input-group">
              <label>NEW PASSWORD</label>
              <div className="password-wrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password" 
                  placeholder="Password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                  disabled={status === 'loading'} 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>CONFIRM PASSWORD</label>
              <input 
                type={showPassword ? "text" : "password"}
                name="password_confirmation" 
                placeholder="Password" 
                value={formData.password_confirmation} 
                onChange={handleInputChange} 
                required 
                disabled={status === 'loading'} 
              />
            </div>

            <button type="submit" className="enter-btn" disabled={status === 'loading' || !token || !email}>
              {status === 'loading' ? (
                <div className="loader-container">
                  <span className="spinner"></span>
                  <span className="checking-pulse">Saving...</span>
                </div>
              ) : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;