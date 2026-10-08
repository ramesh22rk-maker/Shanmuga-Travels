// api/trips/[id].js
// GET /api/trips/:id    — get one trip from Supabase
// PUT /api/trips/:id    — update / complete a trip in Supabase
// DELETE /api/trips/:id — delete a trip from Supabase

const { getSupabaseClient, normalizeTrip, tripToDb } = require('../supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase credentials missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Trip ID required' });

  // ── GET one trip ──
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Trip not found' });
      }
      return res.status(200).json(normalizeTrip(data));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT update trip ──
  if (req.method === 'PUT') {
    try {
      const tripUpdates = { ...req.body, id };
      const dbUpdates = tripToDb(tripUpdates);

      // Clean undefined keys
      Object.keys(dbUpdates).forEach(key => {
        if (dbUpdates[key] === undefined) delete dbUpdates[key];
      });

      const { data, error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      return res.status(200).json(normalizeTrip(data));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE trip ──
  if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      return res.status(200).json({ message: 'Trip deleted successfully', id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
