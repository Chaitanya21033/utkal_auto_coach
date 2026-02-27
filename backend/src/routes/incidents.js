const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/incidents
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `SELECT i.*, u.name as reported_by_name FROM incidents i LEFT JOIN users u ON i.reported_by = u.id WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND i.status = ?'; params.push(status); }
  query += ' ORDER BY CASE i.severity WHEN \'HIGH\' THEN 1 WHEN \'MED\' THEN 2 WHEN \'LOW\' THEN 3 END, i.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/incidents
router.post('/', (req, res) => {
  const { title, description, incident_type, stage, severity } = req.body;
  if (!title || !incident_type || !severity) {
    return res.status(400).json({ error: 'title, incident_type, severity are required' });
  }
  const valid_types = ['safety', 'near_miss', 'hazard', 'injury'];
  const valid_sev = ['HIGH', 'MED', 'LOW'];
  if (!valid_types.includes(incident_type)) return res.status(400).json({ error: 'Invalid incident_type' });
  if (!valid_sev.includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
  const result = db.prepare(`
    INSERT INTO incidents (title, description, incident_type, stage, severity, reported_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || null, incident_type, stage || null, severity, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/incidents/:id
router.patch('/:id', (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  const { status, description } = req.body;
  const updates = {};
  if (status) { updates.status = status; if (status === 'closed') updates.closed_at = new Date().toISOString(); }
  if (description !== undefined) updates.description = description;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE incidents SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), incident.id);
  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id));
});

module.exports = router;
