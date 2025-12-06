// Server entry point - restart trigger
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');
const dotenv = require('dotenv');


dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
connectDB();

async function main() {

  console.log('Starting server...');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  app.set('trust proxy', true); // Trust all proxies on Render

  // ... (CORS is already here)

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  // Explicit OPTIONS handler for preflight redundancy
  app.options('/*', (req, res) => res.sendStatus(200));

  // Security & Performance middleware
  // ...

  // ... (Session setup remains)

  // Debug Middleware (Must be AFTER session)
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    console.log(`[DEBUG] Origin: ${req.headers.origin}`);
    console.log(`[DEBUG] Protocol: ${req.protocol} | Secure: ${req.secure}`);
    console.log(`[DEBUG] Cookies: ${req.headers.cookie ? 'Present' : 'Missing'}`);
    console.log(`[DEBUG] Session ID: ${req.sessionID}`);
    if (req.session) {
      console.log(`[DEBUG] Session Data:`, JSON.stringify({ userId: req.session.userId, type: req.session.userType }));
    } else {
      console.log(`[DEBUG] Req.session is undefined`);
    }
    next();
  });

  // routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tests', require('./routes/tests'));
  app.use('/api/attempts', require('./routes/attempts'));
  // sync endpoints for offline clients
  app.use('/api/sync', require('./routes/sync'));

  // basic health
  app.get('/', (req, res) => res.send({ ok: true }));

  // error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

main().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});