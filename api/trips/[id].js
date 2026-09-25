// api/trips/[id].js
// GET /api/trips/:id    — get one trip
// PUT /api/trips/:id    — update / complete a trip
// DELETE /api/trips/:id — delete a trip

const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Trip ID required' });

  let trips = await redis.get(TRIPS_KEY);
  if (!trips) trips = [];

  // ── GET one trip ──
  if (req.method === 'GET') {
    const trip = trips.find(t => t.id === id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    return res.status(200).json(trip);
  }

  // ── PUT update trip ──
  if (req.method === 'PUT') {
    const idx = trips.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });

    trips[idx] = { ...trips[idx], ...req.body };
    await redis.set(TRIPS_KEY, trips);
    return res.status(200).json(trips[idx]);
  }

  // ── DELETE trip ──
  if (req.method === 'DELETE') {
    const before = trips.length;
    trips = trips.filter(t => t.id !== id);
    if (trips.length === before) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    await redis.set(TRIPS_KEY, trips);
    return res.status(200).json({ message: 'Trip deleted', id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
