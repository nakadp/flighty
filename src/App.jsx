import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Plane, Calendar, MapPin, Settings, Share2, Globe, Map as MapIcon, List as ListIcon, LogOut, Check, Download, Link, TrendingUp, Home } from 'lucide-react';
import GlobeView from './components/GlobeView';
import MapView from './components/MapView';
import DashboardHome from './components/DashboardHome';
import AnalysisPage from './components/AnalysisPage';
import Login from './components/Login';
import { calculateDistance, formatDistance } from './utils/calculations';
import { useLanguage } from './context/LanguageContext';
import { toPng } from 'html-to-image';
import { THEME_COLORS, getThemeHex } from './utils/theme';
import StaticMap from './components/StaticMap';

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc } from 'firebase/firestore';

function App() {
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // SHARED VIEW LOGIC
  const queryParams = new URLSearchParams(window.location.search);
  const sharedUid = queryParams.get('uid');
  const isSharedView = !!sharedUid;

  const [viewMode, setViewMode] = useState('2D');
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [accentColor, setAccentColor] = useState('cyan');
  const [apiConfig, setApiConfig] = useState({
    keys: [],
    model: 'models/gemini-2.5-flash'
  });

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

      if (isSharedView) {
        if (!currentUser) {
          signInAnonymously(auth).catch((e) => console.error("Anon Auth Error", e));
          return;
        }
        setUser(currentUser);
        setLoadingAuth(false);
        return;
      }

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
  }, [isSharedView]);

  // FIRESTORE LISTENER - FLIGHTS & TRIPS
  useEffect(() => {
    // Determine which UID to fetch data for
    const targetUid = isSharedView ? sharedUid : (user ? user.uid : null);

    if (!targetUid) {
      setFlights([]);
      setTrips([]);
      return;
    }

    console.log("Setting up Firestore watcher for:", targetUid, isSharedView ? "(Shared View)" : "(Private View)");

    // 1. Watch FLIGHTS
    const qFlights = query(
      collection(db, "test"),
      where("userId", "==", targetUid),
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
      where("userId", "==", targetUid)
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
    const userSettingsRef = doc(db, "users", targetUid);
    const unsubSettings = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("User Settings Received:", data);
        if (data.currency) setCurrency(data.currency);
        if (data.accentColor) setAccentColor(data.accentColor);

        // Load API Config (New) or fallback to Legacy Key
        if (data.apiConfig) {
          setApiConfig(data.apiConfig);
        } else if (data.geminiApiKey) {
          // Migration fallback
          setApiConfig({
            keys: [data.geminiApiKey],
            model: 'models/gemini-2.5-flash'
          });
        }

        if (!isSharedView && data.language && data.language !== language) {
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
  }, [user, isSharedView, sharedUid]);

  // SETTINGS HANDLERS
  const saveSetting = async (key, value) => {
    if (!user || isSharedView) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        [key]: value
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

  const handleUpdateApiConfig = (newConfig) => {
    setApiConfig(newConfig);
    saveSetting('apiConfig', newConfig);
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
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  // Default to 4K
  const [exportConfig, setExportConfig] = useState({ width: 3840, height: 2160, lineWidth: 4 });
  const shareContainerRef = useRef(null);

  const handleShare = async () => {
    setSharing(true);

    // Determine resolution based on device
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setExportConfig({ width: 1920, height: 1080, lineWidth: 2 });
    } else {
      setExportConfig({ width: 3840, height: 2160, lineWidth: 4 });
    }

    setIsGeneratingShare(true);
    // The actual capture will be triggered by the onReady callback of StaticMap
  };

  const handleStaticMapReady = async () => {
    try {
      if (shareContainerRef.current) {
        // Use toBlob for better performance with large images
        // Add a timeout to prevent infinite hanging
        const generatePromise = new Promise((resolve, reject) => {
          import('html-to-image').then(hti => {
            hti.toBlob(shareContainerRef.current, {
              width: 3840,
              height: 2160,
              cacheBust: true,
              skipFonts: true,
              pixelRatio: 1,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#020617'
            }).then(resolve).catch(reject);
          }).catch(reject);
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout generating image")), 20000)
        );

        const blob = await Promise.race([generatePromise, timeoutPromise]);

        if (blob) {
          const url = URL.createObjectURL(blob);
          setShareImage(url);
          setShowShareSheet(true);
        } else {
          throw new Error("Failed to generate image blob");
        }
      }
    } catch (error) {
      console.error("Share capture failed:", error);
      alert(t('share_error') || "Error generating image. Please try again.");
    } finally {
      setIsGeneratingShare(false);
      setSharing(false);
    }
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
      const blob = await (await fetch(shareImage)).blob(); // Fetch the blob from blobURL (efficient)
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
    // Generate link including UID
    // Use window.location.origin + pathname + ?uid=USER_ID
    const targetId = isSharedView ? sharedUid : (user ? user.uid : "");
    if (!targetId) return;

    const url = new URL(window.location.href);
    url.searchParams.set('uid', targetId);

    navigator.clipboard.writeText(url.toString());
  };

  // LOADING STATE
  if (loadingAuth) return <div className="w-screen h-screen bg-black text-white flex items-center justify-center">{t('loading')}</div>;

  // LOGIN SCREEN
  // If Shared View, we skip Login screen (user is set to anon or whatever in useEffect)
  if (!user && !isSharedView) return <Login />;

  // Updated to handle Trip object which contains flights
  const handleSaveTrip = async (tripData, flightDataList) => {
    if (!user) return;

    try {
      // 1. Save Trip Doc
      const tripRef = doc(db, "trips", tripData.id);
      await setDoc(tripRef, { ...tripData, userId: user.uid });

      // 2. Sync Flights
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
      alert(t('error_saving') + e.message);
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
      alert(t('export_failed') + e.message);
    }
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

  const handleDeleteTrip = async (tripId) => {
    if (!user) return;
    if (confirm(t('confirm_delete_trip'))) {
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

  // Determine if running in Electron
  const isElectron = window.ipcRenderer || (window.process && window.process.type === 'renderer') || navigator.userAgent.includes('Electron');

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">

      {/* BACKGROUND (Persistent) */}
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

      {/* RIGHT SIDEBAR (Persistent Navigation) */}
      {/* ROUTES LAYER */}
      <Routes>
        <Route path="/" element={
          <DashboardHome
            user={user}
            stats={stats}
            currency={currency}
            accentColor={accentColor}
            viewMode={viewMode}
            setViewMode={handleSetViewMode}
            showForm={showForm}
            setShowForm={setShowForm}
            showList={showList}
            setShowList={setShowList}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            flights={flights}
            trips={trips}
            editingTrip={editingTrip}
            editingFlight={editingFlight}
            setEditingFlight={setEditingFlight}
            setEditingTrip={setEditingTrip}
            apiConfig={apiConfig}
            setApiConfig={handleUpdateApiConfig}
            handleSetCurrency={handleSetCurrency}
            handleSetLanguage={handleSetLanguage}
            handleShare={handleShare}
            handleDeleteFlight={handleDeleteFlight}
            handleDeleteTrip={handleDeleteTrip}
            handleEditFlight={handleEditFlight}
            handleExportData={handleExportData}
            handleCloseForm={handleCloseForm}
            handleSaveTrip={handleSaveTrip}
            handleUpdateApiConfig={handleUpdateApiConfig}
            handleSetAccentColor={handleSetAccentColor}
            sharing={sharing}
            shareImage={shareImage}
            showShareSheet={showShareSheet}
            setShowShareSheet={setShowShareSheet}
            handleSaveImage={handleSaveImage}
            handleNativeShare={handleNativeShare}
            handleCopyLink={handleCopyLink}
          />
        } />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>

      {/* GLOBAL MODALS needed outside Routes? (Selected Flight Detail is GLOBAL usually) */}
      {selectedFlight && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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

      {/* OFF-SCREEN MAP RENDERER */}
      {isGeneratingShare && (
        <div
          ref={shareContainerRef}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: -1000,
            width: '3840px',
            height: '2160px',
            visibility: 'visible'
          }}
        >
          <StaticMap
            // StaticMap needs props too, same logic as before
            // ... simplified for snippet
            flights={flights}
            width={exportConfig.width}
            height={exportConfig.height}
            lineWidth={exportConfig.lineWidth}
            accentColor={accentColor}
          />
        </div>
      )}

    </div>
  );
}

export default App;
