import React, { useState } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Plane, Mail, User, Lock, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Login({ accentColor = 'cyan' }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login Failed:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            console.error("Auth Error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeviceLogin = async () => {
        setLoading(true);
        setError('');
        try {
            // 1. Get or Create Device ID
            let deviceId = localStorage.getItem('skytrace_device_id');
            if (!deviceId) {
                deviceId = uuidv4();
                localStorage.setItem('skytrace_device_id', deviceId);
            }

            const deviceEmail = `guest_${deviceId}@skytrace.local`;
            const devicePassword = `skyguest_${deviceId}`;

            try {
                // 2. Try to Sign In
                await signInWithEmailAndPassword(auth, deviceEmail, devicePassword);
            } catch (signInError) {
                // 3. If failed (user not found), Create Account
                if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
                    await createUserWithEmailAndPassword(auth, deviceEmail, devicePassword);
                } else {
                    throw signInError; // Re-throw other errors
                }
            }

        } catch (error) {
            console.error("Device Auth Error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center font-sans">

            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <img src="https://unpkg.com/three-globe/example/img/night-sky.png" className="w-full h-full object-cover opacity-50" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0"></div>

            {/* Login Card */}
            <div className={`glass-panel z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col items-center text-center animate-in zoom-in-95 duration-500 bg-black/40 backdrop-blur-xl shadow-${accentColor}-500/10`}>

                <div className={`w-20 h-20 rounded-full bg-${accentColor}-500/10 border border-${accentColor}-400/30 flex items-center justify-center mb-6 shadow-[0_0_20px_var(--accent-color-hex)]`}>
                    <Plane className={`text-${accentColor}-400 rotate-45`} size={40} />
                </div>

                <h1 className={`text-3xl font-black text-${accentColor}-400 mb-2 tracking-tight`}>SKYTRACE</h1>
                <p className="text-slate-400 mb-8 text-sm uppercase tracking-widest">Your Flight History, Visualize Your World.</p>

                {error && (
                    <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Main Auth Form */}
                <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            type="email"
                            placeholder="Email address"
                            className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-${accentColor}-500/50 focus:ring-1 focus:ring-${accentColor}-500/50 transition-all`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-${accentColor}-500/50 focus:ring-1 focus:ring-${accentColor}-500/50 transition-all`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-6 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-${accentColor}-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                        {!loading && <ArrowRight size={18} />}
                    </button>

                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className={`text-xs text-slate-400 hover:text-${accentColor}-400 transition-colors`}
                        >
                            {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
                        </button>
                    </div>
                </form>

                <div className="relative w-full mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#0a0a0a] px-2 text-slate-600">Or continue with</span>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={`py-2.5 px-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-${accentColor}-50 transition-all disabled:opacity-50`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-sm">Google</span>
                    </button>

                    <button
                        onClick={handleDeviceLogin}
                        disabled={loading}
                        className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <User size={16} />
                        <span className="text-sm">Guest</span>
                    </button>
                </div>

                <div className="mt-8 text-xs text-slate-500">
                    Secure Cloud Sync via Firebase
                </div>
            </div>
        </div>
    );
}
