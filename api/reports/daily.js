// api/reports/daily.js
// GET /api/reports/daily?date=YYYY-MM-DD

const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    let allTrips = await redis.get(TRIPS_KEY);
    if (!allTrips) allTrips = [];

    const trips = allTrips.filter(t => t.date === targetDate);

    const totalCharged  = trips.reduce((s, t) => s + parseFloat(t.costCustomer || 0), 0);
    const totalFuel     = trips.reduce((s, t) => s + parseFloat(t.fuelExpense || 0), 0);
    const totalTolls    = trips.reduce((s, t) => s + parseFloat(t.tollExpense || 0), 0);
    const totalOther    = trips.reduce((s, t) => s + parseFloat(t.otherExpense || 0), 0);
    const totalExpenses = totalFuel + totalTolls + totalOther;
    const totalKm       = trips.reduce((s, t) => s + parseFloat(t.distanceKm || 0), 0);
    const netProfit     = totalCharged - totalExpenses;

    return res.status(200).json({
      date: targetDate,
      tripCount: trips.length,
      totalCharged,
      totalFuel,
      totalTolls,
      totalOther,
      totalExpenses,
      totalKm,
      netProfit,
      trips
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
