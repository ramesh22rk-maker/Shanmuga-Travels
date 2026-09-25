// api/trips/index.js
// Vercel Serverless Function: GET all trips / POST new trip
// Uses Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN from Vercel env)

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TRIPS_KEY = 'shanmuga_travels_trips';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/trips ── Fetch all trips (with optional filters)
  if (req.method === 'GET') {
    try {
      let trips = await redis.get(TRIPS_KEY) || [];

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

      // Sort newest first
      trips.sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.status(200).json(trips);
    } catch (err) {
      console.error('GET /api/trips error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/trips ── Create a new trip
  if (req.method === 'POST') {
    try {
      const trip = req.body;
      if (!trip || !trip.fromPlace || !trip.toPlace) {
        return res.status(400).json({ error: 'fromPlace and toPlace are required' });
      }

      // Ensure unique ID
      if (!trip.id) {
        trip.id = `TRP-${Math.floor(100 + Math.random() * 900)}`;
      }
      trip.created_at = new Date().toISOString();

      let trips = await redis.get(TRIPS_KEY) || [];
      // Avoid duplicate IDs
      trips = trips.filter(t => t.id !== trip.id);
      trips.unshift(trip);

      await redis.set(TRIPS_KEY, trips);

      return res.status(201).json(trip);
    } catch (err) {
      console.error('POST /api/trips error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
