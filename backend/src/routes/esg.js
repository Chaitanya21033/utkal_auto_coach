const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('admin', 'line_manager'));

// ─── helpers ──────────────────────────────────────────────────────────────────

function cfg(key, fallback) {
  const r = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  return r ? Number(r.value) : fallback;
}

function periodBounds(period, anchor) {
  // anchor = today's date string YYYY-MM-DD
  const today = anchor ? new Date(anchor) : new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'daily') {
    // last 7 days
    const end = new Date(today); end.setDate(end.getDate() + 1);
    const start = new Date(today); start.setDate(start.getDate() - 6);
    return { start: fmt(start), end: fmt(end), groupFmt: '%Y-%m-%d', labelFmt: 'date' };
  }
  if (period === 'weekly') {
    // last 8 weeks
    const end = new Date(today); end.setDate(end.getDate() + 1);
    const start = new Date(today); start.setDate(start.getDate() - 55);
    return { start: fmt(start), end: fmt(end), groupFmt: '%Y-%W', labelFmt: 'week' };
  }
  if (period === 'quarterly') {
    // last 4 quarters
    const end = new Date(today); end.setDate(end.getDate() + 1);
    const start = new Date(today); start.setFullYear(start.getFullYear() - 1);
    return { start: fmt(start), end: fmt(end), groupFmt: 'quarter', labelFmt: 'quarter' };
  }
  // default: monthly, last 12 months
  const end = new Date(today); end.setDate(end.getDate() + 1);
  const start = new Date(today); start.setFullYear(start.getFullYear() - 1);
  return { start: fmt(start), end: fmt(end), groupFmt: '%Y-%m', labelFmt: 'month' };
}

function fmt(d) { return d.toISOString().split('T')[0]; }

function meterConsumption(meterType, start, end) {
  return db.prepare(`
    SELECT SUM(CASE WHEN consumption_delta > 0 THEN consumption_delta ELSE 0 END) as total
    FROM meter_readings
    WHERE meter_type = ? AND recorded_at >= ? AND recorded_at < ?
  `).get(meterType, start, end)?.total ?? 0;
}

function productionTotals(start, end) {
  return db.prepare(`
    SELECT
      COALESCE(SUM(est_electricity_kwh), 0) as elec_kwh,
      COALESCE(SUM(est_water_kl), 0)        as water_kl,
      COALESCE(SUM(direct_co2_kg), 0)       as direct_co2,
      COALESCE(SUM(waste_kg), 0)            as waste_kg
    FROM production_logs
    WHERE log_date >= ? AND log_date < ?
  `).get(start, end);
}

function scrapTotals(start, end) {
  return db.prepare(`
    SELECT COALESCE(SUM(estimated_weight), 0) as total_kg
    FROM scrap_logs WHERE created_at >= ? AND created_at < ?
  `).get(start, end)?.total_kg ?? 0;
}

// Build grouped chart rows for a metric
function chartSeries(period, start, end) {
  const { groupFmt } = periodBounds(period);
  const isQuarter = groupFmt === 'quarter';

  const elecRows = isQuarter
    ? db.prepare(`
        SELECT (CAST(strftime('%m',recorded_at) AS INTEGER) - 1)/3 + 1 as q,
               strftime('%Y', recorded_at) as yr,
               SUM(CASE WHEN consumption_delta > 0 THEN consumption_delta ELSE 0 END) as val
        FROM meter_readings WHERE meter_type='electricity' AND recorded_at >= ? AND recorded_at < ?
        GROUP BY yr, q ORDER BY yr, q
      `).all(start, end).map(r => ({ label: `${r.yr} Q${r.q}`, val: r.val ?? 0 }))
    : db.prepare(`
        SELECT strftime('${groupFmt}', recorded_at) as lbl,
               SUM(CASE WHEN consumption_delta > 0 THEN consumption_delta ELSE 0 END) as val
        FROM meter_readings WHERE meter_type='electricity' AND recorded_at >= ? AND recorded_at < ?
        GROUP BY lbl ORDER BY lbl
      `).all(start, end).map(r => ({ label: r.lbl, val: r.val ?? 0 }));

  const waterRows = isQuarter
    ? db.prepare(`
        SELECT (CAST(strftime('%m',recorded_at) AS INTEGER) - 1)/3 + 1 as q,
               strftime('%Y', recorded_at) as yr,
               SUM(CASE WHEN consumption_delta > 0 THEN consumption_delta ELSE 0 END) as val
        FROM meter_readings WHERE meter_type='water' AND recorded_at >= ? AND recorded_at < ?
        GROUP BY yr, q ORDER BY yr, q
      `).all(start, end).map(r => ({ label: `${r.yr} Q${r.q}`, val: r.val ?? 0 }))
    : db.prepare(`
        SELECT strftime('${groupFmt}', recorded_at) as lbl,
               SUM(CASE WHEN consumption_delta > 0 THEN consumption_delta ELSE 0 END) as val
        FROM meter_readings WHERE meter_type='water' AND recorded_at >= ? AND recorded_at < ?
        GROUP BY lbl ORDER BY lbl
      `).all(start, end).map(r => ({ label: r.lbl, val: r.val ?? 0 }));

  const co2Rows = isQuarter
    ? db.prepare(`
        SELECT (CAST(strftime('%m',log_date) AS INTEGER) - 1)/3 + 1 as q,
               strftime('%Y', log_date) as yr,
               SUM(direct_co2_kg) as val
        FROM production_logs WHERE log_date >= ? AND log_date < ?
        GROUP BY yr, q ORDER BY yr, q
      `).all(start, end).map(r => ({ label: `${r.yr} Q${r.q}`, val: r.val ?? 0 }))
    : db.prepare(`
        SELECT strftime('${groupFmt}', log_date) as lbl,
               SUM(direct_co2_kg) as val
        FROM production_logs WHERE log_date >= ? AND log_date < ?
        GROUP BY lbl ORDER BY lbl
      `).all(start, end).map(r => ({ label: r.lbl, val: r.val ?? 0 }));

  return { electricity: elecRows, water: waterRows, production_co2: co2Rows };
}

// ─── routes ───────────────────────────────────────────────────────────────────

// GET /api/esg/overview?period=monthly
router.get('/overview', (req, res) => {
  const period = req.query.period || 'monthly';
  const { start, end } = periodBounds(period);

  const GRID  = cfg('grid_co2_factor', 0.82);
  const WATER = cfg('water_co2_factor', 0.344);
  const WASTE = cfg('waste_co2_factor', 0.5);

  const elec   = meterConsumption('electricity', start, end);
  const water  = meterConsumption('water', start, end);
  const prod   = productionTotals(start, end);
  const scrap  = scrapTotals(start, end);

  const elec_co2   = elec  * GRID;
  const water_co2  = water * WATER;
  const waste_co2  = scrap * WASTE;
  const total_co2  = (prod.direct_co2 + elec_co2 + water_co2 + waste_co2);

  // Units in stage snapshot — latest production log
  const latestLog = db.prepare(`
    SELECT stage_entries FROM production_logs ORDER BY logged_at DESC LIMIT 1
  `).get();
  const stageSnapshot = latestLog ? JSON.parse(latestLog.stage_entries) : [];

  res.json({
    period,
    range: { start, end },
    electricity: { kwh: Math.round(elec * 10) / 10, co2_kg: Math.round(elec_co2 * 10) / 10 },
    water:        { kl: Math.round(water * 10) / 10, co2_kg: Math.round(water_co2 * 10) / 10 },
    production:  {
      direct_co2_kg:      Math.round(prod.direct_co2 * 10) / 10,
      est_electricity_kwh: Math.round(prod.elec_kwh * 10) / 10,
      est_water_kl:        Math.round(prod.water_kl * 10) / 10,
    },
    waste: { kg: Math.round(prod.waste_kg * 10) / 10, scrap_kg: Math.round(scrap * 10) / 10, co2_kg: Math.round(waste_co2 * 10) / 10 },
    total_co2_kg: Math.round(total_co2 * 10) / 10,
    stage_snapshot: stageSnapshot,
    config: {
      grid_co2_factor: GRID,
      water_co2_factor: WATER,
      waste_co2_factor: WASTE,
    },
  });
});

// GET /api/esg/chart?period=monthly
router.get('/chart', (req, res) => {
  const period = req.query.period || 'monthly';
  const { start, end } = periodBounds(period);
  const series = chartSeries(period, start, end);
  res.json({ period, range: { start, end }, series });
});

// GET /api/esg/emission-factors-summary — for the ESG breakdown table
router.get('/emission-factors-summary', (req, res) => {
  const factors = db.prepare('SELECT * FROM emission_factors ORDER BY id').all();
  const GRID  = cfg('grid_co2_factor', 0.82);
  const WATER = cfg('water_co2_factor', 0.344);
  res.json({
    factors: factors.map(f => ({
      ...f,
      total_co2_per_unit: Math.round(
        (f.direct_co2_kg_per_unit + f.electricity_kwh_per_unit * GRID + f.water_kl_per_unit * WATER) * 100
      ) / 100,
    })),
    grid_co2_factor: GRID,
    water_co2_factor: WATER,
  });
});

module.exports = router;
