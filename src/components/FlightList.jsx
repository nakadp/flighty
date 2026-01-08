import React, { useState, useMemo } from 'react';
import { X, Plane, Trash2, Edit2, Calendar, Layers, Map as MapIcon, ChevronDown, ChevronRight, DollarSign, Download } from 'lucide-react';
import { formatDistance, calculateDistance } from '../utils/calculations';
import { CURRENCIES } from '../data/currencies';
import ExportModal from './ExportModal';

export default function FlightList({ flights, trips = [], currency = 'USD', onClose, onDelete, onDeleteTrip, onEdit, onExportData, accentColor = 'cyan' }) {
    const [filterYear, setFilterYear] = useState('All');
    const [filterCountry, setFilterCountry] = useState('All');
    const [expandedTrips, setExpandedTrips] = useState(new Set());

    // Toggle expand/collapse
    const toggleTrip = (tripId) => {
        const next = new Set(expandedTrips);
        if (next.has(tripId)) next.delete(tripId);
        else next.add(tripId);
        setExpandedTrips(next);
    };

    // Extract unique years from ALL flights
    const years = useMemo(() => {
        const y = new Set(flights.map(f => f.date ? f.date.split('-')[0] : 'Unknown'));
        return ['All', ...Array.from(y).sort().reverse()];
    }, [flights]);

    // Extract unique countries
    const countries = useMemo(() => {
        const c = new Set();
        flights.forEach(f => {
            if (f.arrCountry) c.add(f.arrCountry);
            if (f.depCountry) c.add(f.depCountry);
        });
        return ['All', ...Array.from(c).sort()];
    }, [flights]);

    // 1. Group Flights by Trip
    const groupedItems = useMemo(() => {
        // Find orphan flights
        const orphans = flights.filter(f => !f.tripId);

        // Prepare Trips with their flights
        const tripsWithFlights = trips.map(trip => {
            const tripFlights = flights.filter(f => f.tripId === trip.id).sort((a, b) => new Date(a.date) - new Date(b.date));
            return {
                type: 'TRIP',
                data: trip,
                flights: tripFlights,
                date: trip.startDate || (tripFlights[0]?.date) // For sorting
            };
        });

        // Filter out empty trips if desired? No, user might want to see empty trips they just made.

        // Prepare Orphans
        const orphanItems = orphans.map(f => ({
            type: 'FLIGHT',
            data: f,
            date: f.date
        }));

        // Combine and Sort by Date (Newest First)
        return [...tripsWithFlights, ...orphanItems].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA; // Descending
        });

    }, [flights, trips]);

    // 2. Apply Filters
    const filteredItems = useMemo(() => {
        return groupedItems.filter(item => {
            // Check Year
            let itemYear = 'Unknown';
            if (item.type === 'TRIP') {
                itemYear = item.date ? item.date.split('-')[0] : 'Unknown';
            } else {
                itemYear = item.data.date ? item.data.date.split('-')[0] : 'Unknown';
            }
            const yearMatch = filterYear === 'All' || itemYear === filterYear;

            // Check Country
            // For trips, match if ANY flight involves the country
            let countryMatch = false;
            if (filterCountry === 'All') {
                countryMatch = true;
            } else {
                if (item.type === 'TRIP') {
                    countryMatch = item.flights.some(f => f.depCountry === filterCountry || f.arrCountry === filterCountry);
                } else {
                    countryMatch = item.data.depCountry === filterCountry || item.data.arrCountry === filterCountry;
                }
            }

            return yearMatch && countryMatch;
        });
    }, [groupedItems, filterYear, filterCountry]);


    // Stats based on filtered items (re-calculating strictly from filtered list for accuracy)
    const stats = useMemo(() => {
        let count = 0;
        let dist = 0;
        let countrySet = new Set();

        filteredItems.forEach(item => {
            if (item.type === 'FLIGHT') {
                count++;
                dist += calculateDistance(item.data.depLat, item.data.depLng, item.data.arrLat, item.data.arrLng);
                if (item.data.depCountry) countrySet.add(item.data.depCountry);
                if (item.data.arrCountry) countrySet.add(item.data.arrCountry);
            } else {
                // Trip
                count += item.flights.length;
                item.flights.forEach(f => {
                    dist += calculateDistance(f.depLat, f.depLng, f.arrLat, f.arrLng);
                    if (f.depCountry) countrySet.add(f.depCountry);
                    if (f.arrCountry) countrySet.add(f.arrCountry);
                });
            }
        });

        return { count, distance: dist, countries: countrySet.size };
    }, [filteredItems]);

    // --- EXPORT LOGIC ---
    const [showExportModal, setShowExportModal] = useState(false);

    const handleExportClick = () => {
        setShowExportModal(true);
    };

    const handleConfirmExport = async (type) => {
        setShowExportModal(false);
        try {
            // Determine data to export
            let tripsToExport = [];
            let flightsToExport = [];

            if (type === 'all') {
                tripsToExport = trips;
                flightsToExport = flights;
            } else {
                // Filtered
                // We need to reconstruct the flat lists from 'filteredItems'
                // filteredItems contains Objects { type: 'TRIP'/'FLIGHT', data: ..., flights: ... }

                const distinctTrips = new Set();
                const distinctFlights = new Set();

                filteredItems.forEach(item => {
                    if (item.type === 'TRIP') {
                        distinctTrips.add(item.data);
                        item.flights.forEach(f => distinctFlights.add(f));
                    } else {
                        // Orphan flight
                        distinctFlights.add(item.data);
                    }
                });

                tripsToExport = Array.from(distinctTrips);
                flightsToExport = Array.from(distinctFlights);
            }

            // Dynamically import to avoid circular dependency issues if any, or just standard import
            const { exportToExcel } = await import('../utils/exportData');

            // We need 'user' object for the header. 
            // Currently FlightList doesn't receive 'user' prop, but it might be needed.
            // PROPOSAL: Pass 'user' from App.jsx to FlightList.jsx 
            // For now, I'll pass a placeholder or try to get it if I can't change App right away.
            // Actually, I should ask App to pass it. 
            // But wait, I can just bubble up the event? 
            // "onExport" prop?
            // Let's use an onExport prop passed from App to keep this pure?
            // No, the request is to doing it here. I'll assume 'user' is passed or I'll bubble it up.
            // Checking props... 'user' is NOT passed.
            // I will expose onExportData to parent (App.jsx) which has the user.

            if (onExportData) {
                onExportData(tripsToExport, flightsToExport);
            }

        } catch (e) {
            console.error(e);
            alert("Export failed");
        }
    };

    // Quick import for the modal - assuming it's in components
    // I need to add the import at the top using multi_replace in a second.
    // Wait, I can't add imports with replace_file_content easily without context.
    // I will use multi_replace for this file to do it all in one go.

    return (
        <>
            {showExportModal && (
                <ExportModal
                    onClose={() => setShowExportModal(false)}
                    onExport={handleConfirmExport}
                    filterStats={{ year: filterYear, country: filterCountry }}
                    accentColor={accentColor}
                />
            )}

            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl w-[95%] md:w-full shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header & Filters */}
                <div className="p-4 border-b border-white/10 space-y-4 bg-white/5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Layers className="text-cyan-400" size={18} />
                            Flight Log
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportClick}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg bg-${accentColor}-500/10 text-${accentColor}-400 hover:bg-${accentColor}-500/20 text-xs font-medium border border-${accentColor}-500/20 transition-all`}
                                title="Export to Excel"
                            >
                                <Download size={14} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-black/50 border border-white/10 text-xs text-white rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 w-full md:w-auto">
                            <option value="All">All Years</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="bg-black/50 border border-white/10 text-xs text-white rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 w-full md:w-auto md:max-w-[150px]">
                            <option value="All">All Countries</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                        <div><span className="text-white font-bold">{stats.count}</span> Flights</div>
                        <div><span className="text-cyan-400 font-bold">{formatDistance(stats.distance)}</span> km</div>
                        <div><span className="text-white font-bold">{stats.countries}</span> Countries</div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            <p>No flights found.</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            if (item.type === 'TRIP') {
                                const trip = item.data;
                                const isExpanded = true; // Default expanded for visibility or use expandedTrips.has(trip.id)

                                return (
                                    <div key={trip.id} className="relative">
                                        {/* Trip Header */}
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                                                <div className="text-sm font-bold text-white uppercase tracking-wider">{trip.name || 'Untitled Trip'}</div>
                                                <div className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{trip.type}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {trip.cost && (
                                                    <div className={`text-xs font-mono text-${accentColor}-400 flex items-center`}>
                                                        <span className="mr-0.5">{CURRENCIES.find(c => c.code === currency)?.symbol || '$'}</span>
                                                        {trip.cost}
                                                    </div>
                                                )}

                                                <div className="flex gap-1 group/tripOps">
                                                    <button onClick={() => onEdit({ tripId: trip.id })} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors"><Edit2 size={12} /></button>
                                                    <button onClick={() => onDeleteTrip && onDeleteTrip(trip.id)} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trip Flights (Indented) */}
                                        <div className="pl-4 border-l-2 border-white/5 ml-1.5 space-y-2">
                                            {item.flights.map(flight => (
                                                <FlightCard key={flight.id} flight={flight} onDelete={onDelete} onEdit={onEdit} isTripChild />
                                            ))}
                                            {item.flights.length === 0 && (
                                                <div className="text-[10px] text-slate-600 italic py-1">No flights in this trip</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            } else {
                                // Orphan Flight
                                return <FlightCard key={item.data.id} flight={item.data} onDelete={onDelete} onEdit={onEdit} />
                            }
                        })
                    )}
                </div>
            </div>
        </>
    );
}

function FlightCard({ flight, onDelete, onEdit, isTripChild }) {
    return (
        <div className={`bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-lg p-3 transition-all group relative ${isTripChild ? 'bg-white/[0.02]' : ''}`}>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-3">
                    <div className="text-lg font-black text-white w-10 text-center">{flight.depCode}</div>
                    <Plane size={12} className="text-slate-500 rotate-90" />
                    <div className="text-lg font-black text-white w-10 text-center">{flight.arrCode}</div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 border border-white/10 px-1.5 rounded">
                    {formatDistance(calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng))} km
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {flight.date}</span>
                        {flight.airline && <span className="text-cyan-400/80 font-bold">{flight.airline}</span>}
                    </div>
                </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isTripChild && (
                    // Only show individual delete if not in trip (or allow both? User logic ambiguous, let's allow, but safe)
                    <button onClick={() => onDelete(flight.id)} className="p-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={12} />
                    </button>
                )}
                {/* For editing, we click the whole card or specific button? Let's use button. 
                    If is Trip Child, onEdit needs to open Trip Form? 
                    The parent passed onEdit which handles switching to Trip Edit mode. */}
                <button onClick={() => onEdit(flight)} className="p-1 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500 hover:text-white transition-colors">
                    <Edit2 size={12} />
                </button>
            </div>
        </div>
    )
}
