import React, { useState } from 'react';
import { X, Plane, Trash2, Edit2, Calendar } from 'lucide-react';
import { formatDistance, calculateDistance } from '../utils/calculations';

export default function FlightList({ flights, onClose, onDelete, onEdit }) {
    return (
        <div className="glass-panel rounded-2xl w-full shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-right-10 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plane className="text-cyan-400" size={20} />
                    Flight History
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {flights.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <p>No flights recorded yet.</p>
                        <p className="text-xs mt-2">Click the + button to add one.</p>
                    </div>
                ) : (
                    flights.map(flight => (
                        <div key={flight.id} className="bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-lg p-4 transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-black text-white">{flight.depCode}</div>
                                    <Plane size={14} className="text-slate-500 rotate-90" />
                                    <div className="text-2xl font-black text-white">{flight.arrCode}</div>
                                </div>
                                <div className="text-xs font-mono text-slate-400 border border-white/10 px-2 py-0.5 rounded">
                                    {formatDistance(calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng))} km
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Calendar size={10} /> {flight.date}</span>
                                {flight.notes && <span className="italic truncate max-w-[150px]">{flight.notes}</span>}
                            </div>

                            {/* Actions (Hover) */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDelete(flight.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors">
                                    <Trash2 size={12} />
                                </button>
                                <button onClick={() => onEdit(flight)} className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500 hover:text-white transition-colors">
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
