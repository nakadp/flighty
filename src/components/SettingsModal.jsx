import React, { useState } from 'react';
import { X, User, Palette, Globe, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function SettingsModal({ user, onClose, accentColor, setAccentColor, viewMode, setViewMode }) {
    const { t, language, changeLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('account');

    const handleLogout = async () => {
        try {
            await signOut(auth);
            onClose();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const tabs = [
        { id: 'account', icon: User, label: t('account') },
        { id: 'general', icon: Globe, label: t('general') },
        { id: 'appearance', icon: Palette, label: t('appearance') },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[600px] flex overflow-hidden shadow-2xl relative">

                {/* Sidebar */}
                <div className="w-48 bg-slate-950/50 border-r border-slate-800 p-4">
                    <h2 className="text-xl font-bold text-white mb-6 px-4">{t('settings')}</h2>
                    <div className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                    ? `bg-${accentColor}-500/10 text-${accentColor}-400 ring-1 ring-${accentColor}-500/20`
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={18} />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                        <X size={24} />
                    </button>

                    {/* ACCOUNT TAB */}
                    {activeTab === 'account' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">{t('account')}</h3>
                                <p className="text-slate-400 text-sm">{t('logged_in_as')}</p>
                            </div>

                            <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className={`w-20 h-20 rounded-full border-2 border-${accentColor}-500 shadow-lg`} />
                                ) : (
                                    <div className={`w-20 h-20 rounded-full bg-${accentColor}-900/50 border border-${accentColor}-500/30 flex items-center justify-center text-${accentColor}-400 font-bold text-2xl`}>
                                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div>
                                    <h4 className="text-xl font-bold text-white">{user?.displayName || "User"}</h4>
                                    <p className="text-slate-400">{user?.email}</p>
                                </div>
                            </div>

                            <div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20 w-full justify-center font-medium"
                                >
                                    <LogOut size={18} />
                                    {t('switch_account')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-6">{t('general')}</h3>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('language')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => changeLanguage('en')}
                                        className={`p-4 rounded-xl border transition-all text-left ${language === 'en'
                                            ? `bg-${accentColor}-500/20 border-${accentColor}-500/50 text-white`
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="font-bold">English</div>
                                        <div className="text-xs opacity-70">English</div>
                                    </button>
                                    <button
                                        onClick={() => changeLanguage('zh-CN')}
                                        className={`p-4 rounded-xl border transition-all text-left ${language === 'zh-CN'
                                            ? `bg-${accentColor}-500/20 border-${accentColor}-500/50 text-white`
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="font-bold">简体中文</div>
                                        <div className="text-xs opacity-70">Chinese (Simplified)</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APPEARANCE TAB */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-6">{t('appearance')}</h3>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('accent_color')}</label>
                                <div className="flex gap-4">
                                    {['cyan', 'violet', 'orange', 'emerald', 'rose'].map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setAccentColor(color)}
                                            className={`w-12 h-12 rounded-full border-4 transition-all ${accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: `var(--color-${color})` }} // Simplified for demo, ideally map to actual tailwind classes or values
                                        >
                                            <div className={`w-full h-full rounded-full bg-${color}-500`}></div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('view_mode')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setViewMode('2D')}
                                        className={`p-4 rounded-xl border transition-all text-center ${viewMode === '2D'
                                            ? `bg-${accentColor}-500/20 border-${accentColor}-500/50 text-white`
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        2D Map
                                    </button>
                                    <button
                                        onClick={() => setViewMode('3D')}
                                        className={`p-4 rounded-xl border transition-all text-center ${viewMode === '3D'
                                            ? `bg-${accentColor}-500/20 border-${accentColor}-500/50 text-white`
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        3D Globe
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
