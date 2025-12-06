// Server entry point - restart trigger
const express = require('express');
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

  // Build dynamic allowed origins list from env and sensible defaults
  const defaultOrigins = [
    'https://mailam-enginering-college-test.netlify.app',
    'http://localhost:5173',
    'http://localhost:8080'
  ];
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  const originFn = (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser or same-origin
    const isAllowed = allowedOrigins.includes(origin)
      || /https:\/\/.+\.netlify\.app$/.test(origin)
      || /https:\/\/.+\.onrender\.com$/.test(origin)
      || /^http:\/\/localhost:\d{2,5}$/.test(origin);
    callback(null, isAllowed);
  };

  const corsOptions = {
    origin: originFn,
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Length'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Security & Performance middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
  app.use(compression());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Debug Middleware
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    console.log(`[DEBUG] Origin: ${req.headers.origin}`);
    console.log(`[DEBUG] Protocol: ${req.protocol} | Secure: ${req.secure}`);
    console.log(`[DEBUG] Auth: ${req.headers.authorization ? 'Bearer' : 'None'}`);
    next();
  });

  // routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tests', require('./routes/tests'));
  app.use('/api/attempts', require('./routes/attempts'));
  // sync endpoints for offline clients
  app.use('/api/sync', require('./routes/sync'));

  // CORS diagnostic endpoint
  app.get('/api/cors-check', (req, res) => {
    res.json({
      ok: true,
      originReceived: req.headers.origin || null,
      allowedOrigins,
    });
  });

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