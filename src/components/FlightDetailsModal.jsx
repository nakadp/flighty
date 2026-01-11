import React from 'react';
import { X, Clock, Plane, Luggage, ArrowRight, ExternalLink } from 'lucide-react';

const FlightDetailsModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    // Helper to format airline logo placeholder
    const getAirlineLogo = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('') : 'FL';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Gradient */}
                <div className={`h-2 w-full ${data.type === 'cheapest' ? 'bg-cyan-500' :
                        data.type === 'shortest' ? 'bg-orange-500' : 'bg-purple-500'
                    }`}></div>

                <div className="p-6">
                    {/* Top Row */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold tracking-wider">
                                {getAirlineLogo(data.airline)}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{data.airline}</h3>
                                <p className="text-slate-400 text-xs font-mono">{data.flightNo}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Price Tag */}
                    <div className="mb-8">
                        <span className="text-3xl font-bold text-white tracking-tight">¥{data.price.toLocaleString()}</span>
                        <span className="text-slate-500 text-sm ml-2">per person</span>
                    </div>

                    {/* Itinerary Visualization */}
                    <div className="relative pl-4 border-l-2 border-white/10 space-y-8 mb-8">
                        {/* Departure */}
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-500 ring-4 ring-[#0a0a0a]"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold text-lg">{data.departureTime}</span>
                                <span className="text-slate-500 text-xs uppercase tracking-wider">Departure</span>
                            </div>
                        </div>

                        {/* Flight Info (Duration) */}
                        <div className="py-2 flex items-center gap-3 text-cyan-400">
                            <Clock size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">{data.duration}</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                            {data.stops === 0 ? (
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Non-stop</span>
                            ) : (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">{data.stops} Stop</span>
                            )}
                        </div>

                        {/* Arrival */}
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-[#0a0a0a] shadow-[0_0_10px_#22d3ee]"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold text-lg">{data.arrivalTime}</span>
                                <span className="text-slate-500 text-xs uppercase tracking-wider">Arrival</span>
                            </div>
                        </div>
                    </div>

                    {/* Extras Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                            <Luggage size={16} className="text-slate-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Baggage</p>
                                <p className="text-white text-sm font-medium">{data.baggage}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                            <Plane size={16} className="text-slate-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Aircraft</p>
                                <p className="text-white text-sm font-medium">{data.aircraft}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm tracking-uppercase flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                        Book on Provider <ExternalLink size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlightDetailsModal;
