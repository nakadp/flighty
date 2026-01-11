import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Search, TrendingUp, X, Globe, Layers, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../firebase';
import AnalysisChart from './AnalysisChart';
import CityAutocomplete from './CityAutocomplete';
import GlassSelect from './GlassSelect';
import FlightDetailsModal from './FlightDetailsModal';

export default function AnalysisPage() {
    const navigate = useNavigate();

    // State for Inputs
    const [origin, setOrigin] = useState('PEK'); // Default code for demo
    const [destination, setDestination] = useState('LHR');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default +30 days
    const [minDays, setMinDays] = useState(5);
    const [maxDays, setMaxDays] = useState(9);

    // State for Chart Controls
    const [displayLength, setDisplayLength] = useState("5 Days");
    const [platform, setPlatform] = useState("Trip.com");

    // Visibility Toggles
    const [showCheapest, setShowCheapest] = useState(true);
    const [showQuickest, setShowQuickest] = useState(true);
    const [showRecommended, setShowRecommended] = useState(true);

    // Modal State
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Data State
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState('idle'); // idle, pending, running, completed, failed
    const [realData, setRealData] = useState({}); // { "2026-03-01": { cheapest: {...}, ... } }
    const [logs, setLogs] = useState([]);

    // 1. Generate available durations for dropdown
    const availableDurations = useMemo(() => {
        const options = [];
        const min = parseInt(minDays) || 1;
        const max = parseInt(maxDays) || 10;
        for (let i = min; i <= max; i++) {
            options.push(`${i} Days`);
        }
        return options;
    }, [minDays, maxDays]);

    // 2. Transform Real Data for Chart
    const chartData = useMemo(() => {
        const selectedDays = parseInt(displayLength.split(' ')[0]) || 5;
        const dataKey = `days_${selectedDays}`;

        // Convert map { "2026-03-01": { days_5: {...} } }  to Array for Recharts
        // Need to sort by date
        const dates = Object.keys(realData).sort();

        return dates.map(date => {
            const dayData = realData[date]?.[dataKey];
            if (!dayData) return null;

            return {
                date: date,
                price: dayData.cheapest?.price || 0, // Default to cheapest for main line
                currency: dayData.cheapest?.currency || 'CNY',
                cheapest: dayData.cheapest,
                quickest: dayData.quickest,
                recommended: dayData.recommended || dayData.cheapest
            };
        }).filter(item => item !== null);
    }, [realData, displayLength]);


    // 3. JOB TRIGGER: Start Analysis
    const handleAnalyze = async () => {
        if (!auth.currentUser) {
            // For demo purposes, we allow proceed or alert
            // alert("Please login first!"); 
            // return;
        }

        const userId = auth.currentUser ? auth.currentUser.uid : "test_user_001";

        try {
            setJobStatus('pending');
            setRealData({}); // Clear previous data
            setLogs(prev => [...prev, `🚀 Starting analysis job for ${origin}->${destination}...`]);

            const docRef = await addDoc(collection(db, "analysis_jobs"), {
                userId: userId,
                origin,
                destination,
                startDate,
                endDate,
                minDays: parseInt(minDays),
                maxDays: parseInt(maxDays),
                status: 'pending',
                createdAt: serverTimestamp()
            });

            setJobId(docRef.id);
            setLogs(prev => [...prev, `⏳ Job Queued: ${docRef.id}`]);

        } catch (error) {
            console.error("Error creating job:", error);
            setJobStatus('failed');
            setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
        }
    };

    // 4. LISTENER: Monitor Job Status & Progress
    useEffect(() => {
        if (!jobId) return;

        // Listen to the specific job document
        const jobRef = doc(db, "analysis_jobs", jobId);

        const unsubscribe = onSnapshot(jobRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setJobStatus(data.status);

                // If there's a progress message, show it
                if (data.progress) {
                    setLogs([data.progress]); // Replace entire log array with single current status
                }
            }
        });

        return () => unsubscribe();
    }, [jobId]);

    // 5. LISTENER: Monitor Real-Time Results
    // TODO: Implement Real-Time Results Listener here if needed
    // The previous code had a placeholder comment here.

    return (
        <div className="flex h-screen w-full bg-black relative text-white overflow-hidden">
            {/* LEFT MAIN PANEL (75%) */}
            <div className="w-3/4 h-full p-6 pt-24 pl-6 flex flex-col">
                <div className="w-full h-full flex flex-col">
                    <div className="flex-1 relative glass-panel rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
                        {/* CHART AREA */}
                        {
                            chartData.length > 0 ? (
                                <AnalysisChart
                                    data={chartData}
                                    showCheapest={showCheapest}
                                    showQuickest={showQuickest}
                                    showRecommended={showRecommended}
                                    onPointClick={(data) => {
                                        setSelectedFlight(data);
                                        setIsModalOpen(true);
                                    }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                    {jobStatus === 'idle' ? (
                                        <>
                                            <Globe size={48} className="mb-4 opacity-20" />
                                            <p>Select parameters and click Analysis</p>
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 size={48} className="mb-4 opacity-50 animate-spin" />
                                            <p className="font-mono text-sm text-cyan-400 font-bold tracking-wider mb-2">COLLECTING FLIGHT DATA...</p>

                                            {/* Dynamic Progress Text */}
                                            <div className="text-xs font-mono text-slate-400 max-w-sm text-center leading-relaxed px-4 py-2 bg-black/40 rounded-lg border border-white/5">
                                                {logs.length > 0 ? logs[0] : "Initializing Scraper..."}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        }
                    </div >

                </div >
            </div >

            {/* RIGHT SIDEBAR (25%) */}
            < div className="w-1/4 h-full p-6 pt-24 pr-6 flex flex-col pointer-events-auto" >
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
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all"
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
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all"
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
                        <button
                            onClick={handleAnalyze}
                            disabled={jobStatus === 'pending' || jobStatus === 'running'}
                            className={`w-full py-4 rounded-xl font-bold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2
                                ${jobStatus === 'pending' || jobStatus === 'running'
                                    ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            {jobStatus === 'pending' || jobStatus === 'running' ? (
                                <><Loader2 className="animate-spin" size={18} /> PROCESSING...</>
                            ) : (
                                <><Search size={18} /> ANALYZE PRICES</>
                            )}
                        </button>
                    </div>
                </div>
            </div >

            {/* FLIGHT DETAILS MODAL */}
            < FlightDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)
                }
                data={selectedFlight}
            />
        </div >
    );
}
