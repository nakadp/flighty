import React from 'react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Globe, Plane } from 'lucide-react';
import GlobeView from './GlobeView'; // Re-use the globe background if possible, or just an image

export default function Login() {

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login Failed:", error);
            alert("Login Failed: " + error.message);
        }
    };

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center font-sans">

            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                {/* Reusing the Starry texture logic or just a dark gradient for now */}
                <img src="https://unpkg.com/three-globe/example/img/night-sky.png" className="w-full h-full object-cover opacity-50" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0"></div>

            {/* Login Card */}
            <div className="glass-panel z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col items-center text-center animate-in zoom-in-95 duration-500">

                <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <Plane className="text-cyan-400 rotate-45" size={40} />
                </div>

                <h1 className="text-3xl font-black text-cyan-400 mb-2 tracking-tight">SKYTRACE</h1>
                <p className="text-slate-400 mb-8 text-sm uppercase tracking-widest">Your Personal Flight History, Synced Forever.</p>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-cyan-50 hover:scale-[1.02] transition-all shadow-xl group"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="mt-8 text-xs text-slate-500">
                    Secure Cloud Sync via Firebase
                </div>
            </div>
        </div>
    );
}
