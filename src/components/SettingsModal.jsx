import React, { useState, useEffect } from 'react';
import { X, User, Palette, Globe, LogOut, ChevronRight, ArrowLeft, Database, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase'; // Import db if needed for direct fetching, otherwise use props
import { collection, getDocs, query, where } from 'firebase/firestore'; // For fresh fetch if needed
import { CURRENCIES } from '../data/currencies';
// import * as XLSX from 'xlsx'; // Not needed if using helper, but wait, exportData uses it. SettingsModal doesn't need it direct if using helper.
import { exportToExcel } from '../utils/exportData';

function SettingsModal({ user, onClose, accentColor, setAccentColor, viewMode, setViewMode, currency, setCurrency, setLanguage }) {
    const { t, language } = useLanguage();

    // On desktop: always 'account' (or whatever). On mobile: null initially (showing menu)
    // We can use a single state 'activeTab' 
    // Desktop: activeTab is always set to something.
    // Mobile: activeTab can be null (menu mode).
    const isMobile = window.innerWidth < 768; // Simple check for initial state
    const [activeTab, setActiveTab] = useState(isMobile ? null : 'account');

    // Handle resize to reset state if switching desktop/mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && !activeTab) {
                setActiveTab('account');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeTab]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            onClose();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const handleExportFlights = async () => {
        if (!user) return;
        try {
            // Fetch everything: Flights AND Trips
            const qFlights = query(collection(db, "test"), where("userId", "==", user.uid));
            const qTrips = query(collection(db, "trips"), where("userId", "==", user.uid));

            const [flightsSnap, tripsSnap] = await Promise.all([
                getDocs(qFlights),
                getDocs(qTrips)
            ]);

            const flights = flightsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            const trips = tripsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            await exportToExcel(user, trips, flights);

        } catch (error) {
            console.error("Export Error:", error);
            alert("Failed to export data: " + error.message);
        }
    };

    const tabs = [
        { id: 'account', icon: User, label: t('account') },
        { id: 'general', icon: Globe, label: t('general') },
        { id: 'appearance', icon: Palette, label: t('appearance') },
        { id: 'data', icon: Database, label: t('data') || "Data" },
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    // Sub-components for cleaner render
    const renderContent = () => (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="hidden md:block text-2xl font-bold text-white mb-1">{t('account')}</h3>
                        <p className="text-slate-400 text-sm hidden md:block">{t('logged_in_as')}</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 text-center md:text-left">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-${accentColor}-500 shadow-lg shrink-0`} />
                        ) : (
                            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-${accentColor}-900/50 border border-${accentColor}-500/30 flex items-center justify-center text-${accentColor}-400 font-bold text-xl md:text-2xl shrink-0`}>
                                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                        <div className="min-w-0 w-full">
                            <h4 className="text-lg md:text-xl font-bold text-white truncate">{user?.displayName || "User"}</h4>
                            <p className="text-slate-400 text-xs md:text-sm break-all">{user?.email}</p>
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
                <div className="space-y-8">
                    <div>
                        <h3 className="hidden md:block text-2xl font-bold text-white mb-6">{t('general')}</h3>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('language')}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`p-4 rounded-xl border transition-all text-left ${language === 'en'
                                    ? `bg-${accentColor}-500/20 border-${accentColor}-500/50 text-white`
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <div className="font-bold">English</div>
                                <div className="text-xs opacity-70">English</div>
                            </button>
                            <button
                                onClick={() => setLanguage('zh-CN')}
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

                    {/* CURRENCY SELECTOR */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('currency') || "Currency"}</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.code} - {c.symbol} {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="hidden md:block text-2xl font-bold text-white mb-6">{t('appearance')}</h3>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('accent_color')}</label>
                        <div className="flex flex-wrap gap-4">
                            {['cyan', 'violet', 'orange', 'emerald', 'rose'].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setAccentColor(color)}
                                    className={`w-12 h-12 rounded-full border-4 transition-all ${accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: `var(--color-${color})` }}
                                >
                                    <div className={`w-full h-full rounded-full bg-${color}-500`}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="hidden md:block text-2xl font-bold text-white mb-6">{t('data') || "Data"}</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-start gap-4">
                            <div className="flex items-center gap-3 text-lg font-medium text-white">
                                <Database size={24} className={`text-${accentColor}-400`} />
                                Export Data
                            </div>
                            <p className="text-slate-400 text-sm">Download your complete flight history as an Excel spreadsheet (.xlsx).</p>
                            <button
                                onClick={handleExportFlights}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-${accentColor}-600 text-white hover:bg-${accentColor}-500 transition-colors font-medium`}
                            >
                                <Download size={18} />
                                {t('export_excel') || "Export to Excel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-0 md:border border-slate-800 rounded-none md:rounded-2xl w-full max-w-2xl h-full md:h-[600px] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">

                {/* --- MOBILE LAYOUT --- */}
                {/* 1. Mobile Menu View (Only visible if no active tab on mobile) */}
                <div className={`md:hidden flex-1 flex flex-col ${activeTab ? 'hidden' : 'flex'}`}>
                    <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-950/50">
                        <h2 className="text-lg font-bold text-white">{t('settings')}</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between text-white hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-${accentColor}-500/20 text-${accentColor}-400`}>
                                        <tab.icon size={20} />
                                    </div>
                                    <span className="font-medium text-lg">{tab.label}</span>
                                </div>
                                <ChevronRight size={20} className="text-slate-500" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Mobile Detail View (Only visible if active tab is set on mobile) */}
                <div className={`md:hidden flex-1 flex flex-col ${activeTab ? 'flex' : 'hidden'} bg-slate-900`}>
                    <div className="p-4 flex items-center gap-4 border-b border-white/10 bg-slate-950/50">
                        <button onClick={() => setActiveTab(null)} className="text-slate-400 hover:text-white">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-lg font-bold text-white flex-1">{currentTab?.label}</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
                        {activeTab && renderContent()}
                    </div>
                </div>


                {/* --- DESKTOP LAYOUT --- */}
                {/* Sidebar */}
                <div className="hidden md:block w-48 bg-slate-950/50 border-r border-slate-800 p-4 shrink-0">
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

                {/* Desktop Content */}
                <div className="hidden md:block flex-1 p-8 overflow-y-auto relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                        <X size={24} />
                    </button>
                    {renderContent()}
                </div>

            </div>
        </div>
    );
}

export default SettingsModal;
