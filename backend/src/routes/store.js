const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireModule('store'));

// GET /api/store/work-orders
router.get('/work-orders', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM work_orders WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (wo_number LIKE ? OR customer LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  } else {
    query += " AND status = 'open'";
  }
  query += ' ORDER BY due_offset ASC, id DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/store/work-orders/:id
router.get('/work-orders/:id', (req, res) => {
  const wo = db.prepare('SELECT * FROM work_orders WHERE id = ? OR wo_number = ?').get(req.params.id, req.params.id);
  if (!wo) return res.status(404).json({ error: 'Work order not found' });
  const issues = db.prepare(`SELECT mi.*, u.name as issued_by_name FROM material_issues mi LEFT JOIN users u ON mi.issued_by = u.id WHERE mi.work_order_no = ? ORDER BY mi.issued_at DESC`).all(wo.wo_number);
  res.json({ ...wo, issues: issues.map(i => ({ ...i, materials: JSON.parse(i.materials) })) });
});

// POST /api/store/issues
router.post('/issues', (req, res) => {
  const { work_order_id, work_order_no, materials } = req.body;
  if (!work_order_no || !materials || !Array.isArray(materials)) {
    return res.status(400).json({ error: 'work_order_no and materials array are required' });
  }
  const result = db.prepare(`
    INSERT INTO material_issues (work_order_id, work_order_no, materials, issued_by) VALUES (?, ?, ?, ?)
  `).run(work_order_id || null, work_order_no, JSON.stringify(materials), req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, issued_at: new Date().toISOString() });
});

// GET /api/store/issues
router.get('/issues', (req, res) => {
  const { work_order_no } = req.query;
  let query = `SELECT mi.*, u.name as issued_by_name FROM material_issues mi LEFT JOIN users u ON mi.issued_by = u.id WHERE 1=1`;
  const params = [];
  if (work_order_no) { query += ' AND mi.work_order_no = ?'; params.push(work_order_no); }
  query += ' ORDER BY mi.issued_at DESC LIMIT 50';
  const results = db.prepare(query).all(...params).map(r => ({ ...r, materials: JSON.parse(r.materials) }));
  res.json(results);
});

module.exports = router;
