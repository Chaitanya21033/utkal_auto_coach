const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireModule('store'));

// GET /api/scrap
router.get('/', (req, res) => {
  const logs = db.prepare(`
    SELECT s.*, u.name as logged_by_name FROM scrap_logs s LEFT JOIN users u ON s.logged_by = u.id
    ORDER BY s.created_at DESC LIMIT 50
  `).all();
  res.json(logs);
});

// POST /api/scrap
router.post('/', (req, res) => {
  const { scrap_type, estimated_weight, yard } = req.body;
  if (!scrap_type) return res.status(400).json({ error: 'scrap_type is required' });
  const valid = ['MS Scrap', 'SS Scrap', 'Mixed', 'Hazardous'];
  if (!valid.includes(scrap_type)) return res.status(400).json({ error: 'Invalid scrap_type' });
  const result = db.prepare(`
    INSERT INTO scrap_logs (scrap_type, estimated_weight, yard, logged_by) VALUES (?, ?, ?, ?)
  `).run(scrap_type, estimated_weight || null, yard || null, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM scrap_logs WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/scrap/:id/dispatch
router.patch('/:id/dispatch', (req, res) => {
  const log = db.prepare('SELECT * FROM scrap_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Scrap log not found' });
  if (log.status === 'dispatched') return res.status(400).json({ error: 'Already dispatched' });
  db.prepare(`UPDATE scrap_logs SET status = 'dispatched', dispatched_at = datetime('now') WHERE id = ?`).run(log.id);
  res.json(db.prepare('SELECT * FROM scrap_logs WHERE id = ?').get(log.id));
});

module.exports = router;
