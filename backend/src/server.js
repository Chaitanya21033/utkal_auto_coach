require('./db'); // init DB
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// API routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/shifts',      require('./routes/shifts'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/quality',     require('./routes/quality'));
app.use('/api/store',       require('./routes/store'));
app.use('/api/scrap',       require('./routes/scrap'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/incidents',   require('./routes/incidents'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/meters',           require('./routes/meters'));
app.use('/api/production-log',   require('./routes/production-log'));
app.use('/api/emission-factors', require('./routes/emission-factors'));
app.use('/api/esg',              require('./routes/esg'));

// Serve frontend build in production
const FRONTEND_BUILD = path.join(__dirname, '../../frontend/dist');
app.use(express.static(FRONTEND_BUILD));
app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_BUILD, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: 'Utkal Action Hub API Running', version: '1.0.0' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Utkal Action Hub API running on http://localhost:${PORT}`);
});

module.exports = app;
