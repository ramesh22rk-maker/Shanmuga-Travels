// api/health.js
// Vercel Serverless Function: GET /api/health
// Simple health check endpoint

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    await redis.set('health_check', 'ok');
    const val = await redis.get('health_check');
    return res.status(200).json({
      status: 'OK',
      message: 'Shanmuga Travels API is running on Vercel + Upstash Redis',
      db: val === 'ok' ? 'Connected' : 'Error'
    });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: err.message });
  }
}
