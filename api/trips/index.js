// api/trips/index.js
// GET /api/trips  — fetch all trips (with optional ?date= ?month= ?search=)
// POST /api/trips — create a new trip in Supabase PostgreSQL

const { getSupabaseClient, normalizeTrip, tripToDb } = require('../supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase credentials missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  // ── GET all trips ──
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=2, stale-while-revalidate=59');
      const { date, month, search } = req.query;

      let query = supabase
        .from('trips')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      } else if (month) {
        query = query.like('date', `${month}%`);
      }

      if (search) {
        const q = search.trim();
        query = query.or(`id.ilike.%${q}%,customername.ilike.%${q}%,fromplace.ilike.%${q}%,toplace.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const normalized = (data || []).map(normalizeTrip);
      return res.status(200).json(normalized);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST create trip ──
  if (req.method === 'POST') {
    try {
      const trip = req.body;
      const from = trip.fromPlace || trip.fromplace;
      const to = trip.toPlace || trip.toplace;
      if (!trip || !from || !to) {
        return res.status(400).json({ error: 'fromPlace and toPlace are required' });
      }

      const id = trip.id || `TRP-${Math.floor(100 + Math.random() * 900)}`;
      trip.id = id;

      const payload = tripToDb(trip);

      const { data, error } = await supabase
        .from('trips')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(normalizeTrip(data));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
