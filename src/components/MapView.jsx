import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createGlowingIcon = () => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] border-2 border-white relative"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

const GlowingIcon = createGlowingIcon();

const createArrowIcon = (arrowAngle) => {
    return L.divIcon({
        className: 'arrow-icon',
        html: `<div style="transform: rotate(${arrowAngle}deg); color: #22d3ee;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
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

export default function MapView({ flights = [], onFlightClick }) {

    // Filter out invalid flights once
    const validFlights = useMemo(() => {
        return flights.filter(f =>
            Number.isFinite(f.depLat) && Number.isFinite(f.depLng) &&
            Number.isFinite(f.arrLat) && Number.isFinite(f.arrLng)
        );
    }, [flights]);

    // Deduplicate Airports for clean markers
    const uniqueAirports = useMemo(() => {
        const airports = new Map();
        validFlights.forEach(f => {
            if (!airports.has(f.depCode)) airports.set(f.depCode, { lat: f.depLat, lng: f.depLng, code: f.depCode });
            if (!airports.has(f.arrCode)) airports.set(f.arrCode, { lat: f.arrLat, lng: f.arrLng, code: f.arrCode });
        });
        return Array.from(airports.values());
    }, [validFlights]);

    const flightPaths = useMemo(() => {
        const routeCounts = {};

        return validFlights.map((flight, idx) => {
            const routeKey = `${flight.depCode}-${flight.arrCode}`;
            if (!routeCounts[routeKey]) routeCounts[routeKey] = 0;
            const index = routeCounts[routeKey]++;

            // Curvature Logic: "Keep Right"
            // Always offset positively along the Right-Hand Normal vector to ensure loop separation.

            const dLat = flight.arrLat - flight.depLat;
            let dLng = flight.arrLng - flight.depLng;

            // Basic wrap-around
            if (dLng > 180) dLng -= 360;
            if (dLng < -180) dLng += 360;

            // Calculate length (magnitude)
            const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1.0;

            // DAMPING:
            // For very long flights, linear scaling (len * factor) produces huge arcs.
            // We cap the "effective length" to prevent the arc from going off-map or looking ridiculous.
            // Spain-China (~80 deg) is "Okay". Longer (~120 deg) is "Too Big".
            // Let's cap effective len at ~60-70 degrees.
            const effectiveLen = Math.min(len, 60);

            // Unit Normal Vector [-y, x] (Right Hand Rule relative to movement)
            const nLat = -(dLng / len);
            const nLng = (dLat / len);

            // Stacking Factor - TUNED:
            // User requested "slight curvature" foundation with small offsets.
            // Reduced Base to 0.1 (from 0.2)
            // Reduced Step to 0.03 (from 0.05) to keep bundle tight.
            const curvatureFactor = 0.1 + (index * 0.03);

            const path = [];
            const numPoints = 80;

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = getIntermediatePoint(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng, t);

                // Add safety check for NaN points
                if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
                    const parabola = 4 * t * (1 - t);
                    // Use effectiveLen to clamp the max curvature size for very long flights
                    const offsetMag = effectiveLen * curvatureFactor * parabola;

                    point[0] += offsetMag * nLat;
                    point[1] += offsetMag * nLng;

                    path.push(point);
                }
            }

            // Ensure valid path
            if (path.length < 2) return null;

            const midIndex = Math.floor(path.length / 2);
            const midPoint = path[midIndex];
            const nextPoint = path[midIndex + 5] || path[path.length - 1];

            // Calculate angle safely
            const angle = getBearing(midPoint[0], midPoint[1], nextPoint[0], nextPoint[1]);

            return {
                id: flight.id || idx,
                positions: path,
                arrowPos: midPoint,
                arrowAngle: Number.isFinite(angle) ? angle - 90 : 0
            };
        }).filter(Boolean); // Filter out nulls
    }, [validFlights]);

    return (
        <div className="w-full h-full bg-slate-900 border-none relative z-0">
            <MapContainer
                center={[30, 20]} zoom={2.5}
                className="h-full w-full"
                style={{ background: '#020617' }}
                whenCreated={map => map.invalidateSize()}
                zoomControl={false}
                minZoom={2}
                worldCopyJump={true}
                maxBoundsViscosity={1.0}
            >
                <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    className="map-tiles-filter"
                    noWrap={false}
                />

                {flightPaths.map(p => (
                    <React.Fragment key={p.id}>
                        <Polyline
                            positions={p.positions}
                            pathOptions={{
                                color: '#22d3ee',
                                weight: 2,
                                opacity: 0.8,
                                lineCap: 'round',
                                className: 'flight-path-glow cursor-pointer hover:stroke-white' // Added cursor pointer
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e); // Prevent map click?
                                    onFlightClick && onFlightClick(validFlights.find(f => (f.id || idx) === p.id));
                                },
                                mouseover: (e) => {
                                    e.target.setStyle({ weight: 4, color: '#fff' });
                                },
                                mouseout: (e) => {
                                    e.target.setStyle({ weight: 2, color: '#22d3ee' });
                                }
                            }}
                        />
                        <Marker position={p.arrowPos} icon={createArrowIcon(p.arrowAngle)} />
                    </React.Fragment>
                ))}

                {uniqueAirports.map(airport => (
                    <Marker key={airport.code} position={[airport.lat, airport.lng]} icon={GlowingIcon}>
                        <Popup className="glass-popup"><div className="text-xs font-bold">{airport.code}</div></Popup>
                    </Marker>
                ))}

            </MapContainer>
        </div>
    );
}
