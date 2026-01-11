/**
 * Generates mock flight price data for the analysis chart.
 * Returns rich objects for interaction details.
 */
export const generateMockAnalysisData = (duration, platform = 'Aggregate All') => {
    const data = [];
    const today = new Date();

    const airlines = [
        { name: "Air China", code: "CA" },
        { name: "China Eastern", code: "MU" },
        { name: "China Southern", code: "CZ" },
        { name: "British Airways", code: "BA" },
        { name: "Virgin Atlantic", code: "VS" },
        { name: "Emirates", code: "EK" },
        { name: "Cathay Pacific", code: "CX" },
        { name: "Singapore Airlines", code: "SQ" }
    ];

    const airports = ["PEK", "LHR", "PVG", "JFK", "LAX", "DXB", "SIN", "HND"];

    // Base price fluctuates based on duration
    const durationNum = parseInt(duration) || 5;
    const basePrice = 3000 + (durationNum * 200);

    // Helper to generate a rich flight object
    const createFlight = (base, type, dateStr) => {
        const volatility = Math.random() * 0.2 + 0.9;
        const price = Math.round(base * volatility);

        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNo = `${airline.code}${Math.floor(Math.random() * 900) + 100}`;
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.random() > 0.5 ? "00" : "30";
        const departureTime = `${hour.toString().padStart(2, '0')}:${minute}`;

        // Calculate arrival (random duration 2h - 14h)
        const flightDurationMins = 120 + Math.floor(Math.random() * 720);
        const arrivalDateObj = new Date(new Date().setHours(hour, parseInt(minute)) + flightDurationMins * 60000);
        const arrivalTime = `${arrivalDateObj.getHours().toString().padStart(2, '0')}:${arrivalDateObj.getMinutes().toString().padStart(2, '0')}`;
        const durationStr = `${Math.floor(flightDurationMins / 60)}h ${flightDurationMins % 60}m`;

        const stops = Math.random() > 0.7 ? 1 : 0;

        return {
            price,
            airline: airline.name,
            flightNo,
            departureTime,
            arrivalTime,
            duration: durationStr,
            stops,
            baggage: "2x 23kg",
            aircraft: Math.random() > 0.5 ? "Boeing 787" : "Airbus A350",
            link: "#",
            type // 'cheapest', 'shortest', 'recommended'
        };
    };

    // Generate 30 days of future data
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // Format date as MM/DD
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        // Weekends (Fri/Sat/Sun) are more expensive
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.2 : 1.0;

        let dailyBase = basePrice * weekendMultiplier;

        // Platform adjustments
        if (platform === 'Trip.com') dailyBase -= 100;
        if (platform === 'Expedia') dailyBase += 50;

        // Generate the three categories
        const cheapestObj = createFlight(dailyBase, 'cheapest', dateStr);

        // Shortest is usually more expensive
        const shortestObj = createFlight(dailyBase * 1.5, 'shortest', dateStr);
        // Make sure it looks faster (fake it by just being more expensive essentially in this mock)

        // Recommended is balanced
        const recommendedObj = createFlight(dailyBase * 1.2, 'recommended', dateStr);
        // Sometimes recommended is cheapest
        if (Math.random() > 0.7) {
            recommendedObj.price = cheapestObj.price;
        }

        data.push({
            date: dateStr,
            cheapest: cheapestObj,
            shortest: shortestObj,
            recommended: recommendedObj,
            platform
        });
    }

    return data;
};
