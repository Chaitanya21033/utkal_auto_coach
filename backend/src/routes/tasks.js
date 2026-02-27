const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE 1=1`;
  const params = [];

  // Filter by role unless admin/line_manager
  const roleMap = {
    maintenance: 'maintenance',
    quality: 'quality',
    production: 'production',
    store: 'store',
    safety_hr: 'safety_hr',
  };
  if (req.user.role !== 'admin' && req.user.role !== 'line_manager') {
    query += ' AND (t.assigned_role = ? OR t.assigned_to = ?)';
    params.push(roleMap[req.user.role] || req.user.role, req.user.id);
  }

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  else { query += " AND t.status != 'completed'"; }

  query += ' ORDER BY CASE t.priority WHEN \'High\' THEN 1 WHEN \'Med\' THEN 2 WHEN \'Low\' THEN 3 END, t.created_at ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/tasks/completed
router.get('/completed', (req, res) => {
  let query = `SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.status = 'completed'`;
  const params = [];
  if (req.user.role !== 'admin' && req.user.role !== 'line_manager') {
    query += ' AND (t.assigned_role = ? OR t.assigned_to = ?)';
    params.push(req.user.role, req.user.id);
  }
  query += ' ORDER BY t.completed_at DESC LIMIT 20';
  res.json(db.prepare(query).all(...params));
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { title, description, priority, module_ref, assigned_to, assigned_role, due_date } = req.body;
  if (!title || !priority) return res.status(400).json({ error: 'title and priority are required' });
  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, module_ref, assigned_to, assigned_role, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, priority, module_ref || null, assigned_to || null, assigned_role || null, due_date || null);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/tasks/:id
router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { status, title, priority, description } = req.body;
  const updates = {};
  if (status) { updates.status = status; if (status === 'completed') updates.completed_at = new Date().toISOString(); }
  if (title) updates.title = title;
  if (priority) updates.priority = priority;
  if (description !== undefined) updates.description = description;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), task.id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

module.exports = router;
