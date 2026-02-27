# Utkal Action Hub — Operations App

A mobile-first full-stack web application for Utkal Auto Coach factory operations.

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS (PWA, mobile-first)
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Auth**: PIN-based login + JWT tokens
- **RBAC**: Role-based access control (7 roles)

## Demo Credentials

| Role         | Employee ID | PIN  |
|--------------|-------------|------|
| Admin/IT     | ADM001      | 1234 |
| Line Manager | LM001       | 1111 |
| Production   | PRD001      | 2222 |
| Quality      | QLT001      | 3333 |
| Maintenance  | MNT001      | 4444 |
| Store        | STR001      | 5555 |
| Safety/HR    | SHR001      | 6666 |

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Seed the database with demo data
npm run seed

# 3. Run both backend + frontend in development
npm run dev
```

Backend runs on: http://localhost:3001
Frontend runs on: http://localhost:5173

## Production Deployment

```bash
# Build frontend
npm run build

# Start production server (serves frontend + API)
npm start
```

The production server runs on port 3001 and serves the React app.

## App Features

| Module           | Role Access                              |
|------------------|------------------------------------------|
| Login (PIN)      | All                                      |
| Shift + Stage    | All                                      |
| Maintenance      | Maintenance, Line Manager, Admin         |
| PM Checklist     | Maintenance, Admin                       |
| Quality Gates    | Quality, Production, Line Manager, Admin |
| Work Orders      | Store, Line Manager, Admin               |
| Material Issue   | Store, Line Manager, Admin               |
| Scrap Log        | Store, Line Manager, Admin               |
| Tasks            | All (filtered by role)                   |
| Incidents        | All                                      |
| User Management  | Admin only                               |

## Project Structure

```
utkal-auto-coach/
├── backend/
│   ├── src/
│   │   ├── db/          # SQLite schema + seed
│   │   ├── middleware/  # JWT auth + RBAC
│   │   ├── routes/      # API routes
│   │   └── server.js    # Express app
│   └── data/            # SQLite database file
└── frontend/
    └── src/
        ├── api/         # Axios client
        ├── components/  # Shared UI components
        ├── context/     # Auth context
        └── pages/       # All app screens
```

## API Endpoints

```
POST   /api/auth/login                  # PIN login
GET    /api/auth/me                     # Current user
POST   /api/shifts/start                # Start shift
PATCH  /api/shifts/:id/end              # End shift
GET    /api/maintenance/tickets         # List tickets
POST   /api/maintenance/tickets         # Create ticket
PATCH  /api/maintenance/tickets/:id     # Update/close ticket
GET    /api/maintenance/pm              # PM groups/checklists
POST   /api/maintenance/pm              # Submit PM
GET    /api/quality/gates               # Gate list
POST   /api/quality/gates               # Submit gate result
GET    /api/store/work-orders           # List WOs
POST   /api/store/issues                # Issue materials
GET    /api/scrap                       # Scrap log
POST   /api/scrap                       # Add scrap
PATCH  /api/scrap/:id/dispatch          # Dispatch scrap
GET    /api/tasks                       # Task list
PATCH  /api/tasks/:id                   # Update task
GET    /api/incidents                   # Incident list
POST   /api/incidents                   # Report incident
GET    /api/users                       # User list (admin)
POST   /api/users                       # Create user (admin)
PATCH  /api/users/:id                   # Edit user (admin)
```
