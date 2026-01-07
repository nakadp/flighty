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
            const count = routeCounts[routeKey];
            routeCounts[routeKey]++;

            // REVERT LOGIC:
            // User requested "Refer to the version before adding reverse direction arc".
            // That means we remove the "isWestbound" check or at least its influence on curve DIRECTION.
            // But we keep the "count" offset for stacking duplicates.

            // "Before Version" likely had just a minimal curve upward or standard geodesic.
            // Let's use a standard upward curve (or side curve) for ALL flights, 
            // but just offset by count.

            // Actually, if we remove the "CurveFactor", we get a standard geodesic?
            // `getIntermediatePoint` calculates a Great Circle (Geodesic).
            // A Great Circle IS the shortest path.
            // If we just use `getIntermediatePoint` without `latOffset`, we get the perfect straight line (on 3D sphere) which looks curved on Mercator.
            // The user wants "convexity too big" -> "make it smaller".

            // Let's bring back a TINY amount of manual offset just for the "Arc" look the user seems to like (SkyTrace style),
            // but keep it consistent.

            // Direction: West/East logic might still be good if subtle. 
            // User: "Convex angle too big... reference previous version".
            // Previous version likely used one fixed curve direction or none. 
            // I will set Amplitude to 0.5 (Extremely subtle) and reduce stacking to 0.1.

            let lngDiff = flight.arrLng - flight.depLng;
            if (lngDiff > 180) lngDiff -= 360;
            if (lngDiff < -180) lngDiff += 360;
            const isWestbound = lngDiff < 0;
            const curveFactor = isWestbound ? 1 : 1; // Forced SAME direction if they hated the reverse logic? Or -1?
            // Wait, "before adding return reverse direction protrusion" means it was UNIDIRECTIONAL (always Up or always Down).
            // So `curveFactor` should be constant (e.g. 1).

            const path = [];
            const numPoints = 80;
            for (let i = 0; i <= numPoints; i++) {
                const point = getIntermediatePoint(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng, i / numPoints);

                const t = i / numPoints;
                const parabola = 4 * t * (1 - t);

                // AMPLITUDE: Reduced to 0.2 (Very very subtle).
                // OFFSET: 0.2 * count
                // DIRECTION: Fixed (Always +1) so it looks uniform like typical flight maps.
                const latOffset = (0.5 + (count * 0.2)) * parabola * 1;

                point[0] += latOffset;
                path.push(point);
            }

            const midIndex = Math.floor(path.length / 2);
            const midPoint = path[midIndex];
            const nextPoint = path[midIndex + 5] || path[path.length - 1];
            const angle = getBearing(midPoint[0], midPoint[1], nextPoint[0], nextPoint[1]);

            return {
                id: flight.id || idx,
                positions: path,
                arrowPos: midPoint,
                arrowAngle: angle - 90
            };
        });
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
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
            >
                <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    className="map-tiles-filter"
                    noWrap={true}
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
