import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Plane, Calendar, MapPin, Settings, Share2, Globe, Map as MapIcon, List as ListIcon, LogOut } from 'lucide-react';
import GlobeView from './components/GlobeView';
import MapView from './components/MapView';
import FlightForm from './components/FlightForm';
import FlightList from './components/FlightList';
import Login from './components/Login';
import { calculateDistance, formatDistance } from './utils/calculations';

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

function App() {
  const [viewMode, setViewMode] = useState('2D');
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [editingFlight, setEditingFlight] = useState(null); // Restored missing state

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Window Resize Hook (Moved Up)
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stats Memo (Moved Up)
  const stats = useMemo(() => {
    const totalDist = flights.reduce((acc, flight) => {
      return acc + calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng);
    }, 0);

    return {
      count: flights.length,
      distance: totalDist,
      hours: Math.round(totalDist / 800)
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
    const q = query(collection(db, "test"), orderBy("date", "desc"));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      console.log("Firestore Snapshot received. Docs:", snapshot.docs.length);
      const flightData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setFlights(flightData);
    }, (error) => {
      console.error("Firestore Error:", error);
      alert("Database Error: " + error.message);
    });

    return () => unsubscribeData();
  }, [user]);

  // LOADING STATE (Now safe to return)
  if (loadingAuth) return <div className="w-screen h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  // LOGIN SCREEN (Now safe to return)
  if (!user) return <Login />;

  const handleSaveFlight = async (flight) => {
    if (!user) return;

    try {
      const flightRef = doc(db, "test", flight.id); // Use flight.id as Doc ID
      await setDoc(flightRef, flight); // Merges or Create
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
      if (confirm("Are you sure you want to delete this flight?")) {
        await deleteDoc(doc(db, "test", id));
      }
    } catch (e) {
      console.error("Error removing flight:", e);
    }
  };

  // ... (Keep handleEditFlight / handleCloseForm)

  const handleEditFlight = (flight) => {
    setEditingFlight(flight);
    setShowForm(true);
    setShowList(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFlight(null);
  };


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
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 flex items-center justify-between px-6 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          {user.photoURL ? (
            <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-cyan-500/50" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">ST</div>
          )}

          <div>
            <h1 className="text-lg font-black tracking-tighter text-white">SKYTRACE</h1>
            <div className="text-[10px] text-cyan-400 uppercase tracking-[0.2em]">{user.displayName || "Private Log"}</div>
          </div>
        </div>

        <div className="flex items-center gap-8 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowList(true)}>
          {/* Stats Block - Kept Same */}
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Flights</div>
            <div className="text-xl font-bold text-white font-mono">{stats.count}</div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Distance</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">{formatDistance(stats.distance)} <span className="text-xs text-cyan-600">km</span></div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Hours</div>
            <div className="text-xl font-bold text-white font-mono">{stats.hours} <span className="text-xs text-slate-500">h</span></div>
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="w-24 flex justify-end pointer-events-auto">
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Log Out">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 pointer-events-auto">
        <button
          onClick={() => setViewMode(m => m === '3D' ? '2D' : '3D')}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:text-cyan-400 transition-all shadow-lg group relative"
        >
          {viewMode === '3D' ? <MapIcon size={20} /> : <Globe size={20} />}
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Switch View</span>
        </button>

        <button
          onClick={() => setShowList(true)}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-lg group relative"
        >
          <ListIcon size={20} />
          <span className="absolute right-14 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Flight History</span>
        </button>

        <button className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-lg">
          <Settings size={20} />
        </button>
      </div>

      {/* FAB */}
      <div className="absolute bottom-8 right-6 z-40 pointer-events-auto">
        <button
          onClick={() => { setEditingFlight(null); setShowForm(true); }}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)] transition-all hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse"></div>
          <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* MODALS */}
      {showList && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl h-full max-h-[85vh] pointer-events-auto">
            <FlightList
              flights={flights}
              onClose={() => setShowList(false)}
              onDelete={handleDeleteFlight}
              onEdit={handleEditFlight} // Pass edit handler
            />
          </div>
        </div>
      )}

      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="pointer-events-auto w-full max-w-2xl">
            <FlightForm
              initialData={editingFlight} // Pass existing data
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
              {/* Airline Logo / Name Placeholder */}
              {selectedFlight.airline && <div className="text-cyan-400 font-bold uppercase tracking-widest text-sm">{selectedFlight.airline} {selectedFlight.flightNumber}</div>}

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
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Distance</div>
                  <div className="text-lg font-mono text-white">{formatDistance(calculateDistance(selectedFlight.depLat, selectedFlight.depLng, selectedFlight.arrLat, selectedFlight.arrLng))} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Date</div>
                  <div className="text-lg font-mono text-white">{selectedFlight.date}</div>
                </div>
                {selectedFlight.aircraft && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Aircraft</div>
                    <div className="text-white">{selectedFlight.aircraft}</div>
                  </div>
                )}
                {selectedFlight.notes && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Notes</div>
                    <div className="text-slate-400 text-sm italic">{selectedFlight.notes}</div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-6 z-[100] app-region-drag" />
    </div>
  );
}

export default App;
