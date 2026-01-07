import React, { useState, useMemo } from 'react';
import { X, Plane, Trash2, Edit2, Calendar, Filter, Map, Layers } from 'lucide-react';
import { formatDistance, calculateDistance } from '../utils/calculations';

export default function FlightList({ flights, onClose, onDelete, onEdit }) {
    const [filterYear, setFilterYear] = useState('All');
    const [filterCountry, setFilterCountry] = useState('All');

    // Extract unique years
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

    // Filter Flights
    const filteredFlights = useMemo(() => {
        return flights.filter(f => {
            const year = f.date ? f.date.split('-')[0] : 'Unknown';
            const yearMatch = filterYear === 'All' || year === filterYear;

            const countryMatch = filterCountry === 'All' ||
                (f.depCountry === filterCountry || f.arrCountry === filterCountry);

            return yearMatch && countryMatch;
        });
    }, [flights, filterYear, filterCountry]);

    // Stats based on filtered
    const stats = useMemo(() => {
        return {
            count: filteredFlights.length,
            distance: filteredFlights.reduce((acc, f) => acc + calculateDistance(f.depLat, f.depLng, f.arrLat, f.arrLng), 0),
            countries: new Set(filteredFlights.flatMap(f => [f.depCountry, f.arrCountry].filter(Boolean))).size
        }
    }, [filteredFlights]);

    return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl w-[95%] md:w-full shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header & Filters */}
            <div className="p-4 border-b border-white/10 space-y-4 bg-white/5">
                <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Layers className="text-cyan-400" size={18} />
                        Flight Log
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col md:flex-row gap-2">
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="bg-black/50 border border-white/10 text-xs text-white rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 w-full md:w-auto"
                    >
                        <option value="All">All Years</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        className="bg-black/50 border border-white/10 text-xs text-white rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 w-full md:w-auto md:max-w-[150px]"
                    >
                        <option value="All">All Countries</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Mini Stats */}
                <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                    <div><span className="text-white font-bold">{stats.count}</span> Flights</div>
                    <div><span className="text-cyan-400 font-bold">{formatDistance(stats.distance)}</span> km</div>
                    <div><span className="text-white font-bold">{stats.countries}</span> Countries</div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {filteredFlights.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        <p>No flights found.</p>
                    </div>
                ) : (
                    filteredFlights.map(flight => (
                        <div key={flight.id} className="bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-lg p-3 transition-all group relative">
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
                                    {(flight.depCountry || flight.arrCountry) && (
                                        <div className="text-[10px] text-slate-500">
                                            {flight.depCountry} {flight.depCountry && flight.arrCountry && '→'} {flight.arrCountry}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions (Hover) */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDelete(flight.id)} className="p-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
                                    <Trash2 size={12} />
                                </button>
                                <button onClick={() => onEdit(flight)} className="p-1 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500 hover:text-white transition-colors">
                                    <Edit2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
