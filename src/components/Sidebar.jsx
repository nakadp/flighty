import React, { useState } from 'react';
import { Plane, Calendar, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { formatDistance } from '../utils/calculations';

export default function Sidebar({ flights = [], stats }) {
    const [isOpen, setIsOpen] = useState(true);

    // Use props stats if available, otherwise fallback (though App should provide it)
    const count = stats ? stats.count : flights.length;
    const distance = stats ? stats.distance : 0;

    return (
        <div className={`pointer-events-auto transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-12 mx-2'} h-fit max-h-[80vh] flex flex-col`}>

            {/* Main Glass Panel */}
            <div className={`glass-panel rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>

                {/* Header Stats */}
                <div className="p-5 border-b border-white/5 bg-white/5">
                    <h2 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity size={12} /> Flight Stats
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                            <div className="text-xl font-bold text-white">{count}</div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Flights</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                            <div className="text-xl font-bold text-amber-500">{formatDistance(distance)}</div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Km Flown</div>
                        </div>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[50vh]">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold pl-2 mb-1">Log Entries</div>
                    {flights.length === 0 ? (
                        <div className="text-xs text-slate-600 text-center py-6">No flights recorded.</div>
                    ) : (
                        flights.map((flight) => (
                            <div key={flight.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-white">{flight.depCode}</span>
                                    <Plane size={12} className="text-slate-500 rotate-90" />
                                    <span className="text-sm font-bold text-white">{flight.arrCode}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{flight.date}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Toggle Handle (Outside the panel when closed) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-cyan-400 mt-2"
                >
                    <ChevronRight size={18} />
                </button>
            )}

            {/* Close Button (Inside) */}
            {isOpen && (
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-1/2 -right-3 w-6 h-12 bg-black/80 border border-white/20 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-50 focus:outline-none"
                >
                    <ChevronLeft size={14} />
                </button>
            )}
        </div>
    );
}
