import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Scan, Aperture } from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import * as bcbp from 'bcbp';

export default function BoardingPassScanner({ onClose, onScanSuccess, accentColor = 'cyan' }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [scanAnimation, setScanAnimation] = useState(false);
    const fileInputRef = useRef(null);
    const scannerRef = useRef(null);
    const readerId = "boarding-pass-reader";

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobile && !scannerRef.current) {
            startCamera();
        }
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [isMobile]);

    const startCamera = async () => {
        try {
            const permission = await Html5Qrcode.getCameras();
            if (permission && permission.length > 0) {
                const html5QrCode = new Html5Qrcode(readerId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 200 },
                    aspectRatio: 1.0
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => handleScan(decodedText),
                    (errorMessage) => {
                        // Ignore scan errors as they happen every frame
                    }
                );
                setScanning(true);
            } else {
                setError("No cameras found.");
            }
        } catch (err) {
            console.error(err);
            setError("Camera access denied or unavailable.");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const html5QrCode = new Html5Qrcode(readerId + "-file");
        html5QrCode.scanFileV2(file, true)
            .then(decodedText => {
                handleScan(decodedText);
            })
            .catch(err => {
                console.error(err);
                setError("Could not read barcode from image. Please ensure the barcode is clear.");
            });
    };

    const handleScan = (decodedText) => {
        // Trigger generic success animation
        setScanAnimation(true);

        // Pause briefly to show animation then process
        setTimeout(() => {
            try {
                let decoded = null;
                try {
                    decoded = bcbp.default ? bcbp.default.decode(decodedText) : bcbp.decode(decodedText);
                } catch (e) {
                    console.warn("BCBP Parse failed", e);
                    setError("Not a valid Boarding Pass barcode.");
                    setScanAnimation(false);
                    return;
                }

                if (decoded && decoded.data && decoded.data.legs && decoded.data.legs.length > 0) {
                    const leg = decoded.data.legs[0];
                    const dateStr = leg.flightDate ? new Date(leg.flightDate).toISOString().split('T')[0] : '';

                    const parsed = {
                        depCode: leg.departureAirport,
                        arrCode: leg.arrivalAirport,
                        airline: leg.operatingCarrierDesignator,
                        flightNumber: leg.flightNumber.replace(/\s+/g, ''),
                        date: dateStr,
                        seat: leg.seatNumber,
                        name: decoded.data.passengerName
                    };
                    onScanSuccess(parsed);
                    onClose();
                } else {
                    setError("No flight leg info found in barcode.");
                    setScanAnimation(false);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to parse boarding pass data.");
                setScanAnimation(false);
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative w-full max-w-lg bg-black/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isMobile ? 'h-[100vh]' : 'h-auto p-6'}`}>

                {/* Header */}
                <div className="p-4 flex justify-between items-center z-10 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Scan size={18} className={`text-${accentColor}-400`} />
                        Scan Boarding Pass
                    </h3>
                    <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white/50 hover:text-white hover:bg-white/20 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center relative bg-black">

                    {error && (
                        <div className="absolute top-20 left-4 right-4 z-20 bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {isMobile ? (
                        <>
                            <div id={readerId} className="w-full h-full object-cover"></div>
                            {/* Overlay UI for Camera */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                {/* Viewfinder */}
                                <div className={`w-[280px] h-[180px] border-2 border-${accentColor}-400/50 rounded-lg relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)_inset]`}>
                                    {/* Corner Accents */}
                                    <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-${accentColor}-500 rounded-tl-sm`}></div>
                                    <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-${accentColor}-500 rounded-tr-sm`}></div>
                                    <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-${accentColor}-500 rounded-bl-sm`}></div>
                                    <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-${accentColor}-500 rounded-br-sm`}></div>

                                    {/* Scanning Animation */}
                                    <div className={`absolute left-0 right-0 h-0.5 bg-${accentColor}-400 shadow-[0_0_15px_${accentColor}] animate-[scan_2s_infinite_linear]`}></div>

                                    {scanAnimation && (
                                        <div className={`absolute inset-0 bg-${accentColor}-500/20 flex items-center justify-center animate-pulse`}>
                                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                                                <Scan size={32} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-8 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                                    Align barcode within frame
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center gap-6 py-12 px-6 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 transition-all bg-white/5">
                            <div className={`p-6 bg-${accentColor}-500/10 rounded-full mb-2`}>
                                <Upload size={32} className={`text-${accentColor}-400`} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-white font-medium">Upload Boarding Pass Image</h4>
                                <p className="text-slate-400 text-sm max-w-[200px]">
                                    Upload a photo or screen capture of your boarding pass barcode (PDF417, QR).
                                </p>
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className={`bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_${accentColor}/40]`}>
                                Choose File
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            {/* Hidden div for file scanner to use if needed, though scanFileV2 doesn't strictly need DOM */}
                            <div id={readerId + "-file"} className="hidden"></div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
