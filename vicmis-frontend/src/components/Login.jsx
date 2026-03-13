import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './Login.css';

const Login = ({ onEnterSystem }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [show2FA, setShow2FA] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Timer Logic for 2FA
    useEffect(() => {
        let timer;
        if (show2FA && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
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
            const response = await api.post('/verify-2fa', {
                email: email,
                code: twoFactorCode
            });

            if (response.data.access_token) {
                const { access_token, user } = response.data;

                // --- CRITICAL: Use sessionStorage to match App.js ---
                sessionStorage.setItem('token', access_token);
                sessionStorage.setItem('user', JSON.stringify(user));

                // Update axios instance for immediate subsequent calls
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

                setTimeout(() => {
                    setIsLoading(false);
                    onEnterSystem(user); // Triggers state update in App.js
                }, 500);
            }
        } catch (err) {
            setIsLoading(false);
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        }
    };

    return (
        <div className="landing-screen flex items-center justify-center min-h-screen bg-gray-100">
            <div className="login-box bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <div className="brand-header text-center mb-8">
                    <div className="logo-square bg-red-600 text-white w-12 h-12 flex items-center justify-center rounded mx-auto mb-4 font-bold text-xl">
                        VE
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Vision International</h1>
                    <p className="text-gray-500 text-sm">
                        {show2FA ? 'Security Verification' : 'Internal Management System'}
                    </p>
                </div>

                <form onSubmit={show2FA ? handleVerifyCode : handleLogin} className="space-y-4">
                    {!show2FA ? (
                        <>
                            <div className="input-group">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                    value={email}
                                    disabled={isLoading}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@vision.com"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                    value={password}
                                    disabled={isLoading}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div className="input-group">
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Enter 6-Digit Code</label>
                            <div className="text-center text-xs mb-2">
                                Expires in: <span className={`font-bold ${timeLeft < 10 ? 'text-red-600' : 'text-gray-600'}`}>{timeLeft}s</span>
                            </div>
                            <input
                                type="text"
                                maxLength="6"
                                className="otp-input w-full text-center text-2xl tracking-widest p-2 border-2 border-red-500 rounded font-mono"
                                placeholder="000000"
                                value={twoFactorCode}
                                disabled={isLoading}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className="mt-4 text-center">
                                {canResend ? (
                                    <button type="button" className="text-red-600 text-sm hover:underline" onClick={handleLogin}>
                                        Resend Code
                                    </button>
                                ) : (
                                    <span className="text-gray-400 text-sm italic">Wait to resend...</span>
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="enter-btn w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors disabled:bg-gray-400" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (show2FA ? 'Verify & Enter' : 'Sign In')}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 text-sm rounded flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;