import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './Login.css';

const Login = ({ onEnterSystem }) => {
    const [email, setEmail]                 = useState('');
    const [password, setPassword]           = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [show2FA, setShow2FA]             = useState(false);
    const [error, setError]                 = useState('');
    const [isLoading, setIsLoading]         = useState(false);
    const [timeLeft, setTimeLeft]           = useState(60);
    const [canResend, setCanResend]         = useState(false);
    const [showPassword, setShowPassword]   = useState(false);

    // Timer Logic for 2FA
    useEffect(() => {
        let timer;
        if (show2FA && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setCanResend(true);
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [show2FA, timeLeft]);

    // Phase 1: Initial Login
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/login', { email, password });
            if (response.data.status === '2FA_REQUIRED') {
                setTimeout(() => {
                    setIsLoading(false);
                    setShow2FA(true);
                    setTimeLeft(60);
                    setCanResend(false);
                }, 800);
            }
        } catch (err) {
            setIsLoading(false);
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        }
    };

    // Phase 2: Verify OTP Code
    const handleVerifyCode = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/verify-2fa', { email, code: twoFactorCode });
            if (response.data.access_token) {
                const { access_token, user } = response.data;
                sessionStorage.setItem('token', access_token);
                sessionStorage.setItem('user', JSON.stringify(user));
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                setTimeout(() => {
                    setIsLoading(false);
                    onEnterSystem(user);
                }, 500);
            }
        } catch (err) {
            setIsLoading(false);
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        }
    };

    return (
        <div
            className="landing-screen"
            style={{ backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.72), rgba(10, 25, 47, 0.72)), url('/login-2.jpg')` }}
        >
            {/* ── Brand block OUTSIDE the card, above it ── */}
            <div className="brand-above">
                <img className="brand-logo" src="/vite.svg.jpg" alt="Logo" />
                <h1 className="brand-name">Vision International Construction OPC</h1>
                <p className="brand-tagline">"You Envision, We build!"</p>
            </div>

            {/* ── Login card — no logo inside, just the form ── */}
            <div className="login-box">
                <p className="card-system-label">
                    {show2FA ? 'Security Verification' : 'Management Information System'}
                </p>

                <form onSubmit={show2FA ? handleVerifyCode : handleLogin}>
                    {!show2FA ? (
                        <>
                            <div className="input-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled={isLoading}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Email"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        disabled={isLoading}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="input-group">
                            <label style={{ textAlign: 'center', display: 'block' }}>
                                Enter 6-Digit Code
                            </label>
                            <div className="timer-display">
                                Expires in:{' '}
                                <span className={timeLeft < 10 ? 'urgent' : ''}>
                                    {timeLeft}s
                                </span>
                            </div>
                            <input
                                type="text"
                                maxLength="6"
                                className="otp-input"
                                placeholder="000000"
                                value={twoFactorCode}
                                disabled={isLoading}
                                onChange={e => setTwoFactorCode(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className="resend-container">
                                {canResend ? (
                                    <button
                                        type="button"
                                        className="resend-btn"
                                        onClick={handleLogin}
                                    >
                                        Resend Code
                                    </button>
                                ) : (
                                    <span className="helper-text">Wait to resend…</span>
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="enter-btn" disabled={isLoading}>
                        {isLoading ? (
                            <span className="loader-container">
                                <span className="spinner" /> Processing…
                            </span>
                        ) : show2FA ? 'Verify & Enter' : 'Sign In'}
                    </button>
                </form>

                {error && (
                    <div className="login-error">⚠️ {error}</div>
                )}
            </div>
        </div>
    );
};

export default Login;
