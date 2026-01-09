import React, { useState, useEffect } from 'react';
import { X, Plane, Plus, Trash2, Edit2, ChevronRight, Calendar, DollarSign, Scan } from 'lucide-react';
import { AIRPORTS } from '../data/airports';
import { useLanguage } from '../context/LanguageContext';
import BoardingPassScanner from './BoardingPassScanner';
import { calculateDistance } from '../utils/calculations';
import AirportSearchInput from './AirportSearchInput';

export default function FlightForm({ onClose, onSubmit, initialTrip = null, initialData = null, existingFlights = [], accentColor = 'cyan' }) {
    const { t, language } = useLanguage();

    // Mode: 'TRIP' (Overview) or 'FLIGHT' (Editing a specific segment)
    const [view, setView] = useState('TRIP');
    const [showScanner, setShowScanner] = useState(false);

    // Trip Meta Data
    const [tripData, setTripData] = useState({
        id: crypto.randomUUID(),
        name: '',
        type: 'OneWay', // OneWay, RoundTrip, MultiCity
        cost: '',
        startDate: '',
        endDate: '',
        userId: ''
    });

    // List of flights in this trip
    const [segments, setSegments] = useState([]);

    // Currently editing segment
    const [editingSegmentId, setEditingSegmentId] = useState(null);
    const [segmentForm, setSegmentForm] = useState(getEmptyFlight());

    // --- INITIALIZATION ---
    useEffect(() => {
        if (initialTrip) {
            // Edit Existing Trip
            setTripData(initialTrip);
            // Find flights belonging to this trip
            const tripFlights = existingFlights.filter(f => f.tripId === initialTrip.id);
            setSegments(tripFlights);
        } else if (initialData) {
            // Edit Orphan Flight (Wrap in pseudo-trip or handle as single)
            // For now, let's treat it as a "Trip" with one flight, or just Pre-fill
            // Only if it's an orphan flight.
            setSegments([initialData]);
            setTripData({
                id: crypto.randomUUID(),
                name: `${initialData.depCode} to ${initialData.arrCode}`,
                type: 'OneWay',
                cost: '', // Orphan flights usually have their own cost, trip cost might be 0 or sum
                startDate: initialData.date,
                endDate: initialData.date
            });
        }
    }, [initialTrip, initialData]);


    function getEmptyFlight() {
        return {
            id: crypto.randomUUID(),
            depCode: '', depName: '', depLat: '', depLng: '', depCountry: '',
            arrCode: '', arrName: '', arrLat: '', arrLng: '', arrCountry: '',
            airline: '', flightNumber: '', aircraft: '',
            date: '', notes: '', cost: '0' // Individual flight cost (optional if trip usage)
        };
    }

    // --- TRIP HANDLERS ---
    const handleTripChange = (e) => {
        setTripData({ ...tripData, [e.target.name]: e.target.value });
    };

    const handleSaveTrip = (e) => {
        e.preventDefault();
        // Calculate dates if missing
        let finalTrip = { ...tripData };

        // Auto-set dates from segments if not manually set
        if (segments.length > 0) {
            const sortedDates = segments.map(s => s.date).sort();
            if (!finalTrip.startDate) finalTrip.startDate = sortedDates[0];
            if (!finalTrip.endDate) finalTrip.endDate = sortedDates[sortedDates.length - 1];
        }

        // If no name, generate one
        if (!finalTrip.name && segments.length > 0) {
            finalTrip.name = `${segments[0].depCode} ✈ ${segments[segments.length - 1].arrCode}`;
        }

        onSubmit(finalTrip, segments);
    };

    // --- SEGMENT HANDLERS ---
    const startAddSegment = () => {
        setSegmentForm(getEmptyFlight());
        setEditingSegmentId(null);
        setView('FLIGHT');
    };

    const startEditSegment = (segment) => {
        setSegmentForm(segment);
        setEditingSegmentId(segment.id);
        setView('FLIGHT');
    };

    const deleteSegment = (id) => {
        setSegments(prev => prev.filter(s => s.id !== id));
    };

    const saveSegment = (e) => {
        e.preventDefault();

        // If editing existing
        if (editingSegmentId) {
            setSegments(prev => prev.map(s => s.id === editingSegmentId ? segmentForm : s));
        } else {
            // Adding new
            setSegments(prev => [...prev, segmentForm]);
        }

        setView('TRIP');
    };

    // --- FLIGHT FORM HANDLERS (Reused) ---
    // Update logic for filling airport data (reusable)
    const updateWithAirportData = (currentForm, type, airport) => {
        if (!airport) return currentForm;

        const prefix = type === 'dep' ? 'dep' : 'arr';
        const newData = {
            [`${prefix}Code`]: airport.iata,
            [`${prefix}Name`]: airport.name,
            [`${prefix}Lat`]: airport.lat,
            [`${prefix}Lng`]: airport.lng,
            [`${prefix}Country`]: airport.country || ''
        };

        const nextState = { ...currentForm, ...newData };

        // Recalculate Distance/Duration
        if (nextState.depLat && nextState.depLng && nextState.arrLat && nextState.arrLng) {
            const dist = calculateDistance(nextState.depLat, nextState.depLng, nextState.arrLat, nextState.arrLng);
            nextState.distance = Math.round(dist);
            // Est Duration: (Distance / 800km/h) + 0.5h taxi
            const hours = (dist / 800) + 0.5;
            nextState.duration = Math.round(hours * 60); // minutes
        }

        return nextState;
    };

    // Handle manual code entry
    const handleCodeChange = (e, type) => {
        const code = e.target.value.toUpperCase();
        setSegmentForm(prev => {
            const updated = { ...prev, [e.target.name]: code };

            // Auto-calculate distance if airports found via code
            if (code.length === 3) {
                const airport = AIRPORTS.find(a => a.iata === code);
                if (airport) {
                    return updateWithAirportData(updated, type, airport);
                }
            }
            return updated;
        });
    };

    // Handle Autocomplete Selection
    const handleAirportSelect = (text, airport, type) => {
        if (airport) {
            setSegmentForm(prev => updateWithAirportData(prev, type, airport));
        } else {
            // Just text update
            setSegmentForm(prev => ({
                ...prev,
                [type === 'dep' ? 'depName' : 'arrName']: text
            }));
        }
    };

    const handleSegmentChange = (e) => {
        setSegmentForm({ ...segmentForm, [e.target.name]: e.target.value });
    };

    const handleScanSuccess = (data) => {
        // Prepare new form state
        let newState = { ...segmentForm };

        // Helper to update airport info from Code (QR)
        const updateFromCode = (code, type) => {
            if (!code) return false;
            code = code.toUpperCase();
            const airport = AIRPORTS.find(a => a.iata === code);
            if (airport) {
                // Use reuse logic
                const tempState = { ...newState };
                const updated = updateWithAirportData(tempState, type, airport);
                Object.assign(newState, updated);
                return true;
            } else {
                // Set code even if not found (QR is authoritative)
                if (type === 'dep') newState.depCode = code;
                else newState.arrCode = code;
                return true;
            }
        };

        // 1. Departure
        let depFound = false;
        if (data.depCode) {
            depFound = updateFromCode(data.depCode, 'dep');
        }
        // If no code or code lookup failed/wasn't present, try Candidate Name (OCR)
        if (!depFound && data.depCandidate) {
            // Set the Name field. 
            // This will flow down to AirportSearchInput -> useEffect -> performSearch -> Dropdown
            newState.depName = data.depCandidate;
            // Clear any previous code/lat/lng if we are relying on a new "guess" name
            newState.depCode = '';
            newState.depLat = '';
            newState.depLng = '';
        }

        // 2. Arrival
        let arrFound = false;
        if (data.arrCode) {
            arrFound = updateFromCode(data.arrCode, 'arr');
        }
        if (!arrFound && data.arrCandidate) {
            newState.arrName = data.arrCandidate;
            newState.arrCode = '';
            newState.arrLat = '';
            newState.arrLng = '';
        }

        // 3. Other fields
        if (data.airline) newState.airline = data.airline;
        if (data.flightNumber) newState.flightNumber = data.flightNumber;
        if (data.date) newState.date = data.date;
        if (data.seat) newState.note = `Seat: ${data.seat}`;

        // Recalculate Distance/Duration if both points are valid (likely only if QR was successful for both)
        if (newState.depLat && newState.depLng && newState.arrLat && newState.arrLng) {
            const dist = calculateDistance(newState.depLat, newState.depLng, newState.arrLat, newState.arrLng);
            newState.distance = Math.round(dist);
            const hours = (dist / 800) + 0.5;
            newState.duration = Math.round(hours * 60);
        }

        setSegmentForm(newState);
    };

    // --- RENDER ---
    return (
        <div className="glass-panel rounded-2xl w-[95%] md:w-full md:max-w-2xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in duration-200 border border-white/10 bg-black/80 backdrop-blur-xl transition-all">

            {/* HEADER */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {view === 'TRIP' ? (
                        <>
                            <Plane className={`text-${accentColor}-400`} size={20} />
                            {initialTrip ? 'Edit Trip' : 'Create New Trip'}
                        </>
                    ) : (
                        <>
                            <button onClick={() => setView('TRIP')} className={`hover:text-${accentColor}-400 flex items-center gap-1 text-slate-400 text-sm mr-2 transition-colors`}>
                                <ChevronRight className="rotate-180" size={16} /> Back
                            </button>
                            <span>{editingSegmentId ? 'Edit Flight' : 'Add Flight Segment'}</span>
                        </>
                    )}
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">

                {/* SCANNER MODAL */}
                {showScanner && (
                    <BoardingPassScanner
                        onClose={() => setShowScanner(false)}
                        onScanSuccess={handleScanSuccess}
                        accentColor={accentColor}
                    />
                )}

                {/* VIEW: TRIP OVERVIEW */}
                {view === 'TRIP' && (
                    <div className="space-y-8">
                        {/* Trip Details */}
                        <div className="space-y-4">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                Trip Details <span className="h-px bg-white/10 flex-1"></span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Trip Name (Optional)" name="name" value={tripData.name} onChange={handleTripChange} placeholder="e.g. Summer Vacation 2024" autoFocus accentColor={accentColor} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Type</label>
                                        <select name="type" value={tripData.type} onChange={handleTripChange} className={`bg-black/50 border border-white/20 text-white rounded px-3 py-2 w-full focus:outline-none focus:border-${accentColor}-400 text-sm h-[38px]`}>
                                            <option value="OneWay">One Way</option>
                                            <option value="RoundTrip">Round Trip</option>
                                            <option value="MultiCity">Multi-City</option>
                                        </select>
                                    </div>
                                    <Input label="Total Cost" name="cost" type="number" value={tripData.cost} onChange={handleTripChange} placeholder="0.00" icon={<DollarSign size={12} />} accentColor={accentColor} />
                                </div>
                            </div>
                        </div>

                        {/* Segments List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <h3 className={`text-${accentColor}-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2`}>
                                    Flight Segments <span className="text-slate-500">({segments.length})</span>
                                </h3>
                                <button type="button" onClick={startAddSegment} className={`text-xs bg-${accentColor}-500/10 text-${accentColor}-400 border border-${accentColor}-500/30 px-3 py-1.5 rounded hover:bg-${accentColor}-500 hover:text-white transition-all flex items-center gap-1`}>
                                    <Plus size={14} /> Add Flight
                                </button>
                            </div>

                            <div className="space-y-3 min-h-[100px]">
                                {segments.length === 0 ? (
                                    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                                        <Plane className="text-slate-700" size={32} />
                                        <p className="text-sm">No flights added to this trip yet.</p>
                                        <button onClick={startAddSegment} className={`text-${accentColor}-400 hover:underline text-sm`}>Add your first flight</button>
                                    </div>
                                ) : (
                                    segments.map((seg, idx) => (
                                        <div key={seg.id || idx} className={`bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:border-${accentColor}-500/30 transition-colors`}>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center w-10">
                                                    <span className="text-xs text-slate-500 mb-1">DEP</span>
                                                    <span className="font-bold text-white text-lg leading-none">{seg.depCode}</span>
                                                </div>
                                                <Plane size={16} className="text-slate-600 rotate-90" />
                                                <div className="flex flex-col items-center w-10">
                                                    <span className="text-xs text-slate-500 mb-1">ARR</span>
                                                    <span className="font-bold text-white text-lg leading-none">{seg.arrCode}</span>
                                                </div>
                                                <div className="h-8 w-px bg-white/10 mx-2"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {seg.date}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{seg.airline} {seg.flightNumber}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditSegment(seg)} className={`p-2 bg-black/50 rounded hover:bg-${accentColor}-600 text-slate-400 hover:text-white transition-colors`}><Edit2 size={14} /></button>
                                                <button onClick={() => deleteSegment(seg.id)} className="p-2 bg-black/50 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: FLIGHT EDIT FORM */}
                {view === 'FLIGHT' && (
                    <form id="segment-form" onSubmit={saveSegment} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Scanner trigger */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className={`w-full p-3 rounded-xl border border-dashed border-${accentColor}-500/30 bg-${accentColor}-500/5 hover:bg-${accentColor}-500/10 text-${accentColor}-400 flex items-center justify-center gap-2 transition-all group`}
                            >
                                <Scan size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Scan Boarding Pass to Auto-fill</span>
                            </button>
                        </div>

                        {/* Departure */}
                        <div className="space-y-4">
                            <h3 className={`text-${accentColor}-400 text-xs font-bold uppercase tracking-widest border-b border-${accentColor}-900/50 pb-2`}>Departure</h3>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-3">
                                    <Input label="Code" name="depCode" value={segmentForm.depCode} onChange={(e) => handleCodeChange(e, 'dep')} required placeholder="PEK" maxLength={3} autoFocus accentColor={accentColor} />
                                </div>
                                <div className="md:col-span-9">
                                    <AirportSearchInput
                                        label="City / Airport Name"
                                        value={segmentForm.depName}
                                        onSelect={(text, airport) => handleAirportSelect(text, airport, 'dep')}
                                        required
                                        placeholder="Beijing Capital (Type City or Name)"
                                        accentColor={accentColor}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Latitude" name="depLat" value={segmentForm.depLat} onChange={handleSegmentChange} required accentColor={accentColor} />
                                <Input label="Longitude" name="depLng" value={segmentForm.depLng} onChange={handleSegmentChange} required accentColor={accentColor} />
                            </div>
                        </div>

                        {/* Arrival */}
                        <div className="space-y-4">
                            <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest border-b border-emerald-900/50 pb-2">Arrival</h3>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-3">
                                    <Input label="Code" name="arrCode" value={segmentForm.arrCode} onChange={(e) => handleCodeChange(e, 'arr')} required placeholder="LHR" maxLength={3} accentColor={accentColor} />
                                </div>
                                <div className="md:col-span-9">
                                    <AirportSearchInput
                                        label="City / Airport Name"
                                        value={segmentForm.arrName}
                                        onSelect={(text, airport) => handleAirportSelect(text, airport, 'arr')}
                                        required
                                        placeholder="London Heathrow"
                                        accentColor={accentColor}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Latitude" name="arrLat" value={segmentForm.arrLat} onChange={handleSegmentChange} required accentColor={accentColor} />
                                <Input label="Longitude" name="arrLng" value={segmentForm.arrLng} onChange={handleSegmentChange} required accentColor={accentColor} />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2">Flight Info</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Date" type="date" name="date" value={segmentForm.date} onChange={handleSegmentChange} required lang={language} accentColor={accentColor} />
                                <Input label="Airline (Opt)" name="airline" value={segmentForm.airline} onChange={handleSegmentChange} placeholder="Delta" accentColor={accentColor} />
                                <Input label="Flight No." name="flightNumber" value={segmentForm.flightNumber} onChange={handleSegmentChange} placeholder="DL123" accentColor={accentColor} />
                                <Input label="Aircraft" name="aircraft" value={segmentForm.aircraft} onChange={handleSegmentChange} placeholder="A350" accentColor={accentColor} />
                            </div>
                            <div className="p-3 bg-white/5 rounded text-xs text-slate-400 italic">
                                Note: Flight-specific costs can be 0 if you set a Total Trip Cost.
                            </div>
                        </div>
                    </form>
                )}

            </div>

            {/* FOOTER */}
            <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                {view === 'TRIP' ? (
                    <>
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">{t('cancel')}</button>
                        <button onClick={handleSaveTrip} className={`bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-bold border border-${accentColor}-400/20 rounded px-6 py-2 transition-all shadow-[0_0_20px_var(--accent-color-hex)] hover:shadow-[0_0_30px_var(--accent-color-hex)]`}>
                            {initialTrip ? 'Update Trip' : 'Save Trip'}
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setView('TRIP')} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancel Segment</button>
                        <button form="segment-form" type="submit" className="bg-white text-black font-bold rounded px-6 py-2 hover:bg-slate-200 transition-colors">
                            {editingSegmentId ? 'Update Segment' : 'Add Segment'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function Input({ label, type = "text", icon, accentColor = 'cyan', ...props }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    className={`bg-black/50 border border-white/20 text-white rounded px-3 py-2 w-full focus:outline-none focus:border-${accentColor}-400 transition-colors placeholder-slate-600 font-sans text-sm ${icon ? 'pl-8' : ''}`}
                    {...props}
                />
                {icon && <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
            </div>
        </div>
    )
}
