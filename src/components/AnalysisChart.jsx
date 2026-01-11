import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Custom Tooltip for Glassmorphism Look
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl z-50">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => {
                        // Access the rich object from the payload
                        const dataPoint = entry.payload[entry.dataKey.split('.')[0]];
                        // entry.value is the price directly

                        return (
                            <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: entry.color }}></div>
                                <div>
                                    <div className="text-white text-sm font-mono font-bold">¥{entry.value.toLocaleString()}</div>
                                    <div className="text-[10px] text-gray-500 capitalize flex flex-col">
                                        <span>{entry.name}</span>
                                        {dataPoint && <span className="opacity-70">{dataPoint.airline} • {dataPoint.duration}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-cyan-400 text-center uppercase tracking-widest opacity-70">
                    Click node for details
                </div>
            </div>
        );
    }
    return null;
};

const AnalysisChart = ({ data, showCheapest, showQuickest, showRecommended, onPointClick }) => {

    // Handler for clicking a dot
    const handleDotClick = (data, event, type) => {
        // 'data' here is the specific data point (e.g., the rich object for cheapest)
        // Recharts passes the specific payload for the dot
        // ACTUALLY: For Dot click, 'data' is usually the full payload object of that index + metadata.
        // We need to extract the specific type object.

        // Let's rely on the payload passed by Recharts.
        // If we click a dot on "Cheapest" line, we want the "cheapest" object.

        // Simpler way: pass a closure that knows the type.
        if (onPointClick && data && data.payload) {
            // data.payload is the full row object { date, cheapest: {...}, shortest: {...} }
            // We need to know WHICH line was clicked to pass the right object.
            // But the 'data' passed to onClick of <Line> or <Dot> usually contains the value and payload.

            // However, generic onClick on Line receives the event and proper payload?
            // Recharts is tricky. activeDot onClick receives (props, event). props.payload is the full row.

            const richData = data.payload[type];
            if (richData) {
                onPointClick(richData);
            }
        }
    };

    return (
        <div className="w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            dataKey="cheapest.price"
                            name="Cheapest"
                            stroke="#06b6d4"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0, fillOpacity: 1, cursor: 'pointer' }}
                            activeDot={{
                                r: 8,
                                stroke: '#06b6d4',
                                strokeWidth: 2,
                                fill: '#000',
                                onClick: (p, e) => handleDotClick(p, e, 'cheapest'),
                                cursor: 'pointer'
                            }}
                            animationDuration={1000}
                            style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))' }}
                        />
                    )}
                    {showQuickest && (
                        <Line
                            type="monotone"
                            dataKey="shortest.price"
                            name="Quickest"
                            stroke="#f97316"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{
                                r: 6,
                                onClick: (p, e) => handleDotClick(p, e, 'shortest'),
                                cursor: 'pointer'
                            }}
                            strokeDasharray="5 5"
                        />
                    )}
                    {showRecommended && (
                        <Line
                            type="monotone"
                            dataKey="recommended.price"
                            name="Recommended"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{
                                r: 6,
                                onClick: (p, e) => handleDotClick(p, e, 'recommended'),
                                cursor: 'pointer'
                            }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AnalysisChart;
