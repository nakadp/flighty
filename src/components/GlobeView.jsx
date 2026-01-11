import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { Layers, Play, Pause } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { CITIES } from '../data/cities';
import * as THREE from 'three';
import throttle from 'lodash.throttle';
import { getThemeHex } from '../utils/theme';
import { getCachedUrl } from '../utils/cacheUtils';

export default function GlobeView({ flights = [], width, height, onFlightClick, accentColor = 'cyan' }) {
    const globeEl = useRef();
    const [countries, setCountries] = useState({ features: [] });
    const [altitude, setAltitude] = useState(2.5);
    const [hoverArc, setHoverArc] = useState(null);
    const [globeMode, setGlobeMode] = useState('satellite');
    const [isRotating, setIsRotating] = useState(false);

    // Asset State
    const [textures, setTextures] = useState({
        globe: null,
        bump: null,
        background: null
    });

    // Get hex for accent color
    const accentHex = getThemeHex(accentColor, 400); // Brighter key color for paths

    useEffect(() => {
        if (globeEl.current) {
            const controls = globeEl.current.controls();
            controls.autoRotate = isRotating;
            controls.autoRotateSpeed = 0.5;
        }
    }, [isRotating]);

    useEffect(() => {
        if (globeEl.current) {
            const controls = globeEl.current.controls();
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;

            const updateAlt = throttle(() => {
                if (globeEl.current) {
                    const newAlt = globeEl.current.pointOfView().altitude;
                    if (Math.abs(newAlt - altitude) > 0.05) {
                        setAltitude(newAlt);
                    }
                }
            }, 500);

            controls.addEventListener('change', updateAlt);

            const onInteract = () => setIsRotating(false);
            controls.addEventListener('start', onInteract);

            return () => {
                controls.removeEventListener('change', updateAlt);
                controls.removeEventListener('start', onInteract);
                updateAlt.cancel();
            }
        }
    }, [altitude]);

    // Load Assets (Textures & Borders)
    useEffect(() => {
        const loadAssets = async () => {
            // Textures
            const globeUrl = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
            const bumpUrl = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
            const bgUrl = 'https://unpkg.com/three-globe/example/img/night-sky.png';

            // Borders
            const borderUrl50m = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
            const borderUrl110m = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

            try {
                // Load Textures
                const [globeBlob, bumpBlob, bgBlob] = await Promise.all([
                    getCachedUrl(globeUrl),
                    getCachedUrl(bumpUrl),
                    getCachedUrl(bgUrl)
                ]);

                setTextures({
                    globe: globeBlob,
                    bump: bumpBlob,
                    background: bgBlob
                });

                // Load Borders
                // Try 50m first
                let borderData = null;
                try {
                    const borderBlobUrl = await getCachedUrl(borderUrl50m);
                    const res = await fetch(borderBlobUrl);
                    if (!res.ok) throw new Error("50m Fetch Failed");
                    borderData = await res.json();
                    console.log("Loaded 50m Borders (Cached)");
                } catch (e) {
                    console.warn("Falling back to 110m borders:", e);
                    try {
                        const borderBlobUrl = await getCachedUrl(borderUrl110m);
                        const res = await fetch(borderBlobUrl);
                        borderData = await res.json();
                    } catch (e2) {
                        console.error("Critical: All border sources failed.", e2);
                    }
                }

                if (borderData) {
                    setCountries(borderData);
                }

            } catch (err) {
                console.error("Failed to load assets:", err);
            }
        };

        loadAssets();
    }, []);

    const processedFlights = useMemo(() => {
        const routeCounts = {};

        return flights.map((f) => {
            const routeKey = `${f.depCode}-${f.arrCode}`;
            if (!routeCounts[routeKey]) routeCounts[routeKey] = 0;
            const index = routeCounts[routeKey]++;

            // Base altitude is 0.25 (User default)
            // Increment by 0.05 for each subsequent flight on the same route
            // This creates a vertical stack of arcs
            const altitudeOffset = index * 0.05;

            return {
                ...f,
                startLat: f.depLat,
                startLng: f.depLng,
                endLat: f.arrLat,
                endLng: f.arrLng,
                color: ['#f59e0b', accentHex], // Start Orange, End Accent
                alt: 0.25 + altitudeOffset,
            };
        });
    }, [flights, accentHex]);

    const isZoomedIn = altitude < 1.5;
    const visibleCountries = useMemo(() => countries.features || [], [countries]);

    const labels = useMemo(() => {
        if (isZoomedIn) {
            const k = 0.35;
            return [
                ...CITIES.map(c => ({
                    lat: c.lat, lng: c.lng, label: c.name,
                    size: Math.max(k * altitude, 0.05),
                    type: 'city'
                })),
                ...flights.map(f => ({
                    lat: f.depLat, lng: f.depLng, label: f.depCode,
                    size: Math.max((k - 0.1) * altitude, 0.05),
                    type: 'airport'
                }))
            ];
        } else {
            return COUNTRIES.map(c => ({
                ...c,
                size: 0.5 * altitude,
                type: 'country'
            }));
        }
    }, [isZoomedIn, flights, altitude]);

    return (
        <div className="w-full h-full relative bg-black">
            <Globe
                ref={globeEl}
                width={width}
                height={height}

                // Textures
                globeImageUrl={globeMode === 'satellite' ? textures.globe : null}
                bumpImageUrl={globeMode === 'satellite' ? textures.bump : null}
                backgroundImageUrl={textures.background}

                // Abstract Mode
                backgroundColor="#000000"
                globeMaterial={globeMode === 'abstract'
                    ? new THREE.MeshPhongMaterial({ color: '#111827', shininess: 20 })
                    : undefined
                }

                // BORDERS
                polygonsData={visibleCountries}
                polygonsTransitionDuration={0}
                polygonCapColor={() => 'rgba(0,0,0,0)'}
                polygonSideColor={() => 'rgba(0,0,0,0)'}
                polygonStrokeColor={() => {
                    return globeMode === 'abstract'
                        ? `${accentHex}CC` // Add opacity to hex
                        : 'rgba(255, 255, 255, 0.6)';
                }}

                // PARALLAX FIX: Reduced from 0.015 to 0.008.
                // This brings borders ~50% closer to the surface, significantly reducing floating drift.
                // It is still > 0.005 which usually avoids z-fighting.
                polygonAltitude={0.008}

                // Arcs
                arcsData={processedFlights}
                arcColor="color"
                arcStroke={(d) => hoverArc === d ? 1.0 : 0.5}
                arcAltitude={(d) => d.alt}
                onArcClick={(flight) => { if (onFlightClick) onFlightClick(flight); }}
                onArcHover={setHoverArc}
                arcDashLength={0.5}
                arcDashGap={2}
                arcDashAnimateTime={3000}

                // Labels
                labelsData={labels}
                labelLat="lat"
                labelLng="lng"
                labelText="label"
                labelSize="size"
                labelDotRadius={(d) => d.type === 'country' ? 0 : 0.15 * altitude}
                labelColor={() => "rgba(255, 255, 255, 0.9)"}
                labelResolution={2}
                labelAltitude={0.015} // Adjusted to sit just above new border height
                labelTransitionDuration={0}

                atmosphereColor={accentHex}
                atmosphereAltitude={0.15}
            />

            {/* CONTROLS */}
            <div className="absolute top-36 md:top-20 right-6 z-40 flex flex-col gap-2 pointer-events-auto">
                <button
                    onClick={() => setGlobeMode(m => m === 'satellite' ? 'abstract' : 'satellite')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 transition-all shadow-xl w-full justify-center"
                >
                    <Layers size={14} />
                    {globeMode === 'satellite' ? 'SAT' : 'ABS'}
                </button>

                <button
                    onClick={() => setIsRotating(!isRotating)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 transition-all shadow-xl w-full justify-center"
                >
                    {isRotating ? <Pause size={14} /> : <Play size={14} />}
                    {isRotating ? 'PAUSE' : 'PLAY'}
                </button>
            </div>
        </div>
    );
}
