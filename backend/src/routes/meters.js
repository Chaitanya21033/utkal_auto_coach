const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Unit labels
const UNITS = { electricity: 'kWh', water: 'KL' };

// GET /api/meters — full history (optional ?meter_type= &meter_id= )
router.get('/', (req, res) => {
  const { meter_type, meter_id, limit = 50 } = req.query;
  let q = `SELECT m.*, u.name as recorded_by_name
           FROM meter_readings m LEFT JOIN users u ON m.recorded_by = u.id
           WHERE 1=1`;
  const params = [];
  if (meter_type) { q += ' AND m.meter_type = ?'; params.push(meter_type); }
  if (meter_id)   { q += ' AND m.meter_id = ?';   params.push(meter_id); }
  q += ' ORDER BY m.recorded_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(q).all(...params));
});

// GET /api/meters/latest — one row per (meter_type, meter_id) — most recent reading
router.get('/latest', (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, u.name as recorded_by_name
    FROM meter_readings m
    LEFT JOIN users u ON m.recorded_by = u.id
    WHERE m.id IN (
      SELECT MAX(id) FROM meter_readings GROUP BY meter_type, meter_id
    )
    ORDER BY m.meter_type, m.meter_id
  `).all();
  res.json(rows);
});

// GET /api/meters/meters-list — distinct (meter_type, meter_id) combos
router.get('/meters-list', (req, res) => {
  const rows = db.prepare(`
    SELECT meter_type, meter_id, unit, COUNT(*) as reading_count,
           MAX(recorded_at) as last_reading, MAX(reading_value) as last_value
    FROM meter_readings GROUP BY meter_type, meter_id
  `).all();
  res.json(rows);
});

// POST /api/meters — record a new reading
router.post('/', (req, res) => {
  const { meter_type, meter_id = 'MAIN', reading_value, photo_data, ocr_raw } = req.body;
  if (!meter_type || reading_value == null) {
    return res.status(400).json({ error: 'meter_type and reading_value are required' });
  }
  if (!['electricity', 'water'].includes(meter_type)) {
    return res.status(400).json({ error: 'meter_type must be electricity or water' });
  }

  // Find previous reading for the same meter to compute delta
  const prev = db.prepare(`
    SELECT reading_value, recorded_at FROM meter_readings
    WHERE meter_type = ? AND meter_id = ?
    ORDER BY recorded_at DESC LIMIT 1
  `).get(meter_type, meter_id);

  let consumption_delta = null;
  if (prev) {
    consumption_delta = Number(reading_value) - Number(prev.reading_value);
    // Negative delta = meter rollover; mark as null so we don't corrupt ESG totals
    if (consumption_delta < 0) consumption_delta = null;
  }

  const unit = UNITS[meter_type];
  const result = db.prepare(`
    INSERT INTO meter_readings (meter_type, meter_id, reading_value, unit, consumption_delta, photo_data, ocr_raw, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(meter_type, meter_id, Number(reading_value), unit, consumption_delta, photo_data || null, ocr_raw || null, req.user.id);

  const row = db.prepare('SELECT * FROM meter_readings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, prev_reading: prev?.reading_value ?? null });
});

module.exports = router;
