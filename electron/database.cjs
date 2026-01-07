const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'flights.db');

    // Using better-sqlite3
    db = new Database(dbPath);

    // Create Flights Table (Updated Schema)
    db.exec(`
        CREATE TABLE IF NOT EXISTS flights (
            id TEXT PRIMARY KEY,
            date TEXT,
            flightNumber TEXT,
            depCode TEXT,
            depName TEXT,
            arrCode TEXT,
            arrName TEXT,
            depLat REAL,
            depLng REAL,
            arrLat REAL,
            arrLng REAL,
            duration TEXT,
            distance TEXT,
            aircraft TEXT,
            seat TEXT,
            airline TEXT,
            tailNumber TEXT,
            notes TEXT,
            createdAt INTEGER
        )
    `);

    // Migration: Add columns if running on existing DB (Simple check)
    try {
        db.prepare('SELECT notes FROM flights LIMIT 1').run();
    } catch (e) {
        // Add missing columns if they don't exist
        try { db.exec('ALTER TABLE flights ADD COLUMN notes TEXT'); } catch (e) { }
        try { db.exec('ALTER TABLE flights ADD COLUMN depName TEXT'); } catch (e) { }
        try { db.exec('ALTER TABLE flights ADD COLUMN arrName TEXT'); } catch (e) { }
    }
}

function getFlights() {
    const stmt = db.prepare('SELECT * FROM flights ORDER BY date DESC');
    return stmt.all();
}

// Helper to sanitize flight object and ensure all params exist
function sanitize(flight) {
    return {
        id: flight.id,
        date: flight.date || '',
        flightNumber: flight.flightNumber || '',
        depCode: flight.depCode || '',
        depName: flight.depName || '',
        arrCode: flight.arrCode || '',
        arrName: flight.arrName || '',
        depLat: flight.depLat || 0,
        depLng: flight.depLng || 0,
        arrLat: flight.arrLat || 0,
        arrLng: flight.arrLng || 0,
        duration: flight.duration || '',
        distance: flight.distance || '',
        aircraft: flight.aircraft || '',
        seat: flight.seat || '',
        airline: flight.airline || '',
        tailNumber: flight.tailNumber || '',
        notes: flight.notes || '',
        createdAt: flight.createdAt || Date.now()
    };
}

function addFlight(flight) {
    const data = sanitize(flight);
    const stmt = db.prepare(`
        INSERT INTO flights (id, date, flightNumber, depCode, depName, arrCode, arrName, depLat, depLng, arrLat, arrLng, duration, distance, aircraft, seat, airline, tailNumber, notes, createdAt)
        VALUES (@id, @date, @flightNumber, @depCode, @depName, @arrCode, @arrName, @depLat, @depLng, @arrLat, @arrLng, @duration, @distance, @aircraft, @seat, @airline, @tailNumber, @notes, @createdAt)
    `);
    const info = stmt.run(data);
    return info.changes;
}

function deleteFlight(id) {
    const stmt = db.prepare('DELETE FROM flights WHERE id = ?');
    const info = stmt.run(id);
    return info.changes;
}

function updateFlight(flight) {
    const data = sanitize(flight);
    const stmt = db.prepare(`
        UPDATE flights SET 
            date = @date,
            flightNumber = @flightNumber,
            depCode = @depCode,
            depName = @depName,
            arrCode = @arrCode,
            arrName = @arrName,
            depLat = @depLat,
            depLng = @depLng,
            arrLat = @arrLat,
            arrLng = @arrLng,
            duration = @duration,
            distance = @distance,
            aircraft = @aircraft,
            seat = @seat,
            airline = @airline,
            tailNumber = @tailNumber,
            notes = @notes
        WHERE id = @id
    `);
    const info = stmt.run(data);
    return info.changes;
}

module.exports = {
    initDatabase,
    getFlights,
    addFlight,
    deleteFlight,
    updateFlight
};
