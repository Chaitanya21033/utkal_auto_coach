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
  DELETE FROM meter_readings;
  DELETE FROM production_logs;
  DELETE FROM emission_factors;
  DELETE FROM app_config;
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

// ── Emission factors per production stage ─────────────────────────────────────
// electricity_kwh_per_unit: estimated kWh consumed per tipper body unit passing through this stage
// water_kl_per_unit:        estimated KL water used per unit in this stage
// direct_co2_kg_per_unit:   Scope 1 direct process emissions (VOCs, welding fumes, etc.) per unit
const insertFactor = db.prepare(`
  INSERT INTO emission_factors (stage, electricity_kwh_per_unit, water_kl_per_unit, direct_co2_kg_per_unit, notes)
  VALUES (@stage, @elec, @water, @co2, @notes)
`);
[
  { stage: 'CKD',            elec: 50,  water: 0.2,  co2: 5,  notes: 'Cutting, drilling, deburring' },
  { stage: 'Shot Blasting',  elec: 35,  water: 0.05, co2: 15, notes: 'Abrasive blasting; steel grit particulates' },
  { stage: 'Welding',        elec: 45,  water: 0.1,  co2: 20, notes: 'MIG/MAG welding fumes + shielding gas' },
  { stage: 'Paint Shop',     elec: 100, water: 2.5,  co2: 30, notes: 'Spray painting VOC emissions; booth exhaust' },
  { stage: 'Final Assembly', elec: 25,  water: 0.1,  co2: 2,  notes: 'Mostly manual torquing + fitment' },
  { stage: 'Finished Goods', elec: 5,   water: 0.0,  co2: 0,  notes: 'Inventory holding — minimal energy' },
].forEach(r => insertFactor.run(r));

// ── App config (CO2 emission factors) ─────────────────────────────────────────
const insertConfig = db.prepare(`
  INSERT INTO app_config (key, value, description) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
insertConfig.run('grid_co2_factor', '0.82',  'kg CO2 per kWh — India CEA 2023-24 national grid');
insertConfig.run('water_co2_factor', '0.344', 'kg CO2 per KL — water treatment & distribution');
insertConfig.run('waste_co2_factor', '0.5',   'kg CO2 per kg scrap/waste — landfill equivalent');

// ── Demo meter readings (past 30 days, bi-weekly) ─────────────────────────────
// Simulates realistic meter readings so the ESG dashboard has data to show
const insertMeter = db.prepare(`
  INSERT INTO meter_readings (meter_type, meter_id, reading_value, unit, consumption_delta, recorded_by, recorded_at)
  VALUES (@meter_type, @meter_id, @reading_value, @unit, @delta, @recorded_by, @recorded_at)
`);
const lm = insertedUsers['line_manager'];

// Electricity meter – starting at 48,000 kWh, ~1,200 kWh consumed every 3 days
let elecBase = 48000;
for (let i = 29; i >= 0; i -= 3) {
  const delta = 1100 + Math.round(Math.random() * 300);
  const ts = new Date(now - i * 86400000).toISOString();
  insertMeter.run({ meter_type: 'electricity', meter_id: 'MAIN-ELEC', reading_value: elecBase, unit: 'kWh', delta: i === 29 ? null : delta, recorded_by: lm, recorded_at: ts });
  elecBase += delta;
}

// Water meter – starting at 3,200 KL, ~30 KL consumed every 3 days
let waterBase = 3200;
for (let i = 29; i >= 0; i -= 3) {
  const delta = 25 + Math.round(Math.random() * 15);
  const ts = new Date(now - i * 86400000).toISOString();
  insertMeter.run({ meter_type: 'water', meter_id: 'MAIN-WATER', reading_value: waterBase, unit: 'KL', delta: i === 29 ? null : delta, recorded_by: lm, recorded_at: ts });
  waterBase += delta;
}

// ── Demo production logs (past 14 days) ───────────────────────────────────────
const insertProdLog = db.prepare(`
  INSERT INTO production_logs
    (log_date, shift_type, stage_entries, waste_kg, est_electricity_kwh, est_water_kl, direct_co2_kg, logged_by, logged_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const GRID = 0.82;
const EFAC = {
  'CKD':            { elec: 50,  water: 0.2,  co2: 5  },
  'Shot Blasting':  { elec: 35,  water: 0.05, co2: 15 },
  'Welding':        { elec: 45,  water: 0.1,  co2: 20 },
  'Paint Shop':     { elec: 100, water: 2.5,  co2: 30 },
  'Final Assembly': { elec: 25,  water: 0.1,  co2: 2  },
  'Finished Goods': { elec: 5,   water: 0.0,  co2: 0  },
};
for (let i = 13; i >= 0; i--) {
  const logDate = new Date(now - i * 86400000).toISOString().split('T')[0];
  const entries = [
    { stage: 'CKD',            units_in_stage: 4 + Math.round(Math.random() * 3) },
    { stage: 'Shot Blasting',  units_in_stage: 3 + Math.round(Math.random() * 2) },
    { stage: 'Welding',        units_in_stage: 5 + Math.round(Math.random() * 3) },
    { stage: 'Paint Shop',     units_in_stage: 4 + Math.round(Math.random() * 2) },
    { stage: 'Final Assembly', units_in_stage: 2 + Math.round(Math.random() * 2) },
    { stage: 'Finished Goods', units_in_stage: 6 + Math.round(Math.random() * 4) },
  ];
  const waste = 100 + Math.round(Math.random() * 80);
  let elec = 0, water = 0, co2 = 0;
  for (const e of entries) {
    const f = EFAC[e.stage] || {};
    elec  += e.units_in_stage * (f.elec  || 0);
    water += e.units_in_stage * (f.water || 0);
    co2   += e.units_in_stage * (f.co2   || 0);
  }
  insertProdLog.run(
    logDate, i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
    JSON.stringify(entries), waste,
    Math.round(elec * 10) / 10, Math.round(water * 100) / 100, Math.round(co2 * 10) / 10,
    lm, new Date(now - i * 86400000 + 57600000).toISOString()
  );
}

console.log('Seeding complete.');
console.log('\nDemo credentials:');
console.log('  Admin:        ADM001 / PIN: 1234');
console.log('  Line Manager: LM001  / PIN: 1111');
console.log('  Production:   PRD001 / PIN: 2222');
console.log('  Quality:      QLT001 / PIN: 3333');
console.log('  Maintenance:  MNT001 / PIN: 4444');
console.log('  Store:        STR001 / PIN: 5555');
console.log('  Safety/HR:    SHR001 / PIN: 6666');
