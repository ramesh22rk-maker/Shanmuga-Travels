-- ====================================================================
-- Shanmuga Travels - Supabase PostgreSQL Database Schema
-- Copy and paste this into Supabase SQL Editor (https://app.supabase.com)
-- ====================================================================

-- 1. Create the trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    date TEXT NOT NULL,
    startTime TEXT DEFAULT '10:00 AM',
    customerName TEXT DEFAULT '',
    fromPlace TEXT NOT NULL,
    toPlace TEXT NOT NULL,
    distanceKm NUMERIC(10, 2) DEFAULT 0,
    startOdo NUMERIC(10, 2) DEFAULT 0,
    startOdoPhoto TEXT DEFAULT '',
    endOdo NUMERIC(10, 2) DEFAULT 0,
    endOdoPhoto TEXT DEFAULT '',
    costCustomer NUMERIC(10, 2) DEFAULT 0,
    fuelExpense NUMERIC(10, 2) DEFAULT 0,
    tollExpense NUMERIC(10, 2) DEFAULT 0,
    otherExpense NUMERIC(10, 2) DEFAULT 0,
    otherNote TEXT DEFAULT '',
    waitingCharge NUMERIC(10, 2) DEFAULT 0,
    waitingDuration NUMERIC(10, 2) DEFAULT 0,
    waitingUnit TEXT DEFAULT 'hours',
    parkingCharge NUMERIC(10, 2) DEFAULT 0,
    extraKm NUMERIC(10, 2) DEFAULT 0,
    extraKmRate NUMERIC(10, 2) DEFAULT 11,
    extraKmCharge NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_customer ON public.trips(customerName);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Public Access (Read, Insert, Update, Delete)
-- Note: You can customize these according to your authentication requirements.
CREATE POLICY "Allow public read access on trips"
    ON public.trips
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access on trips"
    ON public.trips
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update access on trips"
    ON public.trips
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete access on trips"
    ON public.trips
    FOR DELETE
    USING (true);

-- 5. Insert Sample Seed Data (Optional)
INSERT INTO public.trips (
    id, status, date, startTime, customerName, fromPlace, toPlace,
    distanceKm, startOdo, endOdo, costCustomer, fuelExpense, tollExpense, otherExpense, otherNote
) VALUES (
    'TRP-101',
    'completed',
    CURRENT_DATE::TEXT,
    '09:30 AM',
    'Koramangala Motors',
    'Hosur',
    'Kempegowda Airport (BLR)',
    75,
    45200,
    45275,
    2300,
    650.00,
    220.00,
    100.00,
    'Refreshment'
) ON CONFLICT (id) DO NOTHING;
