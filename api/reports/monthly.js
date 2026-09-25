// api/reports/monthly.js
// Vercel Serverless Function: GET /api/reports/monthly?month=YYYY-MM
// Returns aggregated financial summary and trip list for a specific month

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
    const now = new Date();
    const targetMonth = req.query.month ||
      `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const allTrips = await redis.get(TRIPS_KEY) || [];

    const trips = allTrips
      .filter(t => t.date && t.date.startsWith(targetMonth))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalCharged  = trips.reduce((s, t) => s + parseFloat(t.costCustomer || 0), 0);
    const totalFuel     = trips.reduce((s, t) => s + parseFloat(t.fuelExpense || 0), 0);
    const totalTolls    = trips.reduce((s, t) => s + parseFloat(t.tollExpense || 0), 0);
    const totalOther    = trips.reduce((s, t) => s + parseFloat(t.otherExpense || 0), 0);
    const totalExpenses = totalFuel + totalTolls + totalOther;
    const totalKm       = trips.reduce((s, t) => s + parseFloat(t.distanceKm || 0), 0);
    const netProfit     = totalCharged - totalExpenses;

    return res.status(200).json({
      month: targetMonth,
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
    console.error('GET /api/reports/monthly error:', err);
    return res.status(500).json({ error: err.message });
  }
}
