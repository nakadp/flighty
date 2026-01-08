import React from 'react';
import { X, Download, Share2, Link, Copy, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ShareSheet = ({
    isOpen,
    onClose,
    image,
    onSave,
    onShare,
    onCopyLink,
    accentColor = 'cyan'
}) => {
    const { t } = useLanguage();
    const [copied, setCopied] = React.useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        onCopyLink();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Common Button Styles
    const buttonClass = `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 group w-full`;
    const iconBgClass = `w-12 h-12 rounded-full flex items-center justify-center bg-${accentColor}-500/20 text-${accentColor}-400 group-hover:bg-${accentColor}-500 group-hover:text-white transition-colors`;

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Content Container - Bottom Sheet on Mobile, Modal on Desktop */}
            <div className="relative w-full md:w-auto md:min-w-[500px] md:max-w-4xl bg-[#0a0a0a] md:bg-[#0a0a0a]/90 md:backdrop-blur-xl border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 md:p-8 animate-mobile-sheet md:animate-desktop-modal shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white tracking-tight">{t('share_flight_map') || "Share Flight Map"}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">

                    {/* Preview Image */}
                    <div className="w-full md:w-1/2 aspect-video md:aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 relative group">
                        {image ? (
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <div className="animate-pulse">Generating Preview...</div>
                            </div>
                        )}
                        {/* Tag */}
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded bg-${accentColor}-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg`}>
                            Preview
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={onSave} className={buttonClass}>
                                <div className={iconBgClass}><Download size={24} /></div>
                                <span className="text-sm font-medium text-slate-200">{t('save_image') || "Save Image"}</span>
                            </button>

                            <button onClick={onShare} className={buttonClass}>
                                <div className={iconBgClass}><Share2 size={24} /></div>
                                <span className="text-sm font-medium text-slate-200">{t('share_via') || "Share via..."}</span>
                            </button>
                        </div>

                        <button onClick={handleCopy} className={`${buttonClass} flex-row w-full h-16 gap-4`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-400'}`}>
                                {copied ? <Check size={20} /> : <Link size={20} />}
                            </div>
                            <div className="flex flex-col items-start flex-1">
                                <span className="text-sm font-medium text-slate-200">{copied ? (t('link_copied') || "Copied!") : (t('copy_link') || "Copy Link")}</span>
                                <span className="text-xs text-slate-500 truncate max-w-[150px] md:max-w-[200px]">https://skytrace.app/...</span>
                            </div>
                            <div className="p-2">
                                <Copy size={16} className="text-slate-500" />
                            </div>
                        </button>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default ShareSheet;
