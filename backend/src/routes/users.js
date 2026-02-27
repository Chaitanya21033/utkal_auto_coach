const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('admin', 'line_manager'));

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, employee_id, role, is_active, created_at FROM users ORDER BY name').all();
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, employee_id, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  const { name, employee_id, pin, role } = req.body;
  if (!name || !employee_id || !pin || !role) {
    return res.status(400).json({ error: 'name, employee_id, pin, role are required' });
  }
  const valid_roles = ['line_manager','production','quality','maintenance','store','safety_hr','admin'];
  if (!valid_roles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const exists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(employee_id.toUpperCase());
  if (exists) return res.status(400).json({ error: 'Employee ID already exists' });
  const pin_hash = bcrypt.hashSync(String(pin), 10);
  const result = db.prepare(`
    INSERT INTO users (name, employee_id, pin_hash, role) VALUES (?, ?, ?, ?)
  `).run(name, employee_id.toUpperCase(), pin_hash, role);
  res.status(201).json(db.prepare('SELECT id, name, employee_id, role, is_active FROM users WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/users/:id (admin only)
router.patch('/:id', requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { name, pin, role, is_active } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (pin) updates.pin_hash = bcrypt.hashSync(String(pin), 10);
  if (role) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), user.id);
  res.json(db.prepare('SELECT id, name, employee_id, role, is_active FROM users WHERE id = ?').get(user.id));
});

module.exports = router;
