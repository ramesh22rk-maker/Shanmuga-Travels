// api/health.js
// GET /api/health — checks Supabase PostgreSQL connection

const { getSupabaseClient } = require('./supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      status: 'CONFIG_MISSING',
      message: 'SUPABASE_URL or SUPABASE_ANON_KEY is not configured in environment variables.',
      db: 'Not Configured ⚠️'
    });
  }

  try {
    const { count, error } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Failed to query Supabase trips table.',
        error: error.message,
        db: 'Error ❌'
      });
    }

    return res.status(200).json({
      status: 'OK',
      message: 'Shanmuga Travels API running on Vercel + Supabase PostgreSQL',
      db: 'Connected ✅',
      tripCount: count !== null ? count : 'N/A'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'ERROR',
      error: err.message,
      db: 'Error ❌'
    });
  }
};
