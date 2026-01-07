import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Plane, Calendar, MapPin, Settings, Share2, Globe, Map as MapIcon, List as ListIcon, LogOut } from 'lucide-react';
import GlobeView from './components/GlobeView';
import MapView from './components/MapView';
import FlightForm from './components/FlightForm';
import FlightList from './components/FlightList';
import Login from './components/Login';
import SettingsModal from './components/SettingsModal';
import { calculateDistance, formatDistance } from './utils/calculations';
import { useLanguage } from './context/LanguageContext';

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

function App() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('2D');
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [accentColor, setAccentColor] = useState('cyan');

  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [editingFlight, setEditingFlight] = useState(null);

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Window Resize Hook
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stats Memo
  const stats = useMemo(() => {
    const totalDist = flights.reduce((acc, flight) => {
      return acc + calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng);
    }, 0);

    const totalCost = flights.reduce((acc, flight) => {
      return acc + (parseFloat(flight.cost) || 0);
    }, 0);

    return {
      count: flights.length,
      distance: totalDist,
      hours: Math.round(totalDist / 740),
      totalCost
    };
  }, [flights]);

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth State Changed:", currentUser ? "Logged In" : "Logged Out", currentUser);
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // FIRESTORE LISTENER
  useEffect(() => {
    if (!user) {
      setFlights([]);
      return;
    }

    console.log("Setting up Firestore watcher for:", user.uid);
    // Filter by userId
    const q = query(
      collection(db, "test"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubscribeData = onSnapshot(q, (snapshot) => {
      console.log("Firestore Snapshot received. Docs:", snapshot.docs.length);
      const flightData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setFlights(flightData);
    }, (error) => {
      console.error("Firestore Error:", error);
      // Helpful alert for missing index (common when adding composite queries)
      if (error.message.includes("indexes")) {
        alert("Database Error: Index required. Check console for link to create it.");
      } else {
        alert("Database Error: " + error.message);
      }
    });

    return () => unsubscribeData();
  }, [user]);

  // LOADING STATE
  if (loadingAuth) return <div className="w-screen h-screen bg-black text-white flex items-center justify-center">{t('loading')}</div>;

  // LOGIN SCREEN
  if (!user) return <Login />;

  const handleSaveFlight = async (flight) => {
    if (!user) return;

    try {
      const flightRef = doc(db, "test", flight.id); // Use flight.id as Doc ID

      // Ensure flight has userId
      const flightData = {
        ...flight,
        userId: user.uid
      };

      await setDoc(flightRef, flightData); // Merges or Create
    } catch (e) {
      console.error("Error saving flight:", e);
      alert("Error saving: " + e.message);
    }

    setEditingFlight(null);
    setShowForm(false);
  };

  const handleDeleteFlight = async (id) => {
    if (!user) return;
    try {
      if (confirm(t('confirm_delete'))) {
        await deleteDoc(doc(db, "test", id));
      }
    } catch (e) {
      console.error("Error removing flight:", e);
    }
  };

  const handleEditFlight = (flight) => {
    setEditingFlight(flight);
    setShowForm(true);
    setShowList(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFlight(null);
  };

  // Helper to get accent class (simple mapping for now or use style)
  const getAccentText = () => `text-${accentColor}-400`;
  const getAccentBorder = () => `border-${accentColor}-500`;
  const getAccentBg = () => `bg-${accentColor}-600`;

  // Safelist for Tailwind (Hidden)
  // text-cyan-400 text-violet-400 text-orange-400 text-emerald-400 text-rose-400
  // border-cyan-500 border-violet-500 border-orange-500 border-emerald-500 border-rose-500
  // bg-cyan-600 bg-violet-600 bg-orange-600 bg-emerald-600 bg-rose-600
  // hover:bg-cyan-500 hover:bg-violet-500 hover:bg-orange-500 hover:bg-emerald-500 hover:bg-rose-500
  // bg-cyan-900 bg-violet-900 bg-orange-900 bg-emerald-900 bg-rose-900

  // Determine if running in Electron
  const isElectron = window.ipcRenderer || (window.process && window.process.type === 'renderer') || navigator.userAgent.includes('Electron');

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {viewMode === '3D' ? (
          <GlobeView
            flights={flights}
            width={dimensions.width}
            height={dimensions.height}
            onFlightClick={setSelectedFlight}
          />
        ) : (
          <MapView flights={flights} onFlightClick={setSelectedFlight} />
        )}
      </div>

      {/* TOP BAR */}
      <div className={`absolute top-0 left-0 right-0 h-auto min-h-[80px] md:h-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-2 md:py-0 transition-all ${isElectron ? 'pointer-events-none' : ''}`}>
        <div className="flex items-center gap-4 pointer-events-auto w-full md:w-auto">
          {user.photoURL ? (
            <img src={user.photoURL} alt="User" className={`w-10 h-10 rounded-full border ${getAccentBorder()}/50`} />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-${accentColor}-900/50 border border-${accentColor}-500/30 flex items-center justify-center ${getAccentText()} font-bold`}>
              {user.displayName ? user.displayName.charAt(0) : 'U'}
            </div>
          )}

          <div>
            <h1 className="text-lg font-black tracking-tighter text-white">SKYTRACE</h1>
            <div className={`text-[10px] ${getAccentText()} uppercase tracking-[0.2em]`}>{user.displayName || "Private Log"}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity mt-2 md:mt-0 w-full md:w-auto justify-center md:justify-end" onClick={() => setShowList(true)}>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('flights')}</div>
            <div className="text-xl font-bold text-white font-mono">{stats.count}</div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('distance')}</div>
            <div className={`text-xl font-bold ${getAccentText()} font-mono`}>{formatDistance(stats.distance)} <span className={`text-xs ${getAccentText()}/70`}>km</span></div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('hours')}</div>
            <div className="text-xl font-bold text-white font-mono">{stats.hours} <span className="text-xs text-slate-500">h</span></div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{t('cost')}</div>
            <div className="text-xl font-bold text-white font-mono">
              <span className="text-xs text-slate-500 mr-1">{currency}</span>
              {stats.totalCost.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Placeholder for balance */}
        <div className="hidden md:block w-24"></div>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="absolute right-4 md:right-6 top-[60%] md:top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-4 z-40 pointer-events-auto">
        <button
          onClick={() => setViewMode(m => m === '3D' ? '2D' : '3D')}
          className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-${accentColor}-500/20 hover:border-${accentColor}-400/50 hover:${getAccentText()} transition-all shadow-lg group relative`}
        >
          {viewMode === '3D' ? <MapIcon size={20} /> : <Globe size={20} />}
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('switch_view')}</span>
        </button>

        <button
          onClick={() => setShowList(true)}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-lg group relative"
        >
          <ListIcon size={20} />
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('flight_history')}</span>
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-lg group relative"
        >
          <Settings size={20} />
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('settings')}</span>
        </button>
      </div>

      {/* FAB */}
      <div className="absolute bottom-6 right-4 md:bottom-8 md:right-6 z-40 pointer-events-auto">
        <button
          onClick={() => { setEditingFlight(null); setShowForm(true); }}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full ${getAccentBg()} hover:bg-${accentColor}-500 text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-110 active:scale-95`}
        >
          <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse"></div>
          <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* MODALS */}
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currency={currency}
          setCurrency={setCurrency}
        />
      )}

      {showList && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl h-full max-h-[85vh] pointer-events-auto">
            <FlightList
              flights={flights}
              onClose={() => setShowList(false)}
              onDelete={handleDeleteFlight}
              onEdit={handleEditFlight}
            />
          </div>
        </div>
      )}

      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="pointer-events-auto w-full max-w-2xl">
            <FlightForm
              initialData={editingFlight}
              onClose={handleCloseForm}
              onSubmit={handleSaveFlight}
            />
          </div>
        </div>
      )}

      {selectedFlight && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="pointer-events-auto bg-slate-900/95 border border-white/10 rounded-2xl p-8 w-full max-w-md relative shadow-2xl backdrop-blur-xl">
            <button onClick={() => setSelectedFlight(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
            <div className="text-center space-y-4">
              {selectedFlight.airline && <div className={`font-bold uppercase tracking-widest text-sm ${getAccentText()}`}>{selectedFlight.airline} {selectedFlight.flightNumber}</div>}

              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-black text-white leading-none">{selectedFlight.depCode}</div>
                  {selectedFlight.depCountry && <div className="text-[10px] text-slate-500 uppercase mt-1">{selectedFlight.depCountry}</div>}
                </div>
                <Plane className="text-slate-600 rotate-90" size={24} />
                <div className="text-center">
                  <div className="text-4xl font-black text-white leading-none">{selectedFlight.arrCode}</div>
                  {selectedFlight.arrCountry && <div className="text-[10px] text-slate-500 uppercase mt-1">{selectedFlight.arrCountry}</div>}
                </div>
              </div>

              <div className="h-px bg-white/10 w-full"></div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('distance')}</div>
                  <div className="text-lg font-mono text-white">{formatDistance(calculateDistance(selectedFlight.depLat, selectedFlight.depLng, selectedFlight.arrLat, selectedFlight.arrLng))} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('date')}</div>
                  <div className="text-lg font-mono text-white">{selectedFlight.date}</div>
                </div>
                {selectedFlight.aircraft && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('aircraft')}</div>
                    <div className="text-white">{selectedFlight.aircraft}</div>
                  </div>
                )}
                {selectedFlight.notes && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('notes')}</div>
                    <div className="text-slate-400 text-sm italic">{selectedFlight.notes}</div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {isElectron && <div className="absolute top-0 left-0 right-0 h-6 z-[100] app-region-drag" />}
    </div>
  );
}

export default App;

