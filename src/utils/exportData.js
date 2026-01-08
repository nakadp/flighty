import * as XLSX from 'xlsx';

export const exportToExcel = (user, trips, flights) => {
    try {
        const wb = XLSX.utils.book_new();

        // 1. User Profile Sheet
        // Create user data array
        const userData = [{
            "User ID": user.uid,
            "Display Name": user.displayName || "N/A",
            "Email": user.email || "N/A",
            "Last Login": new Date().toLocaleString()
        }];
        const wsUser = XLSX.utils.json_to_sheet(userData);
        XLSX.utils.book_append_sheet(wb, wsUser, "User Profile");

        // 2. Trips Sheet
        const tripData = trips.map(trip => ({
            "Trip ID": trip.id,
            "Trip Name": trip.name,
            "Start Date": trip.startDate,
            "End Date": trip.endDate,
            "Total Cost": trip.cost,
            "Status": trip.status || "Planned"
        }));
        const wsTrips = XLSX.utils.json_to_sheet(tripData);
        XLSX.utils.book_append_sheet(wb, wsTrips, "Trips");

        // 3. Flights Sheet
        // Improve flight data by adding Trip Name context if available
        const flightData = flights.map(flight => {
            const parentTrip = trips.find(t => t.id === flight.tripId);
            return {
                "Flight ID": flight.id,
                "Trip Name": parentTrip ? parentTrip.name : "Orphan (No Trip)",
                "Date": flight.date,
                "Airline": flight.airline || "",
                "Flight Number": flight.flightNumber || "",
                "Departure Airport": flight.depCode,
                "Arrival Airport": flight.arrCode,
                "Distance (km)": Math.round(flight.distance || 0), // Assuming distance is calculated elsewhere or available
                "Cost": flight.cost || 0,
                "Aircraft": flight.aircraft || "",
                "Notes": flight.notes || ""
            };
        });
        const wsFlights = XLSX.utils.json_to_sheet(flightData);
        XLSX.utils.book_append_sheet(wb, wsFlights, "Flights");

        // Generate Filename
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `SkyTrace_Export_${dateStr}.xlsx`;

        // Write File
        XLSX.writeFile(wb, filename);

        return true;
    } catch (error) {
        console.error("Export Failed:", error);
        throw new Error("Failed to generate Excel file.");
    }
};
