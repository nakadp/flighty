/**
 * Generates mock flight price data for the analysis chart.
 * 
 * @param {string} duration - The selected trip duration (e.g., "5 Days")
 * @param {string} platform - The selected platform (e.g., "Aggregate All")
 * @returns {Array} - Array of data points for the chart
 */
export const generateMockAnalysisData = (duration, platform = 'Aggregate All') => {
    const data = [];
    const today = new Date();

    // Base price fluctuates based on duration
    const durationNum = parseInt(duration) || 5;
    const basePrice = 3000 + (durationNum * 200);

    // Generate 30 days of future data
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // Format date as MM/DD
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        // Intro some randomness and trends
        // Weekends (Fri/Sat/Sun) are more expensive
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.2 : 1.0;

        // Random volatility
        const volatility = Math.random() * 0.2 + 0.9; // 0.9 to 1.1

        let cheapest = Math.round(basePrice * weekendMultiplier * volatility);
        let shortest = Math.round(cheapest * 1.5 + (Math.random() * 500));
        let recommended = Math.round(cheapest * 1.2 + (Math.random() * 300));

        // Platform adjustments
        if (platform === 'Trip.com') {
            cheapest -= 100;
            recommended -= 50;
        } else if (platform === 'Expedia') {
            cheapest += 50;
            shortest -= 100;
        }

        data.push({
            date: dateStr,
            cheapest,
            shortest,
            recommended: Math.min(recommended, shortest), // Recommended shouldn't be more than shortest usually? Or maybe simple logic.
            platform
        });
    }

    return data;
};
