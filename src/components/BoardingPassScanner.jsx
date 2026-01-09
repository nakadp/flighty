import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Camera, Scan, Aperture, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import { decode as bcbpDecode } from 'bcbp';
import Tesseract from 'tesseract.js';

export default function BoardingPassScanner({ onClose, onScanSuccess, accentColor = 'cyan' }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState(null);
    const [scanAnimation, setScanAnimation] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fileInputRef = useRef(null);
    const scannerRef = useRef(null);
    const readerId = "boarding-pass-reader";

    // Ensure we only render portal on client and when mounted
    useEffect(() => {
        setMounted(true);
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobile && mounted) {
            startCamera();
        } else {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
                setScanning(false);
            }
        }
    }, [isMobile, mounted]);

    const startCamera = async () => {
        try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
                const html5QrCode = new Html5Qrcode(readerId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 220 },
                    aspectRatio: 1.0
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => handleBarcodeSuccess(decodedText),
                    (errorMessage) => { }
                );
                setScanning(true);
                setError(null);
            } else {
                setError("No cameras found.");
            }
        } catch (err) {
            console.error(err);
            setError("Camera access denied.");
        }
    };

    const handleBarcodeSuccess = (decodedText) => {
        if (processing) return;

        console.log("Barcode found:", decodedText);
        setProcessing(true);
        setScanAnimation(true);

        try {
            let decoded = null;
            try {
                decoded = bcbpDecode(decodedText);
            } catch (e) {
                console.warn("BCBP Decode Error:", e);
            }

            if (decoded && decoded.data && decoded.data.legs && decoded.data.legs.length > 0) {
                finalizeScan(decoded);
            } else {
                setStatusMessage("Barcode found but format unrecognizable.");
                setProcessing(false);
                setScanAnimation(false);
            }
        } catch (err) {
            console.error(err);
            setProcessing(false);
            setScanAnimation(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        processImage(file);
    };

    const captureAndProcess = async () => {
        if (!scannerRef.current) return;

        setProcessing(true);
        setStatusMessage("Capturing image...");

        try {
            const videoElement = document.querySelector(`#${readerId} video`);
            if (videoElement) {
                const canvas = document.createElement("canvas");
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    processImage(blob);
                }, 'image/jpeg', 0.95);
            } else {
                setError("Could not capture camera frame.");
                setProcessing(false);
            }
        } catch (e) {
            console.error(e);
            setError("Capture failed.");
            setProcessing(false);
        }
    };

    const processImage = async (imageFile) => {
        setProcessing(true);
        setError(null);
        setStatusMessage("Scanning...");

        try {
            const html5QrCode = new Html5Qrcode(readerId + "-hidden");
            const decodedText = await html5QrCode.scanFileV2(imageFile, true);

            console.log("File Barcode Success:", decodedText);
            let decoded = null;
            try {
                decoded = bcbpDecode(decodedText);
            } catch (e) { console.warn("BCBP File Decode Error", e); }

            if (decoded && decoded.data && decoded.data.legs && decoded.data.legs.length > 0) {
                finalizeScan(decoded);
                return;
            }
        } catch (err) {
            console.log("Barcode scan on file failed/not found, trying OCR...", err);
        }

        setStatusMessage("Reading text...");
        try {
            const result = await Tesseract.recognize(
                imageFile,
                'eng',
                { logger: m => console.log(m) }
            );

            const text = result.data.text;
            console.log("OCR Text:", text);

            const extracted = parseOCRText(text);
            if (extracted) {
                setStatusMessage("Flight info found!");
                setTimeout(() => {
                    onScanSuccess(extracted);
                    onClose();
                }, 1000);
            } else {
                setError("Could not identify flight details. Please try again or enter manually.");
            }
        } catch (err) {
            console.error("OCR Error:", err);
            setError("Failed to read image.");
        } finally {
            setProcessing(false);
            setScanAnimation(false);
        }
    };

    const parseOCRText = (text) => {
        const cleanText = text.toUpperCase().replace(/[\r\n]+/g, ' ');
        const flightRegex = /([A-Z0-9]{2,3})\s?([0-9]{3,4})/;
        const dateRegex = /([0-9]{1,2})\s?([A-Z]{3})/;

        const flightMatch = cleanText.match(flightRegex);
        const dateMatch = cleanText.match(dateRegex);

        if (flightMatch) {
            const airline = flightMatch[1];
            const number = flightMatch[2];

            let dateStr = "";
            if (dateMatch) {
                const day = dateMatch[1].padStart(2, '0');
                const monthStr = dateMatch[2];
                const currentYear = new Date().getFullYear();
                const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
                const m = months[monthStr];
                if (m) {
                    dateStr = `${currentYear}-${m}-${day}`;
                }
            }

            return {
                flightNumber: number,
                airline: airline,
                date: dateStr,
                depCode: "",
                arrCode: ""
            };
        }
        return null;
    };

    const finalizeScan = (decoded) => {
        setStatusMessage("Success!");
        setScanAnimation(true);
        setTimeout(() => {
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
        }, 1000);
    };

    // Use portal safely
    if (!mounted) return null;

    // Styling helpers
    const borderColor = `border-${accentColor}-500`;
    const textColor = `text-${accentColor}-400`;
    const bgColor = `bg-${accentColor}-500`;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-in fade-in duration-200">
            <div className={`
                relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col 
                ${isMobile ? 'h-[100dvh] rounded-none' : 'h-auto max-h-[90vh]'}
            `}>

                {/* Header */}
                <div className={`${isMobile ? 'absolute top-0 left-0 right-0' : 'relative'} z-20 p-6 flex justify-between items-start`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-${accentColor}-500/20 flex items-center justify-center`}>
                            <Scan size={16} className={`text-${accentColor}-400`} />
                        </div>
                        <span className="text-white font-semibold drop-shadow-md">Scan Boarding Pass</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/40 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Status Toast - Centered Top */}
                {processing && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-6 py-2.5 bg-[#1a1a1a] rounded-full flex items-center gap-3 border border-white/10 shadow-lg animate-in slide-in-from-top-4">
                        <Loader2 size={16} className={`animate-spin text-${accentColor}-400`} />
                        <span className="text-white text-sm font-medium">{statusMessage || "Processing..."}</span>
                    </div>
                )}

                {/* Error Toast */}
                {error && (
                    <div className="absolute top-20 left-6 right-6 z-30 animate-in slide-in-from-top-4">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg backdrop-blur-md">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <AlertCircle className="text-red-400" size={18} />
                            </div>
                            <p className="text-red-200 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 relative bg-black flex flex-col items-center justify-center">

                    {isMobile ? (
                        <>
                            {/* Camera View */}
                            <div id={readerId} className="w-full h-full object-cover" />

                            {/* Overlay */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                                {/* Focus Frame */}
                                <div className={`
                                      w-[75%] aspect-[3/2] rounded-3xl border-2 relative overflow-hidden transition-all duration-500 box-border
                                      ${scanAnimation ? `border-${accentColor}-500 shadow-[0_0_60px_${accentColor}/20]` : 'border-white/30'}
                                  `}>
                                    {!processing && (
                                        <div className={`absolute top-0 left-0 w-full h-0.5 bg-${accentColor}-500 shadow-[0_0_20px_${accentColor}] animate-[scan_2s_infinite_linear]`} />
                                    )}

                                    {/* Corner Accents */}
                                    <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${processing ? `border-${accentColor}-500` : 'border-white'} transition-colors`} />
                                    <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${processing ? `border-${accentColor}-500` : 'border-white'} transition-colors`} />
                                    <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${processing ? `border-${accentColor}-500` : 'border-white'} transition-colors`} />
                                    <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl ${processing ? `border-${accentColor}-500` : 'border-white'} transition-colors`} />
                                </div>

                                <div className="mt-12 text-center pointer-events-auto space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
                                        <Scan size={14} className="text-white/60" />
                                        <p className="text-white/80 text-xs font-medium tracking-wide uppercase">Align Boarding Pass</p>
                                    </div>

                                    <button
                                        onClick={captureAndProcess}
                                        disabled={processing}
                                        className={`
                                              group flex items-center gap-3 mx-auto px-6 py-3.5 rounded-2xl transition-all border backdrop-blur-xl
                                              bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100
                                              border-white/10 hover:border-${accentColor}-500/50 hover:shadow-[0_0_30px_${accentColor}/20]
                                          `}
                                    >
                                        <div className={`w-8 h-8 rounded-full bg-${accentColor}-500/20 flex items-center justify-center text-${accentColor}-400 group-hover:scale-110 transition-transform`}>
                                            <Aperture size={18} />
                                        </div>
                                        <span className="text-white font-medium">Capture & Scan</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full p-8 flex flex-col items-center justify-center bg-[#0a0a0a]">
                            <div className={`
                                w-full max-w-md h-64 rounded-3xl relative overflow-hidden transition-all duration-300 group
                                bg-white/5 border-2 border-dashed border-white/20 hover:border-${accentColor}-500/50 hover:shadow-[0_0_40px_${accentColor}/10]
                                flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-white/10
                            `}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={`
                                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                                    bg-${accentColor}-500/10 border border-${accentColor}-500/20 group-hover:scale-110
                                    ${processing ? 'scale-110' : ''}
                                `}>
                                    {processing ? (
                                        <Loader2 size={36} className={`animate-spin text-${accentColor}-400`} />
                                    ) : (
                                        <Upload size={36} className={`text-${accentColor}-400 transition-colors duration-300`} />
                                    )}
                                </div>
                                <div className="text-center space-y-1.5 z-10">
                                    <h4 className="text-white font-semibold text-lg tracking-tight group-hover:text-white transition-colors">Upload Boarding Pass</h4>
                                    <p className="text-zinc-500 text-sm group-hover:text-zinc-400 transition-colors">Drag & drop or click to browse</p>
                                </div>

                                {/* Hover Glow Effect */}
                                <div className={`absolute inset-0 bg-gradient-to-t from-${accentColor}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            <div className="mt-8 flex items-center gap-6 text-zinc-600">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                                    <Scan size={14} /> PDF417
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                                    <Scan size={14} /> QR Code
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                                    <Aperture size={14} /> OCR
                                </div>
                            </div>
                        </div>
                    )}

                    <div id={readerId + "-hidden"} className="hidden"></div>
                </div>
            </div >

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div >,
        document.body
    );
}
