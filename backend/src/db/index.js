const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/utkal.db');
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('line_manager','production','quality','maintenance','store','safety_hr','admin')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    shift_type TEXT NOT NULL CHECK(shift_type IN ('A','B','C')),
    stage TEXT NOT NULL,
    start_time TEXT DEFAULT (datetime('now')),
    end_time TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','ended')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('HIGH','MED','LOW')),
    stage TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    description TEXT,
    root_cause TEXT,
    action_taken TEXT,
    spares_used TEXT,
    verified_by TEXT,
    photo_proof TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','closed')),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS pm_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_group TEXT NOT NULL,
    checklist_items TEXT NOT NULL,
    submitted_by INTEGER REFERENCES users(id),
    shift_id INTEGER REFERENCES shifts(id),
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quality_gate_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gate_type TEXT NOT NULL CHECK(gate_type IN ('rm_incoming','in_process','pre_pdi','fg_dispatch')),
    work_order_no TEXT,
    model TEXT,
    variant TEXT,
    checklist_items TEXT NOT NULL,
    result TEXT NOT NULL CHECK(result IN ('pass','hold')),
    notes TEXT,
    submitted_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_number TEXT UNIQUE NOT NULL,
    customer TEXT NOT NULL,
    type TEXT,
    due_offset INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','completed','cancelled')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS material_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER REFERENCES work_orders(id),
    work_order_no TEXT NOT NULL,
    materials TEXT NOT NULL,
    issued_by INTEGER REFERENCES users(id),
    issued_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scrap_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scrap_type TEXT NOT NULL CHECK(scrap_type IN ('MS Scrap','SS Scrap','Mixed','Hazardous')),
    estimated_weight REAL,
    yard TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','dispatched')),
    logged_by INTEGER REFERENCES users(id),
    dispatched_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK(priority IN ('High','Med','Low')),
    module_ref TEXT,
    assigned_to INTEGER REFERENCES users(id),
    assigned_role TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    incident_type TEXT NOT NULL CHECK(incident_type IN ('safety','near_miss','hazard','injury')),
    stage TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('HIGH','MED','LOW')),
    reported_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','closed')),
    created_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );
`);

module.exports = db;
