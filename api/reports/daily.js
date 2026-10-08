// api/reports/daily.js
// GET /api/reports/daily?date=YYYY-MM-DD

const { getSupabaseClient, normalizeTrip } = require('../supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase credentials missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('date', targetDate)
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const tripList = (trips || []).map(normalizeTrip);
    const totalCharged  = tripList.reduce((s, t) => s + parseFloat(t.costCustomer || 0), 0);
    const totalFuel     = tripList.reduce((s, t) => s + parseFloat(t.fuelExpense || 0), 0);
    const totalTolls    = tripList.reduce((s, t) => s + parseFloat(t.tollExpense || 0), 0);
    const totalOther    = tripList.reduce((s, t) => s + parseFloat(t.otherExpense || 0), 0);
    const totalExpenses = totalFuel + totalTolls + totalOther;
    const totalKm       = tripList.reduce((s, t) => s + parseFloat(t.distanceKm || 0), 0);
    const netProfit     = totalCharged - totalExpenses;

    return res.status(200).json({
      date: targetDate,
      tripCount: tripList.length,
      totalCharged,
      totalFuel,
      totalTolls,
      totalOther,
      totalExpenses,
      totalKm,
      netProfit,
      trips: tripList
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
