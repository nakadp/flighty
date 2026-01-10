import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Filter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ExportModal({ onClose, onExport, filterStats, accentColor = 'emerald' }) {
    const { t } = useLanguage();
    const [exportType, setExportType] = useState('filtered'); // 'filtered' or 'all'

    const handleExport = () => {
        onExport(exportType);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-slate-900 border border-${accentColor}-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}>

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet className={`text-${accentColor}-400`} size={20} />
                        {t('export_data')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className={`flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors group`}>
                            <input
                                type="radio"
                                name="exportType"
                                value="filtered"
                                checked={exportType === 'filtered'}
                                onChange={() => setExportType('filtered')}
                                className={`w-5 h-5 accent-${accentColor}-500`}
                            />
                            <div className="flex-1">
                                <div className={`font-bold text-white group-hover:text-${accentColor}-400 transition-colors`}>{t('export_filtered_view')}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {t('current_filters')}: <span className="text-white">{filterStats.year}, {filterStats.country}</span>
                                </div>
                            </div>
                            <Filter size={20} className={`text-slate-500 group-hover:text-${accentColor}-400`} />
                        </label>

                        <label className={`flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors group`}>
                            <input
                                type="radio"
                                name="exportType"
                                value="all"
                                checked={exportType === 'all'}
                                onChange={() => setExportType('all')}
                                className={`w-5 h-5 accent-${accentColor}-500`}
                            />
                            <div className="flex-1">
                                <div className={`font-bold text-white group-hover:text-${accentColor}-400 transition-colors`}>{t('export_all_data')}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {t('export_all_desc')}
                                </div>
                            </div>
                            <FileSpreadsheet size={20} className={`text-slate-500 group-hover:text-${accentColor}-400`} />
                        </label>
                    </div>

                    <div className={`bg-${accentColor}-500/10 border border-${accentColor}-500/20 rounded-lg p-3 text-xs text-${accentColor}-400/80`}>
                        <p>{t('export_note')}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleExport}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg bg-${accentColor}-600 text-white hover:bg-${accentColor}-500 transition-colors text-sm font-bold shadow-lg hover:shadow-${accentColor}-500/20`}
                    >
                        <Download size={16} />
                        {t('export')}
                    </button>
                </div>

            </div>
        </div>
    );
}
