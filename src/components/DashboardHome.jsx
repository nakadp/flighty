import React from 'react';
import { Plus, Settings, Share2, List as ListIcon, Activity, Map as MapIcon, Globe, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { formatDistance } from '../utils/calculations';
import SettingsModal from './SettingsModal';
import ShareSheet from './ShareSheet';
import FlightList from './FlightList';
import FlightForm from './FlightForm';

// DashboardHome encapsulates the main "Overlay" UI for the default view.
// It receives all necessary state and handlers from App.jsx to avoid intricate prop drilling or Context for now.

export default function DashboardHome({
    user,
    stats,
    currency,
    accentColor,
    viewMode,
    setViewMode,
    showForm,
    setShowForm,
    showList,
    setShowList,
    showSettings,
    setShowSettings,
    flights,
    trips,
    editingTrip,
    editingFlight,
    setEditingFlight,
    setEditingTrip,
    apiConfig,
    setApiConfig,
    handleSetCurrency,
    handleSetLanguage,
    handleShare,
    handleDeleteFlight,
    handleDeleteTrip,
    handleEditFlight,
    handleExportData,
    handleCloseForm,
    handleSaveTrip,
    handleUpdateApiConfig,
    handleSetAccentColor,
    sharing,
    shareImage,
    showShareSheet,
    setShowShareSheet,
    handleSaveImage,
    handleNativeShare,
    handleCopyLink
}) {
    const { t } = useLanguage();

    const navigate = useNavigate();

    const getAccentText = () => `text-${accentColor}-400`;
    const getAccentBg = () => `bg-${accentColor}-600`;

    return (
        <>
            {/* HEADER STATS */}
            <div className={`absolute top-0 left-0 right-0 h-auto min-h-[80px] md:h-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-2 md:py-0 pointer-events-none`}>
                {/* User Profile */}
                <div className="flex items-center gap-4 pointer-events-auto w-full md:w-auto">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className={`w-10 h-10 rounded-full border border-${accentColor}-500/50`} />
                    ) : (
                        <div className={`w-10 h-10 rounded-full bg-${accentColor}-900/50 border border-${accentColor}-500/30 flex items-center justify-center ${getAccentText()} font-bold`}>
                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                        </div>
                    )}

                    <div>
                        <h1 className="text-lg font-black tracking-tighter text-white">SKYTRACE</h1>
                        <div className={`text-[10px] ${getAccentText()} uppercase tracking-[0.2em]`}>{user.displayName || 'Private Log'}</div>
                    </div>
                </div>

                {/* Stats */}
                <div className={`flex items-center gap-2 md:gap-8 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity mt-2 md:mt-0 w-full md:w-auto justify-center md:justify-end`} onClick={() => setShowList(true)}>
                    <div className="text-center">
                        <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('flights')}</div>
                        <div className="text-sm md:text-xl font-bold text-white font-mono">{stats.count}</div>
                    </div>
                    <div className="h-6 md:h-8 w-px bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('distance')}</div>
                        <div className={`text-sm md:text-xl font-bold ${getAccentText()} font-mono`}>{formatDistance(stats.distance)} <span className={`text-[10px] md:text-xs ${getAccentText()}/70`}>km</span></div>
                    </div>
                    <div className="h-6 md:h-8 w-px bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('hours')}</div>
                        <div className="text-sm md:text-xl font-bold text-white font-mono">{stats.hours} <span className="text-[10px] md:text-xs text-slate-500">h</span></div>
                    </div>
                    <div className="h-6 md:h-8 w-px bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('cost')}</div>
                        <div className="text-sm md:text-xl font-bold text-white font-mono">
                            <span className="text-[10px] md:text-xs text-slate-500 mr-1">{currency}</span>
                            {stats.totalCost.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="hidden md:block w-24"></div>
            </div>

            {/* DASHBOARD ACTIONS (Moved here from App.jsx, keeping only Dashboard specific ones) */}
            <div className="share-ignore absolute right-4 md:right-6 top-[45%] md:top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-4 z-40 pointer-events-auto">

                {/* Analysis Button */}
                <button
                    onClick={() => navigate('/analysis')}
                    className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
                >
                    <TrendingUp size={20} />
                    <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Analysis</span>
                </button>

                {/* View Mode Toggle */}
                <button
                    onClick={() => setViewMode(viewMode === '3D' ? '2D' : '3D')}
                    className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
                >
                    <MapIcon size={20} className={viewMode === '3D' ? 'block' : 'hidden'} />
                    <Globe size={20} className={viewMode === '2D' ? 'block' : 'hidden'} />
                    <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{viewMode === '3D' ? '2D View' : '3D View'}</span>
                </button>

                <button
                    onClick={handleShare}
                    className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
                >
                    {sharing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div> : <Share2 size={20} />}
                    <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('share') || "Share"}</span>
                </button>

                <button
                    onClick={() => setShowList(true)}
                    className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
                >
                    <ListIcon size={20} />
                    <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('flight_history')}</span>
                </button>

                <button
                    onClick={() => setShowSettings(true)}
                    className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
                >
                    <Settings size={20} />
                    <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('settings')}</span>
                </button>
            </div>

            {/* FAB - Add Flight */}
            <div className="share-ignore absolute bottom-20 right-4 md:bottom-8 md:right-6 z-40 pointer-events-auto">
                <button
                    onClick={() => { setEditingFlight(null); setShowForm(true); }}
                    className={`group relative flex items-center justify-center w-14 h-14 rounded-full ${getAccentBg()} hover:bg-${accentColor}-500 text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-110 active:scale-95`}
                >
                    <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse"></div>
                    <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* MODALS */}
            <ShareSheet
                isOpen={showShareSheet}
                onClose={() => setShowShareSheet(false)}
                image={shareImage}
                onSave={handleSaveImage}
                onShare={handleNativeShare}
                onCopyLink={handleCopyLink}
                accentColor={accentColor}
            />

            {showSettings && (
                <SettingsModal
                    user={user}
                    onClose={() => setShowSettings(false)}
                    accentColor={accentColor}
                    setAccentColor={handleSetAccentColor}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    currency={currency}
                    setCurrency={handleSetCurrency}
                    setLanguage={handleSetLanguage}
                    apiConfig={apiConfig}
                    setApiConfig={handleUpdateApiConfig}
                />
            )}

            {showList && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="w-full max-w-2xl h-full max-h-[85vh] pointer-events-auto">
                        <FlightList
                            flights={flights}
                            trips={trips}
                            currency={currency}
                            onClose={() => setShowList(false)}
                            onDelete={handleDeleteFlight}
                            onDeleteTrip={handleDeleteTrip}
                            onEdit={handleEditFlight}
                            onExportData={handleExportData}
                            accentColor={accentColor}
                        />
                    </div>
                </div>
            )}

            {showForm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
                    <div className="pointer-events-auto w-full max-w-2xl">
                        <FlightForm
                            initialTrip={editingTrip}
                            initialData={editingFlight}
                            existingFlights={flights}
                            onClose={handleCloseForm}
                            onSubmit={handleSaveTrip}
                            accentColor={accentColor}
                            apiConfig={apiConfig}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
