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
                <h2 className="text-sm font-light text-slate-400 tracking-[0.2em]">{t('login_subtitle')}</h2>
            </div>

            <div className={`w-full max-w-md bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group`}>
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-${accentColor}-500 to-transparent opacity-50`}></div>

                {/* Simple Mode Toggle */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 pb-2 border-b-2 font-medium transition-colors ${isLogin ? `border-${accentColor}-500 text-white` : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        {t('sign_in')}
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 pb-2 border-b-2 font-medium transition-colors ${!isLogin ? `border-${accentColor}-500 text-white` : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        {t('create_account')}
                    </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('email_address')}</label>
                        <div className="relative group/input">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-white transition-colors" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('password')}</label>
                        <div className="relative group/input">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-white transition-colors" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-${accentColor}-900/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
                        {loading ? t('processing') : (isLogin ? t('sign_in') : t('create_account'))}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center"><span className="bg-zinc-900 px-4 text-xs text-slate-500 uppercase tracking-wider">{t('continue_with')}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onGoogleLogin}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" /><path fill="currentColor" d="M12 4.35c1.14 0 2.17.39 2.97 1.17l2.23-2.23c-1.43-1.34-3.53-2.09-5.2-2.09-4.29 0-8.01 2.46-9.82 6.55l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Google
                    </button>
                    <button
                        onClick={onGuestLogin}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
                    >
                        <User size={20} />
                        {t('guest')}
                    </button>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs opacity-50 hover:opacity-100 transition-opacity cursor-default">
                <ShieldCheck size={14} />
                <span>{t('cloud_sync')}</span>
            </div>
        </div>
    );
}
