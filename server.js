const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// SQLite Database Setup
const dbPath = path.join(__dirname, 'travels.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initDatabase();
  }
});

// Initialize DB schema
function initDatabase() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active',
      date TEXT NOT NULL,
      startTime TEXT,
      customerName TEXT,
      fromPlace TEXT NOT NULL,
      toPlace TEXT NOT NULL,
      distanceKm REAL DEFAULT 0,
      startOdo REAL DEFAULT 0,
      startOdoPhoto TEXT,
      endOdo REAL DEFAULT 0,
      endOdoPhoto TEXT,
      costCustomer REAL DEFAULT 0,
      fuelExpense REAL DEFAULT 0,
      tollExpense REAL DEFAULT 0,
      otherExpense REAL DEFAULT 0,
      otherNote TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.run(createTableSql, (err) => {
    if (err) {
      console.error('Error creating trips table:', err.message);
    } else {
      console.log('Trips table initialized.');
      seedInitialData();
    }
  });
}

function seedInitialData() {
  db.get('SELECT COUNT(*) as count FROM trips', [], (err, row) => {
    if (err) return;
    if (row && row.count === 0) {
      console.log('Seeding initial trip data into SQLite DB...');
      const today = new Date().toISOString().split('T')[0];
      const seedTrip = {
        id: 'TRP-101',
        status: 'completed',
        date: today,
        startTime: '09:30 AM',
        customerName: 'Koramangala Motors',
        fromPlace: 'Hosur',
        toPlace: 'Kempegowda Airport (BLR)',
        distanceKm: 75,
        startOdo: 45200,
        endOdo: 45275,
        costCustomer: 2300,
        fuelExpense: 650.00,
        tollExpense: 220.00,
        otherExpense: 100.00,
        otherNote: 'Refreshment',
        startOdoPhoto: '',
        endOdoPhoto: ''
      };

      const sql = `
        INSERT INTO trips (
          id, status, date, startTime, customerName, fromPlace, toPlace,
          distanceKm, startOdo, startOdoPhoto, endOdo, endOdoPhoto,
          costCustomer, fuelExpense, tollExpense, otherExpense, otherNote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        seedTrip.id, seedTrip.status, seedTrip.date, seedTrip.startTime,
        seedTrip.customerName, seedTrip.fromPlace, seedTrip.toPlace,
        seedTrip.distanceKm, seedTrip.startOdo, seedTrip.startOdoPhoto,
        seedTrip.endOdo, seedTrip.endOdoPhoto, seedTrip.costCustomer,
        seedTrip.fuelExpense, seedTrip.tollExpense, seedTrip.otherExpense, seedTrip.otherNote
      ], (insertErr) => {
        if (insertErr) console.error('Error seeding initial trip:', insertErr.message);
        else console.log('Initial seed trip created successfully.');
      });
    }
  });
}

// REST API Endpoints

// 1. GET /api/trips (Fetch all or filter by date, month, search)
app.get('/api/trips', (req, res) => {
  const { date, month, search } = req.query;
  let sql = 'SELECT * FROM trips WHERE 1=1';
  const params = [];

  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  } else if (month) {
    sql += ' AND date LIKE ?';
    params.push(`${month}%`);
  }

  if (search) {
    const q = `%${search.toLowerCase().trim()}%`;
    sql += ' AND (LOWER(id) LIKE ? OR LOWER(customerName) LIKE ? OR LOWER(fromPlace) LIKE ? OR LOWER(toPlace) LIKE ?)';
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY date DESC, created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 2. GET /api/trips/:id
app.get('/api/trips/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM trips WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  });
});

// 3. POST /api/trips (Create trip)
app.post('/api/trips', (req, res) => {
  const trip = req.body;
  const id = trip.id || `TRP-${Math.floor(100 + Math.random() * 900)}`;
  const date = trip.date || new Date().toISOString().split('T')[0];

  const sql = `
    INSERT INTO trips (
      id, status, date, startTime, customerName, fromPlace, toPlace,
      distanceKm, startOdo, startOdoPhoto, endOdo, endOdoPhoto,
      costCustomer, fuelExpense, tollExpense, otherExpense, otherNote
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    trip.status || 'active',
    date,
    trip.startTime || '10:00 AM',
    trip.customerName || '',
    trip.fromPlace || '',
    trip.toPlace || '',
    parseFloat(trip.distanceKm || 0),
    parseFloat(trip.startOdo || 0),
    trip.startOdoPhoto || '',
    parseFloat(trip.endOdo || 0),
    trip.endOdoPhoto || '',
    parseFloat(trip.costCustomer || 0),
    parseFloat(trip.fuelExpense || 0),
    parseFloat(trip.tollExpense || 0),
    parseFloat(trip.otherExpense || 0),
    trip.otherNote || ''
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT * FROM trips WHERE id = ?', [id], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.status(201).json(row);
    });
  });
});

// 4. PUT /api/trips/:id (Update / Complete trip)
app.put('/api/trips/:id', (req, res) => {
  const { id } = req.params;
  const trip = req.body;

  const sql = `
    UPDATE trips SET
      status = COALESCE(?, status),
      date = COALESCE(?, date),
      startTime = COALESCE(?, startTime),
      customerName = COALESCE(?, customerName),
      fromPlace = COALESCE(?, fromPlace),
      toPlace = COALESCE(?, toPlace),
      distanceKm = COALESCE(?, distanceKm),
      startOdo = COALESCE(?, startOdo),
      startOdoPhoto = COALESCE(?, startOdoPhoto),
      endOdo = COALESCE(?, endOdo),
      endOdoPhoto = COALESCE(?, endOdoPhoto),
      costCustomer = COALESCE(?, costCustomer),
      fuelExpense = COALESCE(?, fuelExpense),
      tollExpense = COALESCE(?, tollExpense),
      otherExpense = COALESCE(?, otherExpense),
      otherNote = COALESCE(?, otherNote)
    WHERE id = ?
  `;

  const params = [
    trip.status,
    trip.date,
    trip.startTime,
    trip.customerName,
    trip.fromPlace,
    trip.toPlace,
    trip.distanceKm,
    trip.startOdo,
    trip.startOdoPhoto,
    trip.endOdo,
    trip.endOdoPhoto,
    trip.costCustomer,
    trip.fuelExpense,
    trip.tollExpense,
    trip.otherExpense,
    trip.otherNote,
    id
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Trip not found' });

    db.get('SELECT * FROM trips WHERE id = ?', [id], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.json(row);
    });
  });
});

// 5. DELETE /api/trips/:id
app.delete('/api/trips/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM trips WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Trip not found' });
    res.json({ message: 'Trip deleted successfully', id });
  });
});

// 6. GET /api/reports/daily?date=YYYY-MM-DD
app.get('/api/reports/daily', (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  const sql = 'SELECT * FROM trips WHERE date = ? ORDER BY startTime ASC';
  db.all(sql, [targetDate], (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });

    const totalCharged = trips.reduce((sum, t) => sum + (t.costCustomer || 0), 0);
    const totalFuel = trips.reduce((sum, t) => sum + (t.fuelExpense || 0), 0);
    const totalTolls = trips.reduce((sum, t) => sum + (t.tollExpense || 0), 0);
    const totalOther = trips.reduce((sum, t) => sum + (t.otherExpense || 0), 0);
    const totalExpenses = totalFuel + totalTolls + totalOther;
    const totalKm = trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    const netProfit = totalCharged - totalExpenses;

    res.json({
      date: targetDate,
      tripCount: trips.length,
      totalCharged,
      totalFuel,
      totalTolls,
      totalOther,
      totalExpenses,
      totalKm,
      netProfit,
      trips
    });
  });
});

// 7. GET /api/reports/monthly?month=YYYY-MM
app.get('/api/reports/monthly', (req, res) => {
  const targetMonth = req.query.month || new Date().toISOString().slice(0, 7);

  const sql = 'SELECT * FROM trips WHERE date LIKE ? ORDER BY date ASC, startTime ASC';
  db.all(sql, [`${targetMonth}%`], (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });

    const totalCharged = trips.reduce((sum, t) => sum + (t.costCustomer || 0), 0);
    const totalFuel = trips.reduce((sum, t) => sum + (t.fuelExpense || 0), 0);
    const totalTolls = trips.reduce((sum, t) => sum + (t.tollExpense || 0), 0);
    const totalOther = trips.reduce((sum, t) => sum + (t.otherExpense || 0), 0);
    const totalExpenses = totalFuel + totalTolls + totalOther;
    const totalKm = trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    const netProfit = totalCharged - totalExpenses;

    res.json({
      month: targetMonth,
      tripCount: trips.length,
      totalCharged,
      totalFuel,
      totalTolls,
      totalOther,
      totalExpenses,
      totalKm,
      netProfit,
      trips
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Shanmuga Travels API Server is running smoothly' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Shanmuga Travels Backend Server Running on Port ${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api/trips`);
  console.log(`====================================================`);
});
