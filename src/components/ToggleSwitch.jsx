import React from 'react';
import { Globe, Map } from 'lucide-react';

export default function ToggleSwitch({ viewMode, onChange, accentColor = 'cyan' }) {
    return (
        <div className="flex bg-slate-900/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
            <button
                onClick={() => onChange('3D')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === '3D'
                    ? `bg-${accentColor}-600/90 text-white shadow-lg shadow-${accentColor}-900/50`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
            >
                <Globe size={14} />
                3D GLOBE
            </button>
            <button
                onClick={() => onChange('2D')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === '2D'
                    ? `bg-${accentColor}-600/90 text-white shadow-lg shadow-${accentColor}-900/50`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
            >
                <Map size={14} />
                2D MAP
            </button>
        </div>
    );
}
