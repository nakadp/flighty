import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Plane, Calendar, MapPin, Settings, Share2, Globe, Map as MapIcon, List as ListIcon, LogOut, Check, Download, Link } from 'lucide-react';
import GlobeView from './components/GlobeView';
import MapView from './components/MapView';
import FlightForm from './components/FlightForm';
import FlightList from './components/FlightList';
import Login from './components/Login';
import SettingsModal from './components/SettingsModal';
import ShareSheet from './components/ShareSheet';
import { calculateDistance, formatDistance } from './utils/calculations';
import { useLanguage } from './context/LanguageContext';
import { toPng } from 'html-to-image';
import { THEME_COLORS, getThemeHex } from './utils/theme';

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc } from 'firebase/firestore';

function App() {
  const { t, language, changeLanguage } = useLanguage();
  const [viewMode, setViewMode] = useState('2D');
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [accentColor, setAccentColor] = useState('cyan');

  const [flights, setFlights] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [editingFlight, setEditingFlight] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sharing, setSharing] = useState(false);

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

  // UPDATE CSS VARIABLE FOR THEME
  useEffect(() => {
    const hex = getThemeHex(accentColor, 500);
    const hex400 = getThemeHex(accentColor, 400); // For text/glow

    document.documentElement.style.setProperty('--accent-color', hex400);
    document.documentElement.style.setProperty('--accent-color-hex', hex);

    // Convert hex to rgb for rgba usage
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

  }, [accentColor]);

  // Stats Memo
  const stats = useMemo(() => {
    const totalDist = flights.reduce((acc, flight) => {
      return acc + calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng);
    }, 0);

    // Cost logic: Sum of all Trips + Sum of "Orphan" flights (no tripId)
    const tripsCost = trips.reduce((acc, trip) => acc + (parseFloat(trip.cost) || 0), 0);
    const orphanFlightsCost = flights
      .filter(f => !f.tripId)
      .reduce((acc, flight) => acc + (parseFloat(flight.cost) || 0), 0);

    return {
      count: flights.length,
      distance: totalDist,
      hours: Math.round(totalDist / 740),
      totalCost: tripsCost + orphanFlightsCost
    };
  }, [flights, trips]);

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser ? "Logged In" : "Logged Out", currentUser);

      if (currentUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            // New user (or first time login with this method), create default doc
            const email = currentUser.email || "";
            const isAnonymous = !email;
            let displayName = currentUser.displayName;

            if (!displayName) {
              if (isAnonymous) {
                // Should not happen with new logic, but fallback
                displayName = `Guest-${currentUser.uid.substring(0, 6).toUpperCase()}`;
              } else if (email.endsWith('@skytrace.local')) {
                // Extract part after guest_ and before @
                // email format: guest_UUID@skytrace.local
                const match = email.match(/guest_(.*?)@/);
                if (match && match[1]) {
                  displayName = `Guest-${match[1].substring(0, 6).toUpperCase()}`;
                } else {
                  displayName = "Guest-Device";
                }
              } else {
                displayName = "User";
              }
            }

            await setDoc(userRef, {
              email: email || "anonymous",
              displayName: displayName,
              photoURL: currentUser.photoURL || null,
              currency: 'USD',
              accentColor: 'cyan',
              language: 'en',
              createdAt: new Date().toISOString()
            });
            console.log("Created new user document for:", currentUser.uid);
          }
        } catch (error) {
          console.error("Error checking/creating user doc:", error);
        }
      }

      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // FIRESTORE LISTENER - FLIGHTS & TRIPS
  useEffect(() => {
    if (!user) {
      setFlights([]);
      setTrips([]);
      return;
    }

    console.log("Setting up Firestore watcher for:", user.uid);

    // 1. Watch FLIGHTS
    const qFlights = query(
      collection(db, "test"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubFlights = onSnapshot(qFlights, (snapshot) => {
      console.log("Flights Snapshot received. Docs:", snapshot.docs.length);
      const flightData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setFlights(flightData);
    }, (error) => {
      console.error("Firestore Flights Error:", error);
      if (error.message.includes("indexes")) {
        alert("Database Error (Flights): Index required. Check console.");
      }
    });

    // 2. Watch TRIPS
    const qTrips = query(
      collection(db, "trips"),
      where("userId", "==", user.uid)
      // orderBy("startDate", "desc") // keeping simple for now to avoid multiple index requirements at once
    );

    const unsubTrips = onSnapshot(qTrips, (snapshot) => {
      console.log("Trips Snapshot received. Docs:", snapshot.docs.length);
      const tripData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      // Optional: Sort manually if not using database index yet
      setTrips(tripData.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)));
    }, (error) => {
      console.error("Firestore Trips Error:", error);
    });

    // 3. Watch USER SETTINGS
    const userSettingsRef = doc(db, "users", user.uid);
    const unsubSettings = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("User Settings Received:", data);
        if (data.currency) setCurrency(data.currency);
        if (data.accentColor) setAccentColor(data.accentColor);
        // viewMode persistence removed
        if (data.language && data.language !== language) {
          changeLanguage(data.language);
        }
      }
    }, (error) => {
      console.error("Firestore Settings Error:", error);
    });

    return () => {
      unsubFlights();
      unsubTrips();
      unsubSettings();
    };
  }, [user]);

  // SETTINGS HANDLERS
  const saveSetting = async (key, value) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        [key]: value,
        email: user.email, // Keep these updated just in case
        displayName: user.displayName
      }, { merge: true });
    } catch (e) {
      console.error(`Error saving setting ${key}:`, e);
    }
  };

  const handleSetCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    saveSetting('currency', newCurrency);
  };

  const handleSetAccentColor = (newColor) => {
    setAccentColor(newColor);
    saveSetting('accentColor', newColor);
  };

  const handleSetViewMode = (newMode) => {
    setViewMode(newMode);
    // saveSetting('viewMode', newMode); // Removed persistence
  };

  const handleSetLanguage = (newLang) => {
    changeLanguage(newLang);
    saveSetting('language', newLang);
  };

  // SHARE SHEET STATE
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareImage, setShareImage] = useState(null);

  const handleShare = async () => {
    setSharing(true);
    try {
      // 1. Capture the screenshot first
      const element = document.body;
      const dataUrl = await toPng(element, {
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          // Return true to keep the node, false to exclude it
          return !node.classList || !node.classList.contains('share-ignore');
        }
      });

      setShareImage(dataUrl);

      // 2. Open the Sheet
      setShowShareSheet(true);

    } catch (error) {
      console.error("Share capture failed:", error);
      alert("Share Error: " + error.message);
    }
    setSharing(false);
  };

  const handleSaveImage = () => {
    if (!shareImage) return;
    const link = document.createElement('a');
    link.download = `flight-history-${new Date().toISOString().split('T')[0]}.png`;
    link.href = shareImage;
    link.click();
  };

  const handleNativeShare = async () => {
    if (!shareImage) return;
    try {
      const blob = await (await fetch(shareImage)).blob();
      const file = new File([blob], 'flight-history.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Flight History',
          text: 'Check out my flight history on SkyTrace!',
        });
      } else {
        alert(t('share_not_supported') || "Sharing is not supported on this device. Please use 'Save Image'.");
      }
    } catch (e) {
      console.error("Native share failed", e);
    }
  };

  const handleCopyLink = () => {
    // Placeholder for actual link logic
    navigator.clipboard.writeText(window.location.href);
  };

  // LOADING STATE
  if (loadingAuth) return <div className="w-screen h-screen bg-black text-white flex items-center justify-center">{t('loading')}</div>;

  // LOGIN SCREEN
  if (!user) return <Login />;

  // Updated to handle Trip object which contains flights
  const handleSaveTrip = async (tripData, flightDataList) => {
    if (!user) return;

    try {
      // 1. Save Trip Doc
      const tripRef = doc(db, "trips", tripData.id);
      await setDoc(tripRef, { ...tripData, userId: user.uid });

      // 2. Sync Flights

      // Identify flights to delete (exist in DB but not in current submission)
      // Note: 'flights' state is available in this scope
      const currentTripFlights = flights.filter(f => f.tripId === tripData.id);
      const newFlightIds = new Set(flightDataList.map(f => f.id));

      const flightsToDelete = currentTripFlights.filter(f => !newFlightIds.has(f.id));

      const deletePromises = flightsToDelete.map(f => deleteDoc(doc(db, "test", f.id)));

      // Ensure unique by ID
      const distinctFlightDataList = flightDataList.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);

      const savePromises = distinctFlightDataList.map(flight => {
        const flightRef = doc(db, "test", flight.id);
        return setDoc(flightRef, { ...flight, userId: user.uid, tripId: tripData.id });
      });

      await Promise.all([...deletePromises, ...savePromises]);

    } catch (e) {
      console.error("Error saving trip:", e);
      alert("Error saving: " + e.message);
    }

    setEditingFlight(null);
    setEditingTrip(null);
    setShowForm(false);
  };

  // Export Callback
  const handleExportData = async (tripsToExport, flightsToExport) => {
    if (!user) return;
    try {
      const { exportToExcel } = await import('./utils/exportData');
      await exportToExcel(user, tripsToExport, flightsToExport);
    } catch (e) {
      console.error("Export Handler Error:", e);
      alert("Export failed: " + e.message);
    }
  };

  // Backwards compatible info: passing (flight) implies single flight "orphan" save
  // But our new UI will primarily focus on Trips. 
  // If FlightForm is reused for single flight, we wrap it in a pseudo-trip or handle it directly.
  // We'll update this shortly.

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

  const handleDeleteTrip = async (tripId) => {
    if (!user) return;
    if (confirm("Delete this entire trip and all its flights?")) {
      // 1. Delete Trip Doc
      await deleteDoc(doc(db, "trips", tripId));

      // 2. Delete all flights with this tripId
      // Needed: find all flights with tripId. We have them in state 'flights'.
      const flightsToDelete = flights.filter(f => f.tripId === tripId);
      flightsToDelete.forEach(async (f) => {
        await deleteDoc(doc(db, "test", f.id));
      });
    }
  };

  const handleEditFlight = (flight) => {
    // If flight has a tripId, we should edit the TRIP, not just the flight.
    if (flight.tripId) {
      const parentTrip = trips.find(t => t.id === flight.tripId);
      if (parentTrip) {
        handleEditTrip(parentTrip);
        return;
      }
    }
    // Orphan flight
    setEditingFlight(flight);
    setEditingTrip(null);
    setShowForm(true);
    setShowList(false);
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setEditingFlight(null);
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
            accentColor={accentColor}
          />
        ) : (
          <MapView
            flights={flights}
            onFlightClick={setSelectedFlight}
            accentColor={accentColor}
          />
        )}
      </div>

      {/* TOP BAR - share-ignore class means it won't be captured if we want to hide it, but user might want stats. Let's keep stats. */}
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

        <div className="flex items-center gap-2 md:gap-8 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity mt-2 md:mt-0 w-full md:w-auto justify-center md:justify-end" onClick={() => setShowList(true)}>
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

        {/* Placeholder for balance */}
        <div className="hidden md:block w-24"></div>
      </div>

      {/* RIGHT ACTIONS - with share-ignore so they don't appear in screenshot */}
      <div className="share-ignore absolute right-4 md:right-6 top-[45%] md:top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-4 z-40 pointer-events-auto">

        {/* SHARE BUTTON */}
        <button
          onClick={handleShare}
          className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
        >
          {sharing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div> : <Share2 size={20} />}
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('share') || "Share"}</span>
        </button>

        <button
          onClick={() => handleSetViewMode(viewMode === '3D' ? '2D' : '3D')}
          className={`w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover-accent-btn transition-all shadow-lg group relative`}
        >
          <MapIcon size={20} className={viewMode === '3D' ? 'block' : 'hidden'} />
          <Globe size={20} className={viewMode === '2D' ? 'block' : 'hidden'} />
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('switch_view')}</span>
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

      {/* FAB */}
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
          setViewMode={handleSetViewMode}
          currency={currency}
          setCurrency={handleSetCurrency}
          setLanguage={handleSetLanguage}
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
