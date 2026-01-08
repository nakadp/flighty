import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getThemeHex } from '../utils/theme';

// --- HELPER FUNCTIONS ---

const createGlowingIcon = (colorHex) => {
    // Increased size for 4K
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-6 h-6 rounded-full border-4 border-white relative" style="background-color: ${colorHex}; box-shadow: 0 0 20px ${colorHex};"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const createArrowIcon = (arrowAngle, colorHex) => {
    return L.divIcon({
        className: 'arrow-icon',
        html: `<div style="transform: rotate(${arrowAngle}deg); color: ${colorHex}; transform-origin: center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
};

function toRad(degrees) { return degrees * Math.PI / 180; }
function toDeg(radians) { return radians * 180 / Math.PI; }

function getIntermediatePoint(lat1, lng1, lat2, lng2, f) {
    const phi1 = toRad(lat1); const lam1 = toRad(lng1);
    const phi2 = toRad(lat2); const lam2 = toRad(lng2);
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((phi1 - phi2) / 2), 2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin((lam1 - lam2) / 2), 2)));
    if (d === 0) return [lat1, lng1];
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
    const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    const phi3 = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lam3 = Math.atan2(y, x);
    return [toDeg(phi3), toDeg(lam3)];
}

function getBearing(startLat, startLng, endLat, endLng) {
    const startLatRad = toRad(startLat);
    const startLngRad = toRad(startLng);
    const endLatRad = toRad(endLat);
    const endLngRad = toRad(endLng);
    const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
    const x = Math.cos(startLatRad) * Math.sin(endLatRad) - Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// --- SUB-COMPONENTS ---

const AutoFitBounds = ({ flights }) => {
    const map = useMap();

    useEffect(() => {
        if (!flights || flights.length === 0) return;

        const bounds = L.latLngBounds([]);
        flights.forEach(f => {
            if (Number.isFinite(f.depLat) && Number.isFinite(f.depLng)) bounds.extend([f.depLat, f.depLng]);
            if (Number.isFinite(f.arrLat) && Number.isFinite(f.arrLng)) bounds.extend([f.arrLat, f.arrLng]);
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [100, 100], animate: false });
        }
    }, [flights, map]);

    return null;
};

const MapReadySignal = ({ onReady }) => {
    const map = useMap(); // Ensures we are inside the map context
    useEffect(() => {
        if (map) {
            // Signal ready after a short delay for tiles to render
            // Increased to 3s for mobile networks
            const timer = setTimeout(() => {
                onReady && onReady();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [map, onReady]);
    return null;
};

export default function StaticMap({ flights = [], accentColor = 'cyan', onReady }) {
    const accentHex = getThemeHex(accentColor, 400);

    const validFlights = useMemo(() => {
        return flights.filter(f =>
            Number.isFinite(f.depLat) && Number.isFinite(f.depLng) &&
            Number.isFinite(f.arrLat) && Number.isFinite(f.arrLng)
        );
    }, [flights]);

    const uniqueAirports = useMemo(() => {
        const airports = new Map();
        validFlights.forEach(f => {
            if (!airports.has(f.depCode)) airports.set(f.depCode, { lat: f.depLat, lng: f.depLng, code: f.depCode });
            if (!airports.has(f.arrCode)) airports.set(f.arrCode, { lat: f.arrLat, lng: f.arrLng, code: f.arrCode });
        });
        return Array.from(airports.values());
    }, [validFlights]);

    // Create Icon for this render
    const glowingIcon = useMemo(() => createGlowingIcon(accentHex), [accentHex]);

    const flightPaths = useMemo(() => {
        const routeCounts = {};
        return validFlights.map((flight, idx) => {
            const routeKey = `${flight.depCode}-${flight.arrCode}`;
            if (!routeCounts[routeKey]) routeCounts[routeKey] = 0;
            const index = routeCounts[routeKey]++;

            const dLat = flight.arrLat - flight.depLat;
            let dLng = flight.arrLng - flight.depLng;
            if (dLng > 180) dLng -= 360;
            if (dLng < -180) dLng += 360;
            const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1.0;
            const effectiveLen = Math.min(len, 60);

            const nLat = -(dLng / len);
            const nLng = (dLat / len);

            const curvatureFactor = 0.1 + (index * 0.03);

            const path = [];
            const numPoints = 120;

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = getIntermediatePoint(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng, t);
                if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
                    const parabola = 4 * t * (1 - t);
                    const offsetMag = effectiveLen * curvatureFactor * parabola;
                    point[0] += offsetMag * nLat;
                    point[1] += offsetMag * nLng;
                    path.push(point);
                }
            }

            if (path.length < 2) return null;
            const midIndex = Math.floor(path.length / 2);
            const midPoint = path[midIndex];
            const nextPoint = path[midIndex + 5] || path[path.length - 1];
            const angle = getBearing(midPoint[0], midPoint[1], nextPoint[0], nextPoint[1]);

            return {
                id: flight.id || idx,
                positions: path,
                arrowPos: midPoint,
                arrowAngle: Number.isFinite(angle) ? angle - 90 : 0
            };
        }).filter(Boolean);
    }, [validFlights]);

    return (
        <MapContainer
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            style={{ width: '100%', height: '100%', background: '#020617' }}
            center={[30, 0]}
            zoom={2}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                className="map-tiles-filter"
                noWrap={false}
            />

            <AutoFitBounds flights={validFlights} />
            <MapReadySignal onReady={onReady} />

            {flightPaths.map(p => (
                <React.Fragment key={p.id}>
                    <Polyline
                        positions={p.positions}
                        pathOptions={{
                            color: accentHex,
                            weight: 4,
                            opacity: 0.9,
                            lineCap: 'round',
                            className: 'flight-path-glow'
                        }}
                    />
                    <Marker position={p.arrowPos} icon={createArrowIcon(p.arrowAngle, accentHex)} />
                </React.Fragment>
            ))}

            {uniqueAirports.map(airport => (
                <Marker key={airport.code} position={[airport.lat, airport.lng]} icon={glowingIcon} />
            ))}
        </MapContainer>
    );
}
