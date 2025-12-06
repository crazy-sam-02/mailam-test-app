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

  // Move CORS to the top
  // Allow multiple frontend origins (comma-separated)
  const envOrigins = (process.env.FRONTEND_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:8080',
    'https://mailam-enginering-college-test.netlify.app'
  ];
  const ORIGINS = [...new Set([...envOrigins, ...defaultOrigins])];

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }

      if (ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked CORS origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Debug Middleware
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    console.log(`[DEBUG] Cookies: ${req.headers.cookie ? 'Present' : 'Missing'}`);
    console.log(`[DEBUG] Session ID: ${req.sessionID}`);
    if (req.session && req.session.user) {
      console.log(`[DEBUG] Session User: ${req.session.user.email}`);
    } else {
      console.log(`[DEBUG] No active session user.`);
    }
    next();
  });

  // Security & Performance middleware
  app.use(helmet());
  app.use(compression());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.set('trust proxy', 1);
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret';
  app.use(session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Must be 'none' for cross-site cookie
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }
  }));

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