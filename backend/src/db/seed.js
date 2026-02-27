const bcrypt = require('bcryptjs');
const db = require('./index');

console.log('Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM tasks;
  DELETE FROM scrap_logs;
  DELETE FROM material_issues;
  DELETE FROM quality_gate_results;
  DELETE FROM pm_submissions;
  DELETE FROM maintenance_tickets;
  DELETE FROM shifts;
  DELETE FROM work_orders;
  DELETE FROM incidents;
  DELETE FROM users;
`);

// Seed users
const users = [
  { name: 'Admin User',       employee_id: 'ADM001', pin: '1234', role: 'admin' },
  { name: 'Ravi Kumar',       employee_id: 'LM001',  pin: '1111', role: 'line_manager' },
  { name: 'Suresh Patel',     employee_id: 'PRD001', pin: '2222', role: 'production' },
  { name: 'Anita Singh',      employee_id: 'QLT001', pin: '3333', role: 'quality' },
  { name: 'Mohan Das',        employee_id: 'MNT001', pin: '4444', role: 'maintenance' },
  { name: 'Deepak Sharma',    employee_id: 'STR001', pin: '5555', role: 'store' },
  { name: 'Priya Nair',       employee_id: 'SHR001', pin: '6666', role: 'safety_hr' },
];

const insertUser = db.prepare(`
  INSERT INTO users (name, employee_id, pin_hash, role)
  VALUES (@name, @employee_id, @pin_hash, @role)
`);

const insertedUsers = {};
for (const u of users) {
  const pin_hash = bcrypt.hashSync(u.pin, 10);
  const result = insertUser.run({ name: u.name, employee_id: u.employee_id, pin_hash, role: u.role });
  insertedUsers[u.role] = result.lastInsertRowid;
}

// Seed work orders
const insertWO = db.prepare(`
  INSERT INTO work_orders (wo_number, customer, type, due_offset, status)
  VALUES (@wo_number, @customer, @type, @due_offset, @status)
`);
insertWO.run({ wo_number: 'WO-1832', customer: 'Tipper Body BB', type: 'Standard Build', due_offset: 0, status: 'open' });
insertWO.run({ wo_number: 'WO-1833', customer: 'ERC Variant',    type: 'Standard Build', due_offset: 1, status: 'open' });
insertWO.run({ wo_number: 'WO-1829', customer: 'Rework Batch',   type: 'Rework',         due_offset: 0, status: 'open' });
insertWO.run({ wo_number: 'WO-1821', customer: 'Spare Parts',    type: 'Spares',         due_offset: 2, status: 'open' });

// Seed maintenance tickets
const insertTicket = db.prepare(`
  INSERT INTO maintenance_tickets (ticket_no, title, priority, stage, machine_id, description, status, created_by, created_at)
  VALUES (@ticket_no, @title, @priority, @stage, @machine_id, @description, @status, @created_by, @created_at)
`);
const now = new Date();
const maint = insertedUsers['maintenance'];
insertTicket.run({ ticket_no: 'MT-2041', title: 'Hydraulic Leak',  priority: 'HIGH', stage: 'Paint Shop',   machine_id: 'HYD-02', description: 'Hydraulic oil leak from main cylinder', status: 'open',        created_by: maint, created_at: new Date(now - 12 * 60000).toISOString() });
insertTicket.run({ ticket_no: 'MT-2042', title: 'Motor Jam',       priority: 'MED',  stage: 'Welding',      machine_id: 'MOT-07', description: 'Motor making noise and slowing down',   status: 'in_progress', created_by: maint, created_at: new Date(now - 38 * 60000).toISOString() });
insertTicket.run({ ticket_no: 'MT-2043', title: 'No Power',        priority: 'LOW',  stage: 'CKD',          machine_id: 'ELE-01', description: 'Socket panel dead in CKD bay 3',        status: 'open',        created_by: maint, created_at: new Date(now - 72 * 60000).toISOString() });
insertTicket.run({ ticket_no: 'MT-2044', title: 'Belt Snap',       priority: 'MED',  stage: 'Shot Blasting',machine_id: 'BLT-03', description: 'Drive belt on conveyor snapped',        status: 'open',        created_by: maint, created_at: new Date(now - 125 * 60000).toISOString() });

// Seed scrap logs
const insertScrap = db.prepare(`
  INSERT INTO scrap_logs (scrap_type, estimated_weight, yard, status, logged_by, created_at)
  VALUES (@scrap_type, @estimated_weight, @yard, @status, @logged_by, @created_at)
`);
const store = insertedUsers['store'];
insertScrap.run({ scrap_type: 'MS Scrap',  estimated_weight: 120, yard: 'Yard-1', status: 'pending',    logged_by: store, created_at: new Date(now - 2 * 3600000).toISOString() });
insertScrap.run({ scrap_type: 'Mixed',     estimated_weight: 60,  yard: 'Yard-2', status: 'pending',    logged_by: store, created_at: new Date(now - 3 * 3600000).toISOString() });
insertScrap.run({ scrap_type: 'SS Scrap',  estimated_weight: 40,  yard: 'Yard-1', status: 'dispatched', logged_by: store, created_at: new Date(now - 5 * 3600000).toISOString() });

// Seed tasks
const insertTask = db.prepare(`
  INSERT INTO tasks (title, description, priority, module_ref, assigned_role, status, due_date)
  VALUES (@title, @description, @priority, @module_ref, @assigned_role, @status, @due_date)
`);
const today = new Date().toISOString().split('T')[0];
insertTask.run({ title: 'Close MT-2041',              description: 'Upload photo proof',         priority: 'High', module_ref: 'maintenance:MT-2041', assigned_role: 'maintenance',  status: 'pending', due_date: today });
insertTask.run({ title: 'Complete Pre-PDI',            description: 'WO-1832 gate form',          priority: 'Med',  module_ref: 'quality:pre_pdi',     assigned_role: 'quality',      status: 'pending', due_date: today });
insertTask.run({ title: 'Record PHD water reading',    description: 'Meter scan',                 priority: 'Low',  module_ref: 'production',          assigned_role: 'production',   status: 'pending', due_date: today });
insertTask.run({ title: 'Dispatch mixed scrap',        description: 'Vendor invoice attach',      priority: 'Med',  module_ref: 'store:scrap',         assigned_role: 'store',        status: 'pending', due_date: today });

// Seed incidents
const insertIncident = db.prepare(`
  INSERT INTO incidents (title, description, incident_type, stage, severity, reported_by, status, created_at)
  VALUES (@title, @description, @incident_type, @stage, @severity, @reported_by, @status, @created_at)
`);
const safety = insertedUsers['safety_hr'];
insertIncident.run({ title: 'Chemical Spill',      description: 'Paint thinner spill near booth exit', incident_type: 'hazard',    stage: 'Paint Shop',   severity: 'HIGH', reported_by: safety, status: 'investigating', created_at: new Date(now - 4 * 3600000).toISOString() });
insertIncident.run({ title: 'Slip Near Welding',   description: 'Water on floor near welding bay',    incident_type: 'near_miss', stage: 'Welding',      severity: 'MED',  reported_by: safety, status: 'open',          created_at: new Date(now - 6 * 3600000).toISOString() });

console.log('Seeding complete.');
console.log('\nDemo credentials:');
console.log('  Admin:        ADM001 / PIN: 1234');
console.log('  Line Manager: LM001  / PIN: 1111');
console.log('  Production:   PRD001 / PIN: 2222');
console.log('  Quality:      QLT001 / PIN: 3333');
console.log('  Maintenance:  MNT001 / PIN: 4444');
console.log('  Store:        STR001 / PIN: 5555');
console.log('  Safety/HR:    SHR001 / PIN: 6666');
