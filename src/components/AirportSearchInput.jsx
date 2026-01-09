import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { AIRPORTS } from '../data/airports';

export default function AirportSearchInput({ label, value, onSelect, accentColor = 'cyan', required, placeholder }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef(null);

    // Sync internal query with external value if it changes independently
    // AND trigger a search if it's a significant change (likely from scanner/external fill)
    useEffect(() => {
        if (value !== undefined && value !== query) {
            setQuery(value);
            if (value.length >= 2) {
                performSearch(value);
            }
        }
    }, [value]); // query is excluded to avoid loops

    useEffect(() => {
        // Click outside to close
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const performSearch = (text) => {
        if (!text || text.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const lower = text.toLowerCase();
        // Fuzzy search: Match Name, City, or IATA
        const matches = AIRPORTS.filter(a =>
            (a.city && a.city.toString().toLowerCase().includes(lower)) ||
            (a.name && a.name.toString().toLowerCase().includes(lower)) ||
            (a.iata && a.iata.toString().toLowerCase().includes(lower))
        ).slice(0, 50);

        setResults(matches);
        setShowDropdown(true);
    };

    const handleSearch = (e) => {
        const text = e.target.value;
        setQuery(text);

        // Notify parent of text change (for custom names)
        if (onSelect) {
            onSelect(text, null);
        }

        performSearch(text);
    };

    const handleSelectItem = (airport) => {
        setQuery(airport.name);
        setShowDropdown(false);
        if (onSelect) onSelect(airport.name, airport);
    };

    return (
        <div className="flex flex-col gap-1.5 w-full relative" ref={wrapperRef}>
            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={handleSearch}
                    onFocus={() => { if (query.length >= 2 && results.length > 0) setShowDropdown(true); }}
                    required={required}
                    className={`bg-black/50 border border-white/20 text-white rounded px-3 py-2 w-full focus:outline-none focus:border-${accentColor}-400 transition-colors placeholder-slate-600 font-sans text-sm pl-8`}
                    placeholder={placeholder || "Search city, airport or code..."}
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={14} />
                </div>
            </div>

            {/* Dropdown Results */}
            {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-white/10 custom-scrollbar">
                    {results.map((airport) => (
                        <button
                            key={airport.iata}
                            type="button"
                            onClick={() => handleSelectItem(airport)}
                            className={`w-full text-left px-4 py-3 hover:bg-${accentColor}-500/10 transition-colors flex items-center justify-between group`}
                        >
                            <div className="flex flex-col overflow-hidden mr-3">
                                <span className="text-sm font-medium truncate text-white group-hover:text-${accentColor}-300">
                                    {airport.city ? `${airport.city} ` : ''}
                                    <span className="text-slate-500 font-normal">- {airport.name}</span>
                                </span>
                                <span className="text-[10px] text-slate-500 truncate group-hover:text-${accentColor}-500/70 uppercase tracking-wider">
                                    {airport.country}
                                </span>
                            </div>
                            <span className={`text-xs font-bold bg-white/5 px-2 py-1 rounded text-slate-300 font-mono ml-auto group-hover:bg-${accentColor}-500/20 group-hover:text-${accentColor}-300 shrink-0`}>
                                {airport.iata}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
