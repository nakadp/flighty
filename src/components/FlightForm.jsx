import React, { useState, useEffect } from 'react';
import { X, Plane, Search } from 'lucide-react';
import { AIRPORTS } from '../data/airports';

export default function FlightForm({ onClose, onSubmit, initialData = null }) {
    const [formData, setFormData] = useState({
        depCode: '', depName: '', depLat: '', depLng: '',
        arrCode: '', arrName: '', arrLat: '', arrLng: '',
        date: '', notes: ''
    });

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    // Auto-fill logic
    const handleCodeChange = (e, type) => {
        const code = e.target.value.toUpperCase();
        setFormData(prev => ({ ...prev, [e.target.name]: code }));

        if (code.length === 3) {
            const airport = AIRPORTS.find(a => a.iata === code);
            if (airport) {
                if (type === 'dep') {
                    setFormData(prev => ({
                        ...prev,
                        depCode: airport.iata,
                        depName: airport.name,
                        depLat: airport.lat,
                        depLng: airport.lng
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        arrCode: airport.iata,
                        arrName: airport.name,
                        arrLat: airport.lat,
                        arrLng: airport.lng
                    }));
                }
            }
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const flight = {
            ...formData,
            // Preserve ID if editing, else new UUID
            id: initialData ? initialData.id : crypto.randomUUID(),
            depLat: parseFloat(formData.depLat),
            depLng: parseFloat(formData.depLng),
            arrLat: parseFloat(formData.arrLat),
            arrLng: parseFloat(formData.arrLng),
        };
        onSubmit(flight);
    };

    return (
        <div className="glass-panel rounded-2xl w-full shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plane className="text-cyan-400" size={20} />
                    {initialData ? 'Edit Flight' : 'Log New Flight'}
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="flight-form" onSubmit={handleSubmit} className="space-y-6">

                    {/* Departure Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Departure</h3>
                            <span className="text-[10px] text-slate-500">Auto-fills on valid IATA code (e.g., LHR)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Airport Code"
                                name="depCode"
                                value={formData.depCode}
                                onChange={(e) => handleCodeChange(e, 'dep')}
                                required placeholder="PEK"
                                maxLength={3}
                            />
                            <Input label="Airport Name" name="depName" value={formData.depName} onChange={handleChange} required placeholder="Beijing Capital" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                            <Input label="Latitude" name="depLat" value={formData.depLat} onChange={handleChange} required placeholder="39.9042" />
                            <Input label="Longitude" name="depLng" value={formData.depLng} onChange={handleChange} required placeholder="116.4074" />
                        </div>
                    </div>

                    {/* Arrival Section */}
                    <div className="space-y-3">
                        <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Arrival</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Airport Code"
                                name="arrCode"
                                value={formData.arrCode}
                                onChange={(e) => handleCodeChange(e, 'arr')}
                                required placeholder="LHR"
                                maxLength={3}
                            />
                            <Input label="Airport Name" name="arrName" value={formData.arrName} onChange={handleChange} required placeholder="Heathrow" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                            <Input label="Latitude" name="arrLat" value={formData.arrLat} onChange={handleChange} required placeholder="51.5074" />
                            <Input label="Longitude" name="arrLng" value={formData.arrLng} onChange={handleChange} required placeholder="-0.1278" />
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
                        <Input label="Notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Business trip..." />
                    </div>
                </form>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
                <button form="flight-form" type="submit" className="bg-cyan-600/80 hover:bg-cyan-500/80 text-white border border-white/10 rounded px-4 py-2 transition-all shadow-lg shadow-cyan-900/20">
                    {initialData ? 'Update Flight' : 'Save Flight'}
                </button>
            </div>
        </div>
    );
}

function Input({ label, type = "text", ...props }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">{label}</label>
            <input
                type={type}
                className="bg-black/50 border border-white/20 text-white rounded px-3 py-2 w-full focus:outline-none focus:border-cyan-400 transition-colors placeholder-slate-600 font-mono text-sm"
                {...props}
            />
        </div>
    )
}
