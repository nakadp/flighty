import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, MapPin, Search, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateMockAnalysisData } from '../utils/mockAnalysisData';

// Custom Tooltip for Glassmorphism Look
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-white text-sm font-mono font-bold">¥{entry.value.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 capitalize">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function AnalysisPage() {
    const navigate = useNavigate();
    // State for Inputs
    const [origin, setOrigin] = useState('PEK');
    const [destination, setDestination] = useState('LHR');
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

    // Generate Data based on duration/platform
    const chartData = useMemo(() => {
        // Extract number from "5 Days"
        const durationArg = displayLength.split(' ')[0];
        return generateMockAnalysisData(durationArg, platform);
    }, [displayLength, platform]);

    const availableDurations = useMemo(() => {
        // Generate dropdown options based on Min/Max days input
        const options = [];
        for (let i = parseInt(minDays); i <= parseInt(maxDays); i++) {
            options.push(`${i} Days`);
        }
        return options;
    }, [minDays, maxDays]);

    return (
        <div className="absolute inset-0 z-40 flex flex-row pointer-events-none">
            {/* LEFT VISUALIZATION AREA (75%) */}
            <div className="w-3/4 h-full p-6 pt-24 pl-6 flex flex-col pointer-events-auto">
                <div className="flex-1 glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col p-6 backdrop-blur-2xl bg-black/40">

                    {/* TOP CONTROL BAR */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Trip Length:</span>
                                <select
                                    value={displayLength}
                                    onChange={(e) => setDisplayLength(e.target.value)}
                                    className="bg-transparent text-cyan-400 font-bold text-sm outline-none border-none cursor-pointer"
                                >
                                    {availableDurations.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Platform:</span>
                                <select
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="bg-transparent text-purple-400 font-bold text-sm outline-none border-none cursor-pointer"
                                >
                                    <option className="bg-slate-900" value="Aggregate All">Aggregate All</option>
                                    <option className="bg-slate-900" value="Trip.com">Trip.com</option>
                                    <option className="bg-slate-900" value="Expedia">Expedia</option>
                                </select>
                            </div>
                        </div>

                        {/* LEGEND / TOGGLES */}
                        <div className="flex gap-4 items-center">
                            <button onClick={() => setShowCheapest(!showCheapest)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-opacity ${showCheapest ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="w-3 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></div> Cheapest
                            </button>
                            <button onClick={() => setShowQuickest(!showQuickest)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-opacity ${showQuickest ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="w-3 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]"></div> Quickest
                            </button>
                            <button onClick={() => setShowRecommended(!showRecommended)} className={`flex items-center gap-2 text-xs uppercase font-bold transition-opacity ${showRecommended ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="w-3 h-1 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"></div> Recommended
                            </button>
                        </div>
                    </div>

                    {/* CHART AREA */}
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#475569"
                                    tick={{ fill: '#475569', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#475569"
                                    tick={{ fill: '#475569', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `¥${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />

                                {showCheapest && (
                                    <Line
                                        type="monotone"
                                        dataKey="cheapest"
                                        name="Cheapest"
                                        stroke="#06b6d4"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0, fillOpacity: 1 }}
                                        activeDot={{ r: 8, stroke: '#06b6d4', strokeWidth: 2, fill: '#000' }}
                                        animationDuration={1000}
                                        style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))' }}
                                    />
                                )}
                                {showQuickest && (
                                    <Line
                                        type="monotone"
                                        dataKey="shortest"
                                        name="Quickest"
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                        strokeDasharray="5 5"
                                    />
                                )}
                                {showRecommended && (
                                    <Line
                                        type="monotone"
                                        dataKey="recommended"
                                        name="Recommended"
                                        stroke="#a855f7"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                </div>
            </div>

            {/* RIGHT SIDEBAR (25%) */}
            <div className="w-1/4 h-full p-6 pt-24 pr-6 flex flex-col pointer-events-auto">
                {/* Close Button - Floated outside or inside panel? Inside panel top-right seems best for glass look, or absolute on page. 
                     Prompt said: "Exit: Add a prominent 'Close' (X) button in the top-right corner that navigates back to /"
                     Let's put it top-right of the screen/container, above the panel or inside it. 
                     Inside the panel header is cleanest. */}

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
                            <div className="group">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-cyan-400 transition-colors">Origin City</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        value={origin}
                                        onChange={(e) => setOrigin(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all font-mono uppercase"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-cyan-400 transition-colors">Destination City</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all font-mono uppercase"
                                    />
                                </div>
                            </div>
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
        </div>
    );
}
