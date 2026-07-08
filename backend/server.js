// server.js
require('dotenv').config();
console.log(process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const worklogRoutes = require('./routes/worklogRoutes');
const reportRoutes = require('./routes/reportRoutes');
const assistantRoutes = require('./routes/assistantRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AXIOMATE backend' }));

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/assistant', assistantRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀  AXIOMATE backend running on http://localhost:${PORT}`);
  await testConnection();
});
