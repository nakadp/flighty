import React, { useState, useEffect } from 'react';
import { X, Plane, Search } from 'lucide-react';
import { AIRPORTS } from '../data/airports';
import { useLanguage } from '../context/LanguageContext';

export default function FlightForm({ onClose, onSubmit, initialData = null }) {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState({
        depCode: '', depName: '', depLat: '', depLng: '', depCountry: '',
        arrCode: '', arrName: '', arrLat: '', arrLng: '', arrCountry: '',
        airline: '', flightNumber: '', aircraft: '',
        date: '', notes: ''
    });

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev, // Keep defaults for new fields if old data doesn't have them
                ...initialData
            }));
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
                        depLng: airport.lng,
                        depCountry: airport.country || ''
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        arrCode: airport.iata,
                        arrName: airport.name,
                        arrLat: airport.lat,
                        arrLng: airport.lng,
                        arrCountry: airport.country || ''
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
        <div className="glass-panel rounded-2xl w-[95%] md:w-full md:max-w-2xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in duration-200 border border-white/10 bg-black/80 backdrop-blur-xl">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plane className="text-cyan-400" size={20} />
                    {initialData ? t('edit_flight') : t('log_new_flight')}
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="flight-form" onSubmit={handleSubmit} className="space-y-8">

                    {/* Flight Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            {t('basic_info')} <span className="h-px bg-white/10 flex-1"></span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label={t('airline') + " (Optional)"} name="airline" value={formData.airline} onChange={handleChange} placeholder="Delta" />
                            <Input label={t('flight_number')} name="flightNumber" value={formData.flightNumber} onChange={handleChange} placeholder="DL123" />
                            <Input label={t('aircraft')} name="aircraft" value={formData.aircraft} onChange={handleChange} placeholder="A350-900" />
                        </div>
                    </div>

                    {/* Departure Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 w-full">
                                {t('departure')} <span className="h-px bg-cyan-900/50 flex-1"></span>
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-3">
                                <Input
                                    label={t('code')}
                                    name="depCode"
                                    value={formData.depCode}
                                    onChange={(e) => handleCodeChange(e, 'dep')}
                                    required placeholder="PEK"
                                    maxLength={3}
                                />
                            </div>
                            <div className="md:col-span-5">
                                <Input label={t('airport_name')} name="depName" value={formData.depName} onChange={handleChange} required placeholder="Beijing Capital" />
                            </div>
                            <div className="md:col-span-4">
                                <Input label={t('country')} name="depCountry" value={formData.depCountry} onChange={handleChange} placeholder="China" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-dashed border-white/10 opacity-60 hover:opacity-100 transition-opacity">
                            <Input label={t('latitude')} name="depLat" value={formData.depLat} onChange={handleChange} required placeholder="39.9042" />
                            <Input label={t('longitude')} name="depLng" value={formData.depLng} onChange={handleChange} required placeholder="116.4074" />
                        </div>
                    </div>

                    {/* Arrival Section */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 w-full">
                            {t('arrival')} <span className="h-px bg-emerald-900/50 flex-1"></span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-3">
                                <Input
                                    label={t('code')}
                                    name="arrCode"
                                    value={formData.arrCode}
                                    onChange={(e) => handleCodeChange(e, 'arr')}
                                    required placeholder="LHR"
                                    maxLength={3}
                                />
                            </div>
                            <div className="md:col-span-5">
                                <Input label={t('airport_name')} name="arrName" value={formData.arrName} onChange={handleChange} required placeholder="Heathrow" />
                            </div>
                            <div className="md:col-span-4">
                                <Input label={t('country')} name="arrCountry" value={formData.arrCountry} onChange={handleChange} placeholder="UK" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-dashed border-white/10 opacity-60 hover:opacity-100 transition-opacity">
                            <Input label={t('latitude')} name="arrLat" value={formData.arrLat} onChange={handleChange} required placeholder="51.5074" />
                            <Input label={t('longitude')} name="arrLng" value={formData.arrLng} onChange={handleChange} required placeholder="-0.1278" />
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div className="space-y-4">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            {t('details')} <span className="h-px bg-white/10 flex-1"></span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Pass lang attribute to date input to hint browser format */}
                            <Input label={t('date')} type="date" name="date" value={formData.date} onChange={handleChange} required lang={language} />
                            <Input label={t('notes')} name="notes" value={formData.notes} onChange={handleChange} placeholder="Business trip..." />
                        </div>
                    </div>
                </form>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">{t('cancel')}</button>
                <button form="flight-form" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold border border-cyan-400/20 rounded px-6 py-2 transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)]">
                    {initialData ? t('update_flight') : t('save_flight')}
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
                className="bg-black/50 border border-white/20 text-white rounded px-3 py-2 w-full focus:outline-none focus:border-cyan-400 transition-colors placeholder-slate-600 font-sans text-sm"
                {...props}
            />
        </div>
    )
}
