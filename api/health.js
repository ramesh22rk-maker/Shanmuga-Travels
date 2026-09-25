// api/health.js
// GET /api/health — checks Redis connection

const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    await redis.set('health_check', 'ok');
    const val = await redis.get('health_check');
    return res.status(200).json({
      status: 'OK',
      message: 'Shanmuga Travels API running on Vercel + Upstash Redis',
      db: val === 'ok' ? 'Connected ✅' : 'Error ❌'
    });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: err.message });
  }
};
