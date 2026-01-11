import React, { useState, useMemo } from 'react';
import { Calendar, Search, TrendingUp, X, Globe, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateMockAnalysisData } from '../utils/mockAnalysisData';
import AnalysisChart from './AnalysisChart';
import CityAutocomplete from './CityAutocomplete';
import GlassSelect from './GlassSelect';
import FlightDetailsModal from './FlightDetailsModal';

export default function AnalysisPage() {
    const navigate = useNavigate();

    // State for Inputs
    const [origin, setOrigin] = useState('Beijing (PEK)');
    const [destination, setDestination] = useState('London (LHR)');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [minDays, setMinDays] = useState(5);
    const [maxDays, setMaxDays] = useState(9);

    // State for Chart Controls
    const [displayLength, setDisplayLength] = useState("5 Days");
    const [platform, setPlatform] = useState("Aggregate All");

    // Visibility Toggles
    const [showCheapest, setShowCheapest] = useState(true);
    const [showQuickest, setShowQuickest] = useState(true);
    const [showRecommended, setShowRecommended] = useState(true);

    // Modal State
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Generate Data based on duration/platform
    const chartData = useMemo(() => {
        // Extract number from "5 Days"
        const durationArg = displayLength.split(' ')[0];
        return generateMockAnalysisData(durationArg, platform);
    }, [displayLength, platform]);

    const availableDurations = useMemo(() => {
        // Generate dropdown options based on Min/Max days input
        const options = [];
        const min = parseInt(minDays) || 1;
        const max = parseInt(maxDays) || 10;

        for (let i = min; i <= max; i++) {
            options.push(`${i} Days`);
        }
        return options;
    }, [minDays, maxDays]);

    // Handle Chart Click
    const handleChartPointClick = (flightData) => {
        setSelectedFlight(flightData);
        setIsModalOpen(true);
    };

    return (
        <div className="absolute inset-0 z-40 flex flex-row pointer-events-none">
            {/* LEFT VISUALIZATION AREA (75%) */}
            <div className="w-3/4 h-full p-6 pt-24 pl-6 flex flex-col pointer-events-auto">
                <div className="flex-1 glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col p-6 backdrop-blur-2xl bg-black/40">

                    {/* TOP CONTROL BAR */}
                    <div className="flex justify-between items-center mb-6 z-20">
                        <div className="flex items-center gap-4">
                            <GlassSelect
                                value={displayLength}
                                onChange={setDisplayLength}
                                options={availableDurations}
                                label="Trip Length"
                                icon={Globe}
                            />

                            <GlassSelect
                                value={platform}
                                onChange={setPlatform}
                                options={["Aggregate All", "Trip.com", "Expedia"]}
                                label="Platform"
                                icon={Layers}
                            />
                        </div>

                        {/* LEGEND / TOGGLES */}
                        <div className="flex gap-4 items-center bg-black/20 p-2 rounded-xl border border-white/5">
                            <button onClick={() => setShowCheapest(!showCheapest)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-all px-3 py-1.5 rounded-lg ${showCheapest ? 'bg-cyan-500/20 text-cyan-400' : 'opacity-40 hover:opacity-100'}`}>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"></div> Cheapest
                            </button>
                            <button onClick={() => setShowQuickest(!showQuickest)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-all px-3 py-1.5 rounded-lg ${showQuickest ? 'bg-orange-500/20 text-orange-400' : 'opacity-40 hover:opacity-100'}`}>
                                <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_#f97316]"></div> Quickest
                            </button>
                            <button onClick={() => setShowRecommended(!showRecommended)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-all px-3 py-1.5 rounded-lg ${showRecommended ? 'bg-purple-500/20 text-purple-400' : 'opacity-40 hover:opacity-100'}`}>
                                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7]"></div> Recommended
                            </button>
                        </div>
                    </div>

                    {/* CHART AREA */}
                    <div className="flex-1 w-full min-h-0 relative">
                        <AnalysisChart
                            data={chartData}
                            showCheapest={showCheapest}
                            showQuickest={showQuickest}
                            showRecommended={showRecommended}
                            onPointClick={handleChartPointClick}
                        />
                    </div>

                </div>
            </div>

            {/* RIGHT SIDEBAR (25%) */}
            <div className="w-1/4 h-full p-6 pt-24 pr-6 flex flex-col pointer-events-auto">
                <div className="relative h-full glass-panel rounded-3xl border border-white/10 p-6 flex flex-col bg-black/60 backdrop-blur-2xl">
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors z-50 hover:bg-white/10 rounded-full"
                    >
                        <X size={24} />
                    </button>

                    <h2 className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                        <TrendingUp size={16} /> Analysis Parameters
                    </h2>

                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">

                        {/* Cities */}
                        <div className="space-y-4">
                            <CityAutocomplete
                                label="Origin City"
                                value={origin}
                                onChange={setOrigin}
                                placeholder="Search origin..."
                            />

                            <CityAutocomplete
                                label="Destination City"
                                value={destination}
                                onChange={setDestination}
                                placeholder="Search destination..."
                            />
                        </div>

                        <hr className="border-white/5" />

                        {/* Date Ranges */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* Duration Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Min Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={minDays}
                                    onChange={(e) => setMinDays(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all font-mono text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Max Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={maxDays}
                                    onChange={(e) => setMaxDays(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all font-mono text-center"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Action Button */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <button className="w-full py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                            <Search size={18} /> ANALYZE PRICES
                        </button>
                    </div>
                </div>
            </div>

            {/* FLIGHT DETAILS MODAL */}
            <FlightDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={selectedFlight}
            />
        </div>
    );
}
