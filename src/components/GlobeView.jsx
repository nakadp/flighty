import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { Layers, Play, Pause } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { CITIES } from '../data/cities';
import * as THREE from 'three';
import throttle from 'lodash.throttle';

export default function GlobeView({ flights = [], width, height, onFlightClick }) {
    const globeEl = useRef();
    const [countries, setCountries] = useState({ features: [] });
    const [altitude, setAltitude] = useState(2.5);
    const [hoverArc, setHoverArc] = useState(null);
    const [globeMode, setGlobeMode] = useState('satellite');
    const [isRotating, setIsRotating] = useState(false);

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

    useEffect(() => {
        // RESOLUTION STRATEGY:
        // Try 50m (Medium). Fallback to 110m (Low).
        const loadBorders = async () => {
            const url50m = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
            const url110m = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

            try {
                const res = await fetch(url50m);
                if (!res.ok) throw new Error("50m Fetch Failed");
                const data = await res.json();
                setCountries(data);
                console.log("Loaded 50m Borders");
            } catch (e) {
                console.warn("Falling back to 110m borders due to:", e);
                try {
                    const resFallback = await fetch(url110m);
                    const dataFallback = await resFallback.json();
                    setCountries(dataFallback);
                } catch (e2) {
                    console.error("Critical: All border sources failed.", e2);
                }
            }
        };

        loadBorders();
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
                color: ['#f59e0b', '#22d3ee'],
                alt: 0.25 + altitudeOffset,
            };
        });
    }, [flights]);

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
                globeImageUrl={globeMode === 'satellite'
                    ? "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                    : null
                }
                bumpImageUrl={globeMode === 'satellite'
                    ? "https://unpkg.com/three-globe/example/img/earth-topology.png"
                    : null
                }
                backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

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
                        ? 'rgba(6, 182, 212, 0.8)'
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

                atmosphereColor="#3b82f6"
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
