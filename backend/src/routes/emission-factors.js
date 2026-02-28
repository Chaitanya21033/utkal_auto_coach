const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

const STAGES = ['CKD', 'Shot Blasting', 'Welding', 'Paint Shop', 'Final Assembly', 'Finished Goods'];

// GET /api/emission-factors — all stage factors + app config
router.get('/', (req, res) => {
  const factors = db.prepare('SELECT * FROM emission_factors ORDER BY id').all();
  const config  = db.prepare('SELECT * FROM app_config').all();
  res.json({ factors, config: Object.fromEntries(config.map(c => [c.key, c.value])) });
});

// PATCH /api/emission-factors/:stage — admin only
router.patch('/:stage', requireRole('admin'), (req, res) => {
  const stage = decodeURIComponent(req.params.stage);
  if (!STAGES.includes(stage)) {
    return res.status(400).json({ error: 'Unknown stage' });
  }
  const { electricity_kwh_per_unit, water_kl_per_unit, direct_co2_kg_per_unit, notes } = req.body;

  const existing = db.prepare('SELECT * FROM emission_factors WHERE stage = ?').get(stage);
  if (existing) {
    db.prepare(`
      UPDATE emission_factors SET
        electricity_kwh_per_unit = COALESCE(?, electricity_kwh_per_unit),
        water_kl_per_unit        = COALESCE(?, water_kl_per_unit),
        direct_co2_kg_per_unit   = COALESCE(?, direct_co2_kg_per_unit),
        notes      = COALESCE(?, notes),
        updated_by = ?,
        updated_at = datetime('now')
      WHERE stage = ?
    `).run(
      electricity_kwh_per_unit ?? null,
      water_kl_per_unit ?? null,
      direct_co2_kg_per_unit ?? null,
      notes ?? null,
      req.user.id, stage
    );
  } else {
    db.prepare(`
      INSERT INTO emission_factors (stage, electricity_kwh_per_unit, water_kl_per_unit, direct_co2_kg_per_unit, notes, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(stage, electricity_kwh_per_unit ?? 0, water_kl_per_unit ?? 0, direct_co2_kg_per_unit ?? 0, notes ?? null, req.user.id);
  }
  res.json(db.prepare('SELECT * FROM emission_factors WHERE stage = ?').get(stage));
});

// PATCH /api/emission-factors/config/:key — admin only
router.patch('/config/:key', requireRole('admin'), (req, res) => {
  const { value } = req.body;
  if (value == null) return res.status(400).json({ error: 'value required' });
  db.prepare(`
    INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(req.params.key, String(value));
  res.json({ key: req.params.key, value });
});

module.exports = router;
