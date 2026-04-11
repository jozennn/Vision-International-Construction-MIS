import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import './Login.css';

const LOCKOUT_MINS = 15;
const LOCKOUT_MS   = LOCKOUT_MINS * 60 * 1000;
const OTP_SECONDS  = 300;
const LS_KEY       = 'vicmis_lockout_until'; // localStorage key

const Login = ({ onEnterSystem }) => {
    const [email, setEmail]                 = useState('');
    const [password, setPassword]           = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [show2FA, setShow2FA]             = useState(false);
    const [error, setError]                 = useState('');
    const [isLoading, setIsLoading]         = useState(false);
    const [timeLeft, setTimeLeft]           = useState(OTP_SECONDS);
    const [canResend, setCanResend]         = useState(false);
    const [showPassword, setShowPassword]   = useState(false);
    const [rememberMe, setRememberMe]       = useState(false);

    const [lockedUntil, setLockedUntil]     = useState(null);
    const [lockCountdown, setLockCountdown] = useState(0);

    // ── Restore lockout from localStorage on page load ──────────────────
    useEffect(() => {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
            const until = parseInt(stored, 10);
            if (until > Date.now()) {
                setLockedUntil(until);
            } else {
                // Lockout expired while away — clean up
                localStorage.removeItem(LS_KEY);
            }
        }
    }, []);

    // ── Lockout countdown tick ──────────────────────────────────────────
    useEffect(() => {
        if (!lockedUntil) return;
        const tick = () => {
            const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setLockedUntil(null);
                setLockCountdown(0);
                localStorage.removeItem(LS_KEY);
            } else {
                setLockCountdown(remaining);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lockedUntil]);

    // ── OTP expiry timer ────────────────────────────────────────────────
    useEffect(() => {
        if (!show2FA) return;
        setTimeLeft(OTP_SECONDS);
        setCanResend(false);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [show2FA]);

    const formatCountdown = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const formatTimeLeft = (secs) => {
        if (secs >= 60) {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return s > 0 ? `${m}m ${s}s` : `${m}m`;
        }
        return `${secs}s`;
    };

    // ── Set lockout and persist to localStorage ─────────────────────────
    const applyLockout = (remainingSeconds) => {
        const until = Date.now() + (remainingSeconds * 1000);
        setLockedUntil(until);
        localStorage.setItem(LS_KEY, until.toString());
    };

    // ── Phase 1: Initial Login ──────────────────────────────────────────
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        if (lockedUntil) return;
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/login', { email, password, remember_me: rememberMe });
            if (response.data.status === '2FA_REQUIRED') {
                setTimeout(() => {
                    setIsLoading(false);
                    setShow2FA(true);
                    setCanResend(false);
                }, 800);
            }
        } catch (err) {
            setIsLoading(false);
            setEmail('');
            setPassword('');

            if (!err.response) {
                setError('Connection Error. Please check your internet connection and try again.');
                return;
            }

            const status = err.response.status;
            const data   = err.response.data;

            // ── 429: Server-side lockout triggered ──────────────────────
            // Backend returns remaining_seconds so we sync exactly with
            // the server's cache TTL — survives page refresh via localStorage.
            if (status === 429) {
                const remaining = data.remaining_seconds ?? (LOCKOUT_MINS * 60);
                applyLockout(remaining);
                setError(`Too many failed attempts. Please try again after ${LOCKOUT_MINS} minutes.`);
                return;
            }

            // ── 401: Wrong credentials ──────────────────────────────────
            setError('Wrong Email or Password. Please try again.');
        }
    };

    // ── Phase 2: Verify OTP Code ────────────────────────────────────────
    const handleVerifyCode = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/verify-2fa', { email, code: twoFactorCode });
            if (response.data.user) {
                const { user } = response.data;
                setTimeout(() => {
                    setIsLoading(false);
                    onEnterSystem(user);
                }, 500);
            }
        } catch (err) {
            setIsLoading(false);
            setTwoFactorCode('');

            if (!err.response) {
                setError('Connection Error. Please check your internet connection and try again.');
                return;
            }

            const status = err.response.status;
            const data   = err.response.data;

            // ── 429: 2FA lockout ────────────────────────────────────────
            if (status === 429) {
                const remaining = data.remaining_seconds ?? (LOCKOUT_MINS * 60);
                applyLockout(remaining);
                setShow2FA(false);
                setError(`Too many failed attempts. Please try again after ${LOCKOUT_MINS} minutes.`);
                return;
            }

            setError('Invalid or expired verification code. Please try again.');
        }
    };

    // ── Resend Code ─────────────────────────────────────────────────────
    const handleResend = async () => {
        setError('');
        setTwoFactorCode('');
        setShow2FA(false);
        await handleLogin(null);
    };

    // ── Back to Login ───────────────────────────────────────────────────
    const handleBackToLogin = () => {
        setShow2FA(false);
        setTwoFactorCode('');
        setError('');
        setEmail('');
        setPassword('');
    };

    return (
        <div
            className="landing-screen"
            style={{ backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.72), rgba(10, 25, 47, 0.72)), url('/login-2.jpg')` }}
        >
            {/* ── Brand block ── */}
            <div className="brand-above">
                <img className="brand-logo" src="/vite.svg.jpg" alt="Logo" />
                <h1 className="brand-name">Vision International Construction OPC</h1>
                <p className="brand-tagline">"You Envision, We Build!"</p>
                <div className="brand-divisions">
                    <span>Vision Floors</span><span className="divider">|</span>
                    <span>Vision Sports</span><span className="divider">|</span>
                    <span>Vision Ceilings</span><span className="divider">|</span>
                    <span>Vision Care</span><span className="divider">|</span>
                    <span>Vision Walls</span>
                </div>
            </div>

            {/* ── Login card ── */}
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
                                    disabled={isLoading || !!lockedUntil}
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
                                        disabled={isLoading || !!lockedUntil}
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

                            <div className="remember-me-row">
                                <label className="remember-me-label">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                        className="remember-me-checkbox"
                                        disabled={isLoading || !!lockedUntil}
                                    />
                                    <span className="remember-me-text">Remember me for 30 days</span>
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="input-group">
                            <label style={{ textAlign: 'center', display: 'block' }}>
                                Enter 6-Digit Code
                            </label>
                            <div className="timer-display">
                                Expires in:{' '}
                                <span className={timeLeft < 30 ? 'urgent' : ''}>
                                    {formatTimeLeft(timeLeft)}
                                </span>
                            </div>
                            <input
                                type="text"
                                maxLength="6"
                                className="otp-input"
                                placeholder="000000"
                                value={twoFactorCode}
                                disabled={isLoading}
                                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                required
                                autoFocus
                            />
                            <div className="resend-container">
                                {canResend ? (
                                    <button type="button" className="resend-btn" onClick={handleResend}>
                                        Resend Code
                                    </button>
                                ) : (
                                    <span className="helper-text">
                                        Resend available in {formatTimeLeft(timeLeft)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lockout banner — shows even after refresh */}
                    {lockedUntil && (
                        <div className="lockout-banner">
                            🔒 Account temporarily locked. Try again in{' '}
                            <strong>{formatCountdown(lockCountdown)}</strong>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="enter-btn"
                        disabled={isLoading || !!lockedUntil}
                    >
                        {isLoading ? (
                            <span className="loader-container">
                                <span className="spinner" /> Processing…
                            </span>
                        ) : show2FA ? 'Verify & Enter' : 'Sign In'}
                    </button>

                    {show2FA && (
                        <button type="button" className="back-link" onClick={handleBackToLogin}>
                            ← Back to Login
                        </button>
                    )}
                </form>

                {error && <div className="login-error">⚠️ {error}</div>}
            </div>

            {/* ── Footer ── */}
            <footer className="login-footer">
                <div className="footer-socials">
                    <a href="https://www.facebook.com/vision.intlconstruction" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M22 12c0-5.522-4.478-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.988H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                    </a>
                    <a href="https://www.instagram.com/visionintlconstruct" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                    <a href="https://www.youtube.com/@VisionIntlCons" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/@visioninternationalcons" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/></svg>
                    </a>
                </div>
                <div className="footer-contact">
                    <span>📞 0917-833-9655 / 0917-194-0786</span>
                    <span>✉️ vision.intlconstruct@gmail.com</span>
                    <span>📍 Block 5, Unit 1, 888 Industrial Megacity, Highway 2000, Phase 2, Taytay Rizal, CALABARZON, Philippines</span>
                </div>
                <p className="footer-glory">To God Be The Glory</p>
            </footer>
        </div>
    );
};

export default Login;