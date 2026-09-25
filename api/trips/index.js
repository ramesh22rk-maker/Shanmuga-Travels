// api/trips/index.js
// GET /api/trips  — fetch all trips (with optional ?date= ?month= ?search=)
// POST /api/trips — create a new trip

const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET all trips ──
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=2, stale-while-revalidate=59');
      let trips = await redis.get(TRIPS_KEY);
      if (!trips) trips = [];

      const { date, month, search } = req.query;

      if (date) {
        trips = trips.filter(t => t.date === date);
      } else if (month) {
        trips = trips.filter(t => t.date && t.date.startsWith(month));
      }

      if (search) {
        const q = search.toLowerCase().trim();
        trips = trips.filter(t =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.fromPlace && t.fromPlace.toLowerCase().includes(q)) ||
          (t.toPlace && t.toPlace.toLowerCase().includes(q))
        );
      }

      trips.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.status(200).json(trips);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST create trip ──
  if (req.method === 'POST') {
    try {
      const trip = req.body;
      if (!trip || !trip.fromPlace || !trip.toPlace) {
        return res.status(400).json({ error: 'fromPlace and toPlace are required' });
      }

      if (!trip.id) {
        trip.id = `TRP-${Math.floor(100 + Math.random() * 900)}`;
      }
      trip.created_at = new Date().toISOString();

      let trips = await redis.get(TRIPS_KEY);
      if (!trips) trips = [];

      // Remove if same ID exists
      trips = trips.filter(t => t.id !== trip.id);
      trips.unshift(trip);

      await redis.set(TRIPS_KEY, trips);
      return res.status(201).json(trip);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
