// api/trips/[id].js
// Vercel Serverless Function: GET one trip / PUT update trip / DELETE trip

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Trip ID is required' });

  let trips = await redis.get(TRIPS_KEY) || [];

  // ── GET /api/trips/:id ── Fetch single trip
  if (req.method === 'GET') {
    const trip = trips.find(t => t.id === id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    return res.status(200).json(trip);
  }

  // ── PUT /api/trips/:id ── Update / complete a trip
  if (req.method === 'PUT') {
    const idx = trips.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });

    const updates = req.body;
    trips[idx] = { ...trips[idx], ...updates };

    await redis.set(TRIPS_KEY, trips);
    return res.status(200).json(trips[idx]);
  }

  // ── DELETE /api/trips/:id ── Delete a trip
  if (req.method === 'DELETE') {
    const originalLen = trips.length;
    trips = trips.filter(t => t.id !== id);

    if (trips.length === originalLen) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    await redis.set(TRIPS_KEY, trips);
    return res.status(200).json({ message: 'Trip deleted successfully', id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
