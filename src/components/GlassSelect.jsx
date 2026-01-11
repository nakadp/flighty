import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const GlassSelect = ({ value, onChange, options, label, icon: Icon, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Label if needed */}
            {label && <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">{label}:</span>}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg border border-white/5 
                           hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer min-w-[140px] justify-between
                           ${isOpen ? 'border-cyan-500/50 bg-cyan-900/10' : ''}`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={14} className="text-cyan-400" />}
                    <span className="text-cyan-400 font-bold text-sm truncate">{value}</span>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-full min-w-[160px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group
                                          ${value === option
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300'}`}
                            >
                                {option}
                                {value === option && <Check size={12} className="text-cyan-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlassSelect;
