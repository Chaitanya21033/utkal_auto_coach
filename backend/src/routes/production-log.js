const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('line_manager', 'admin'));

// ─── helpers ──────────────────────────────────────────────────────────────────

function getConfig(key, fallback) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  return row ? Number(row.value) : fallback;
}

function computeEmissions(stageEntries) {
  const GRID = getConfig('grid_co2_factor', 0.82);   // kg CO2/kWh
  const WATER = getConfig('water_co2_factor', 0.344); // kg CO2/KL

  let est_electricity_kwh = 0;
  let est_water_kl        = 0;
  let direct_co2_kg       = 0;

  for (const entry of stageEntries) {
    const factor = db.prepare('SELECT * FROM emission_factors WHERE stage = ?').get(entry.stage);
    if (!factor) continue;
    const units = Number(entry.units_in_stage) || 0;
    est_electricity_kwh += units * (factor.electricity_kwh_per_unit || 0);
    est_water_kl        += units * (factor.water_kl_per_unit || 0);
    direct_co2_kg       += units * (factor.direct_co2_kg_per_unit || 0);
  }

  // Total CO2e includes:
  //   - Scope 1: direct process emissions (welding fumes, VOCs, etc.)
  //   - Scope 2: grid electricity CO2
  //   - Scope 3: water treatment CO2
  const electricity_co2 = est_electricity_kwh * GRID;
  const water_co2       = est_water_kl * WATER;

  return {
    est_electricity_kwh: Math.round(est_electricity_kwh * 100) / 100,
    est_water_kl:        Math.round(est_water_kl * 100) / 100,
    direct_co2_kg:       Math.round(direct_co2_kg * 100) / 100,
    electricity_co2_kg:  Math.round(electricity_co2 * 100) / 100,
    water_co2_kg:        Math.round(water_co2 * 100) / 100,
    total_co2_kg:        Math.round((direct_co2_kg + electricity_co2 + water_co2) * 100) / 100,
  };
}

// ─── routes ───────────────────────────────────────────────────────────────────

// GET /api/production-log
router.get('/', (req, res) => {
  const { date, limit = 30 } = req.query;
  let q = `SELECT pl.*, u.name as logged_by_name
           FROM production_logs pl LEFT JOIN users u ON pl.logged_by = u.id
           WHERE 1=1`;
  const params = [];
  if (date) { q += ' AND pl.log_date = ?'; params.push(date); }
  q += ' ORDER BY pl.logged_at DESC LIMIT ?';
  params.push(Number(limit));
  const rows = db.prepare(q).all(...params).map(r => ({
    ...r, stage_entries: JSON.parse(r.stage_entries)
  }));
  res.json(rows);
});

// GET /api/production-log/today
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT pl.*, u.name as logged_by_name
    FROM production_logs pl LEFT JOIN users u ON pl.logged_by = u.id
    WHERE pl.log_date = ? ORDER BY pl.logged_at DESC
  `).all(today).map(r => ({ ...r, stage_entries: JSON.parse(r.stage_entries) }));
  res.json(rows);
});

// GET /api/production-log/emission-preview — compute without saving
router.post('/emission-preview', (req, res) => {
  const { stage_entries } = req.body;
  if (!stage_entries) return res.status(400).json({ error: 'stage_entries required' });
  res.json(computeEmissions(stage_entries));
});

// POST /api/production-log — submit daily log
router.post('/', (req, res) => {
  const { log_date, shift_type, stage_entries, waste_kg = 0, notes } = req.body;
  if (!log_date || !stage_entries || !Array.isArray(stage_entries)) {
    return res.status(400).json({ error: 'log_date and stage_entries[] are required' });
  }

  const emissions = computeEmissions(stage_entries);

  const result = db.prepare(`
    INSERT INTO production_logs
      (log_date, shift_type, stage_entries, waste_kg, notes,
       est_electricity_kwh, est_water_kl, direct_co2_kg, logged_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log_date, shift_type || null,
    JSON.stringify(stage_entries),
    Number(waste_kg), notes || null,
    emissions.est_electricity_kwh, emissions.est_water_kl, emissions.direct_co2_kg,
    req.user.id
  );

  const row = db.prepare('SELECT * FROM production_logs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, stage_entries, emissions });
});

module.exports = router;
