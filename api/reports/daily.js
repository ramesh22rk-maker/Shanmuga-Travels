// api/reports/daily.js
// Vercel Serverless Function: GET /api/reports/daily?date=YYYY-MM-DD
// Returns aggregated financial summary and trip list for a specific day

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const allTrips = await redis.get(TRIPS_KEY) || [];

    const trips = allTrips
      .filter(t => t.date === targetDate)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const totalCharged = trips.reduce((s, t) => s + parseFloat(t.costCustomer || 0), 0);
    const totalFuel    = trips.reduce((s, t) => s + parseFloat(t.fuelExpense || 0), 0);
    const totalTolls   = trips.reduce((s, t) => s + parseFloat(t.tollExpense || 0), 0);
    const totalOther   = trips.reduce((s, t) => s + parseFloat(t.otherExpense || 0), 0);
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
    console.error('GET /api/reports/daily error:', err);
    return res.status(500).json({ error: err.message });
  }
}
