const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);
router.use(requireModule('quality'));

const GATE_META = {
  rm_incoming: { label: 'RM Incoming', gate_no: 1, items: ['Material certificate present', 'Dimensions as per drawing', 'Surface finish acceptable', 'Quantity matches PO', 'No visible damage/defect', 'Supplier label intact'] },
  in_process:  { label: 'In-Process',  gate_no: 2, items: ['Weld quality check (no spatter)', 'Dimensional tolerance verified', 'Paint adhesion test', 'Assembly fitment OK', 'Torque values recorded', 'Rework points cleared'] },
  pre_pdi:     { label: 'Pre-PDI',      gate_no: 3, items: ['Weld quality OK (no cracks)', 'Paint finish uniform (no peel)', 'Hydraulic fitment secure', 'Fasteners torqued', 'Safety stickers/labels present', 'Road-safety banner check'] },
  fg_dispatch: { label: 'FG Dispatch',  gate_no: 4, items: ['Vehicle cleaned & polished', 'All accessories fitted', 'Test drive sign-off', 'PDI certificate attached', 'Dispatch note raised', 'Customer acknowledgment ready'] },
};

// GET /api/quality/gates
router.get('/gates', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const gates = Object.entries(GATE_META).map(([type, meta]) => {
    const todayCount = db.prepare(`SELECT COUNT(*) as cnt FROM quality_gate_results WHERE gate_type = ? AND created_at >= ?`).get(type, today).cnt;
    const lastPass = db.prepare(`SELECT created_at FROM quality_gate_results WHERE gate_type = ? AND result = 'pass' ORDER BY created_at DESC LIMIT 1`).get(type);
    return { gate_type: type, ...meta, today_count: todayCount, last_pass: lastPass?.created_at };
  });
  res.json(gates);
});

// GET /api/quality/gates/history
router.get('/gates/history', (req, res) => {
  const { gate_type, work_order_no } = req.query;
  let query = `SELECT g.*, u.name as submitted_by_name FROM quality_gate_results g LEFT JOIN users u ON g.submitted_by = u.id WHERE 1=1`;
  const params = [];
  if (gate_type) { query += ' AND g.gate_type = ?'; params.push(gate_type); }
  if (work_order_no) { query += ' AND g.work_order_no = ?'; params.push(work_order_no); }
  query += ' ORDER BY g.created_at DESC LIMIT 50';
  const results = db.prepare(query).all(...params).map(r => ({ ...r, checklist_items: JSON.parse(r.checklist_items) }));
  res.json(results);
});

// POST /api/quality/gates
router.post('/gates', (req, res) => {
  const { gate_type, work_order_no, model, variant, checklist_items, result, notes } = req.body;
  if (!gate_type || !checklist_items || !result) {
    return res.status(400).json({ error: 'gate_type, checklist_items, result are required' });
  }
  if (!GATE_META[gate_type]) {
    return res.status(400).json({ error: 'Invalid gate_type' });
  }
  if (!['pass', 'hold'].includes(result)) {
    return res.status(400).json({ error: 'result must be pass or hold' });
  }
  const dbResult = db.prepare(`
    INSERT INTO quality_gate_results (gate_type, work_order_no, model, variant, checklist_items, result, notes, submitted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(gate_type, work_order_no || null, model || null, variant || null, JSON.stringify(checklist_items), result, notes || null, req.user.id);

  res.status(201).json({ id: dbResult.lastInsertRowid, result, created_at: new Date().toISOString() });
});

// GET /api/quality/gate-meta
router.get('/gate-meta/:gate_type', (req, res) => {
  const meta = GATE_META[req.params.gate_type];
  if (!meta) return res.status(404).json({ error: 'Gate type not found' });
  res.json({ gate_type: req.params.gate_type, ...meta });
});

module.exports = router;
