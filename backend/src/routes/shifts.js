const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/shifts/current
router.get('/current', (req, res) => {
  const shift = db.prepare(`
    SELECT * FROM shifts WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1
  `).get(req.user.id);
  res.json(shift || null);
});

// POST /api/shifts/start
router.post('/start', (req, res) => {
  const { shift_type, stage } = req.body;
  if (!shift_type || !stage) {
    return res.status(400).json({ error: 'shift_type and stage are required' });
  }
  if (!['A', 'B', 'C'].includes(shift_type)) {
    return res.status(400).json({ error: 'shift_type must be A, B, or C' });
  }
  // End any existing active shifts
  db.prepare(`UPDATE shifts SET status = 'ended', end_time = datetime('now') WHERE user_id = ? AND status = 'active'`).run(req.user.id);
  const result = db.prepare(`
    INSERT INTO shifts (user_id, shift_type, stage) VALUES (?, ?, ?)
  `).run(req.user.id, shift_type, stage);
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(shift);
});

// PATCH /api/shifts/:id/end
router.patch('/:id/end', (req, res) => {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  db.prepare(`UPDATE shifts SET status = 'ended', end_time = datetime('now') WHERE id = ?`).run(shift.id);
  res.json(db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift.id));
});

module.exports = router;
