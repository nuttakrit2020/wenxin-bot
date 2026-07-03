require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/db'); // Initialize DB on startup

const app = express();
const port = process.env.PORT || 3000;

const path = require('path');
app.use(cors());

// Serve static files for audio
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Webhook route (must be mounted before generic express.json middleware)
const webhookRouter = require('./routes/webhook');
app.use('/webhook', webhookRouter);
app.use('/', webhookRouter); // Fallback if user forgets /webhook

// Start server
const { startScheduler } = require('./services/scheduler');
const server = app.listen(port, () => {
  console.log(`\n🚀 ═══════════════════════════════════════════`);
  console.log(`🚀  LINE Roleplay Translator พร้อมทำงาน!`);
  console.log(`🚀  Server:   http://localhost:${port}`);
  console.log(`🚀  Webhook:  http://localhost:${port}/webhook`);
  console.log(`🚀 ═══════════════════════════════════════════\n`);
  
  // Start auto-greeting scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing server...');
  server.close(() => {
    console.log('Server closed.');
    db.close();
    process.exit(0);
  });
});
