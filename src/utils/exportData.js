import * as XLSX from 'xlsx';

export const exportToExcel = (user, trips, flights) => {
    try {
        const wb = XLSX.utils.book_new();

        // 1. User Header Data
        const userHeader = [
            ["Flight Export"],
            ["User:", user.displayName || "N/A"],
            ["Email:", user.email || "N/A"],
            ["Export Date:", new Date().toLocaleString()],
            ["Total Flights:", flights.length],
            [""] // Spacer
        ];

        // 2. Main Table Data
        const tableHeaders = [
            "Date",
            "Item Name",
            "Type",
            "From",
            "To",
            "Airline",
            "Flight No.",
            "Aircraft",
            "Distance (km)",
            "Cost",
            "Notes"
        ];

        let tableRows = [];

        // Sort Helper
        const sortByDateDesc = (a, b) => new Date(b.date || b.startDate || 0) - new Date(a.date || a.startDate || 0);

        // A. Process Trips
        // Sort trips by startDate descending
        const sortedTrips = [...trips].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

        sortedTrips.forEach(trip => {
            // Find flights for this trip
            const tripFlights = flights.filter(f => f.tripId === trip.id).sort((a, b) => new Date(a.date) - new Date(b.date)); // Flights asc inside trip? or desc? UI uses desc usually. Let's use Ascending for logical flow of a trip (Start -> End).
            // Actually user said "like FlightList form". FlightList default sorts Newest First?
            // "groupedItems" in FlightList groups trips, and sorts grouped items by date descending.
            // Inside a trip, `tripFlights` in FlightList are sorted `a.date - b.date` (Ascending). 
            // So we will use Ascending for flights inside a trip.

            if (tripFlights.length > 0 || trip.cost > 0) { // Include if it has flights OR has data like cost
                // Calculate Trip Totals
                const tripDistance = tripFlights.reduce((acc, f) => acc + (Math.round(f.distance || 0)), 0);

                // 1. TRIP ROW
                tableRows.push([
                    trip.startDate || tripFlights[0]?.date || "", // Date
                    trip.name || "Untitled Trip",                 // Item Name
                    "TRIP",                                       // Type
                    "-",                                          // From
                    "-",                                          // To
                    "-",                                          // Airline
                    "-",                                          // Flight No
                    `${tripFlights.length} Flights`,              // Aircraft (used for count info)
                    tripDistance,                                 // Distance
                    trip.cost || 0,                               // Cost (TRIP COST HERE)
                    trip.status || ""                             // Notes/Status
                ]);

                // 2. FLIGHT ROWS (Indented visually by name logic or just listed below)
                tripFlights.forEach(flight => {
                    tableRows.push([
                        flight.date,
                        "    ↳ " + (flight.depCode && flight.arrCode ? `${flight.depCode}-${flight.arrCode}` : "Flight"), // Indented Name
                        "FLIGHT",
                        flight.depCode,
                        flight.arrCode,
                        flight.airline,
                        flight.flightNumber,
                        flight.aircraft,
                        getDistance(flight),
                        "", // No cost on flight row if it belongs to trip (usually)
                        flight.notes
                    ]);
                });

                // Empty row between trips for readability?
                tableRows.push([]);
            }
        });

        // B. Process Orphan Flights (No Trip)
        const orphanFlights = flights.filter(f => !f.tripId).sort(sortByDateDesc);

        if (orphanFlights.length > 0) {
            tableRows.push(["", "--- Single Flights ---", "", "", "", "", "", "", "", "", ""]);

            orphanFlights.forEach(flight => {
                tableRows.push([
                    flight.date,
                    "Single Flight",
                    "FLIGHT",
                    flight.depCode,
                    flight.arrCode,
                    flight.airline,
                    flight.flightNumber,
                    flight.aircraft,
                    getDistance(flight),
                    flight.cost || 0, // Orphan flights might have their own cost
                    flight.notes
                ]);
            });
        }

        // Combine
        const wsData = [
            ...userHeader,
            tableHeaders,
            ...tableRows
        ];

        // Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Column Widths
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 25 }, // Item Name (Trip Name or Flight)
            { wch: 10 }, // Type
            { wch: 6 },  // From
            { wch: 6 },  // To
            { wch: 15 }, // Airline
            { wch: 10 }, // Flight No
            { wch: 15 }, // Aircraft
            { wch: 10 }, // Dist
            { wch: 10 }, // Cost
            { wch: 30 }  // Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Flight Log");

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `SkyTrace_Export_${dateStr}.xlsx`;

        XLSX.writeFile(wb, filename);

        return true;
    } catch (error) {
        console.error("Export Failed:", error);
        throw new Error("Failed to generate Excel file.");
    }
};

import { calculateDistance } from './calculations';

// Helper for distance if missing in object (though usually expected)
function getDistance(flight) {
    if (flight.distance) return Math.round(flight.distance);
    // Fallback: Calculate if coords exist
    if (flight.depLat && flight.depLng && flight.arrLat && flight.arrLng) {
        return Math.round(calculateDistance(flight.depLat, flight.depLng, flight.arrLat, flight.arrLng));
    }
    return 0;
}
