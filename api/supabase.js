// api/supabase.js
// Supabase Client Initialization & Data Normalizer Helper
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

const supabase = getSupabaseClient();

// Normalizes PostgreSQL lowercase fields to application camelCase
function normalizeTrip(row) {
  if (!row) return row;
  return {
    id: row.id,
    status: row.status || 'active',
    date: row.date,
    startTime: row.starttime ?? row.startTime ?? '10:00 AM',
    customerName: row.customername ?? row.customerName ?? '',
    fromPlace: row.fromplace ?? row.fromPlace ?? '',
    toPlace: row.toplace ?? row.toPlace ?? '',
    distanceKm: parseFloat(row.distancekm ?? row.distanceKm ?? 0),
    startOdo: parseFloat(row.startodo ?? row.startOdo ?? 0),
    startOdoPhoto: row.startodophoto ?? row.startOdoPhoto ?? '',
    endOdo: parseFloat(row.endodo ?? row.endOdo ?? 0),
    endOdoPhoto: row.endodophoto ?? row.endOdoPhoto ?? '',
    costCustomer: parseFloat(row.costcustomer ?? row.costCustomer ?? 0),
    fuelExpense: parseFloat(row.fuelexpense ?? row.fuelExpense ?? 0),
    tollExpense: parseFloat(row.tollexpense ?? row.tollExpense ?? 0),
    otherExpense: parseFloat(row.otherexpense ?? row.otherExpense ?? 0),
    otherNote: row.othernote ?? row.otherNote ?? '',
    waitingCharge: parseFloat(row.waitingcharge ?? row.waitingCharge ?? 0),
    waitingDuration: parseFloat(row.waitingduration ?? row.waitingDuration ?? 0),
    waitingUnit: row.waitingunit ?? row.waitingUnit ?? 'hours',
    parkingCharge: parseFloat(row.parkingcharge ?? row.parkingCharge ?? 0),
    extraKm: parseFloat(row.extrakm ?? row.extraKm ?? 0),
    extraKmRate: parseFloat(row.extrakmrate ?? row.extraKmRate ?? 11),
    extraKmCharge: parseFloat(row.extrakmcharge ?? row.extraKmCharge ?? 0),
    cngCharge: parseFloat(row.cngcharge ?? row.cngCharge ?? 0),
    petrolCharge: parseFloat(row.petrolcharge ?? row.petrolCharge ?? 0),
    serviceCharge: parseFloat(row.servicecharge ?? row.serviceCharge ?? 0),
    created_at: row.created_at
  };
}

// Prepares trip payload for PostgreSQL
function tripToDb(trip) {
  return {
    id: trip.id,
    status: trip.status || 'active',
    date: trip.date || new Date().toISOString().split('T')[0],
    starttime: trip.startTime || trip.starttime || '10:00 AM',
    customername: trip.customerName || trip.customername || '',
    fromplace: trip.fromPlace || trip.fromplace || '',
    toplace: trip.toPlace || trip.toplace || '',
    distancekm: parseFloat(trip.distanceKm ?? trip.distancekm ?? 0),
    startodo: parseFloat(trip.startOdo ?? trip.startodo ?? 0),
    startodophoto: trip.startOdoPhoto ?? trip.startodophoto ?? '',
    endodo: parseFloat(trip.endOdo ?? trip.endodo ?? 0),
    endodophoto: trip.endOdoPhoto ?? trip.endodophoto ?? '',
    costcustomer: parseFloat(trip.costCustomer ?? trip.costcustomer ?? 0),
    fuelexpense: parseFloat(trip.fuelExpense ?? trip.fuelexpense ?? 0),
    tollexpense: parseFloat(trip.tollExpense ?? trip.tollexpense ?? 0),
    otherexpense: parseFloat(trip.otherExpense ?? trip.otherexpense ?? 0),
    othernote: trip.otherNote ?? trip.othernote ?? '',
    waitingcharge: parseFloat(trip.waitingCharge ?? trip.waitingcharge ?? 0),
    waitingduration: parseFloat(trip.waitingDuration ?? trip.waitingduration ?? 0),
    waitingunit: trip.waitingUnit ?? trip.waitingunit ?? 'hours',
    parkingcharge: parseFloat(trip.parkingCharge ?? trip.parkingcharge ?? 0),
    extrakm: parseFloat(trip.extraKm ?? trip.extrakm ?? 0),
    extrakmrate: parseFloat(trip.extraKmRate ?? trip.extrakmrate ?? 11),
    extrakmcharge: parseFloat(trip.extraKmCharge ?? trip.extrakmcharge ?? 0),
    cngcharge: parseFloat(trip.cngCharge ?? trip.cngcharge ?? 0),
    petrolcharge: parseFloat(trip.petrolCharge ?? trip.petrolcharge ?? 0),
    servicecharge: parseFloat(trip.serviceCharge ?? trip.servicecharge ?? 0)
  };
}

module.exports = {
  supabase,
  getSupabaseClient,
  supabaseUrl,
  supabaseKey,
  normalizeTrip,
  tripToDb
};
