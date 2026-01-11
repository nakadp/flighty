import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plane, Building2 } from 'lucide-react';
import { mockCities } from '../utils/mockCities';

const CityAutocomplete = ({ label, value, onChange, placeholder = "Search city or airport..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [filteredCities, setFilteredCities] = useState([]);
    const wrapperRef = useRef(null);

    // Sync internal state if prop value changes externally
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term.length > 0) {
            const lowerTerm = term.toLowerCase();
            const results = mockCities.filter(c =>
                c.city.toLowerCase().includes(lowerTerm) ||
                c.code.toLowerCase().includes(lowerTerm) ||
                c.airport.toLowerCase().includes(lowerTerm) ||
                c.country.toLowerCase().includes(lowerTerm)
            );
            setFilteredCities(results);
            setIsOpen(true);
        } else {
            setFilteredCities([]);
            setIsOpen(false);
        }

        // If user clears input, verify if they want to clear the selection too
        if (term === '') {
            onChange('');
        }
    };

    const handleSelect = (cityObj) => {
        setSearchTerm(`${cityObj.city} (${cityObj.code})`);
        onChange(`${cityObj.city} (${cityObj.code})`); // Or pass the full object back if needed
        setIsOpen(false);
    };

    return (
        <div className="group relative" ref={wrapperRef}>
            {label && (
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-cyan-400 transition-colors">
                    {label}
                </label>
            )}

            <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    onFocus={() => {
                        if (searchTerm) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm 
                               focus:border-cyan-500/50 focus:outline-none focus:bg-white/5 transition-all font-mono uppercase placeholder:normal-case placeholder:text-slate-600"
                />
            </div>

            {/* Dropdown Results */}
            {isOpen && filteredCities.length > 0 && (
                <div className="absolute top-full mt-2 left-0 w-full max-h-64 overflow-y-auto custom-scrollbar bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[100]">
                    {filteredCities.map((item, index) => {
                        const isCityCode = item.airport === "All Airports";
                        return (
                            <button
                                key={`${item.code}-${index}`}
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/10 transition-colors flex items-center gap-3 group/item"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCityCode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                    {isCityCode ? <Building2 size={14} /> : <Plane size={14} />}
                                </div>
                                <div>
                                    <div className="text-white text-sm font-bold flex items-center gap-2">
                                        {item.city}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCityCode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                                            {item.code}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 group-hover/item:text-slate-300">
                                        {item.airport}, {item.country}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CityAutocomplete;
