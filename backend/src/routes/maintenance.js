const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireModule('maintenance'));

// GET /api/maintenance/tickets
router.get('/tickets', (req, res) => {
  const { stage, priority, status } = req.query;
  let query = `SELECT t.*, u.name as created_by_name,
    CAST((julianday('now') - julianday(t.created_at)) * 24 * 60 AS INTEGER) as age_minutes
    FROM maintenance_tickets t LEFT JOIN users u ON t.created_by = u.id WHERE 1=1`;
  const params = [];
  if (stage) { query += ' AND t.stage = ?'; params.push(stage); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  query += ' ORDER BY CASE t.priority WHEN \'HIGH\' THEN 1 WHEN \'MED\' THEN 2 WHEN \'LOW\' THEN 3 END, t.created_at ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/maintenance/tickets/:id
router.get('/tickets/:id', (req, res) => {
  const ticket = db.prepare(`
    SELECT t.*, u.name as created_by_name FROM maintenance_tickets t
    LEFT JOIN users u ON t.created_by = u.id WHERE t.id = ? OR t.ticket_no = ?
  `).get(req.params.id, req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// POST /api/maintenance/tickets
router.post('/tickets', (req, res) => {
  const { title, priority, stage, machine_id, description } = req.body;
  if (!title || !priority || !stage || !machine_id) {
    return res.status(400).json({ error: 'title, priority, stage, machine_id are required' });
  }
  if (!['HIGH', 'MED', 'LOW'].includes(priority)) {
    return res.status(400).json({ error: 'priority must be HIGH, MED, or LOW' });
  }
  // Generate ticket number
  const count = db.prepare('SELECT COUNT(*) as cnt FROM maintenance_tickets').get().cnt;
  const ticket_no = `MT-${2050 + count}`;
  const result = db.prepare(`
    INSERT INTO maintenance_tickets (ticket_no, title, priority, stage, machine_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ticket_no, title, priority, stage, machine_id, description || null, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/maintenance/tickets/:id
router.patch('/tickets/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ? OR ticket_no = ?').get(req.params.id, req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { status, root_cause, action_taken, spares_used, verified_by, photo_proof } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (root_cause !== undefined) updates.root_cause = root_cause;
  if (action_taken !== undefined) updates.action_taken = action_taken;
  if (spares_used !== undefined) updates.spares_used = spares_used;
  if (verified_by !== undefined) updates.verified_by = verified_by;
  if (photo_proof !== undefined) updates.photo_proof = photo_proof;
  if (status === 'closed') updates.closed_at = new Date().toISOString();

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE maintenance_tickets SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), ticket.id);
  res.json(db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(ticket.id));
});

// GET /api/maintenance/pm
router.get('/pm', (req, res) => {
  const { machine_group } = req.query;
  const PM_TEMPLATES = {
    'Compressors':  ['Check oil level', 'Inspect air filter', 'Check belt tension', 'Drain moisture trap', 'Verify pressure relief valve', 'Sign-off by Maintenance'],
    'Paint Booth':  ['Check air leaks / hissing points', 'Verify booth ventilation & filters', 'Inspect hoses and connectors', 'Clean sensors and filter mesh', 'Record observations (photo if needed)', 'Sign-off by Maintenance'],
    'Welders':      ['Check earth cables', 'Inspect wire feed mechanism', 'Clean torch / tip', 'Check gas connections', 'Verify shield gas flow', 'Sign-off by Maintenance'],
    'Lathe':        ['Check lubrication points', 'Inspect chuck and jaws', 'Verify tool holders', 'Check coolant level', 'Inspect guards and safety features', 'Sign-off by Maintenance'],
    'PS Grind':     ['Inspect grinding wheel', 'Check wheel guard', 'Verify eye shield in place', 'Check spindle bearings', 'Clean dust extractor', 'Sign-off by Maintenance'],
  };

  if (machine_group && PM_TEMPLATES[machine_group]) {
    const recent = db.prepare(`SELECT * FROM pm_submissions WHERE machine_group = ? ORDER BY submitted_at DESC LIMIT 5`).all(machine_group);
    return res.json({
      machine_group,
      items: PM_TEMPLATES[machine_group],
      recent_submissions: recent.map(r => ({ ...r, checklist_items: JSON.parse(r.checklist_items) }))
    });
  }

  // Return all groups with due counts
  const groups = Object.keys(PM_TEMPLATES).map(group => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(`SELECT COUNT(*) as cnt FROM pm_submissions WHERE machine_group = ? AND submitted_at >= ?`).get(group, today).cnt;
    return { machine_group: group, item_count: PM_TEMPLATES[group].length, today_submissions: todayCount };
  });
  res.json(groups);
});

// POST /api/maintenance/pm
router.post('/pm', (req, res) => {
  const { machine_group, checklist_items } = req.body;
  if (!machine_group || !checklist_items) {
    return res.status(400).json({ error: 'machine_group and checklist_items are required' });
  }
  const shift = db.prepare(`SELECT id FROM shifts WHERE user_id = ? AND status = 'active' LIMIT 1`).get(req.user.id);
  const result = db.prepare(`
    INSERT INTO pm_submissions (machine_group, checklist_items, submitted_by, shift_id)
    VALUES (?, ?, ?, ?)
  `).run(machine_group, JSON.stringify(checklist_items), req.user.id, shift?.id || null);
  res.status(201).json({ id: result.lastInsertRowid, submitted_at: new Date().toISOString() });
});

module.exports = router;
