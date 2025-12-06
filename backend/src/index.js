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

  const corsOptions = {
    origin: [
      "https://mailam-enginering-college-test.netlify.app",
      "http://localhost:5173",
      "http://localhost:8080"
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.options('/*', (req, res) => res.sendStatus(200));

  // Security & Performance middleware
  app.use(helmet());
  app.use(compression());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret';
  const isProd = String(process.env.NODE_ENV).toLowerCase() === 'production';

  // Session setup
  app.use(session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  }));

  // Debug Middleware (Must be AFTER session)
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    console.log(`[DEBUG] Origin: ${req.headers.origin}`);
    console.log(`[DEBUG] Protocol: ${req.protocol} | Secure: ${req.secure}`);
    console.log(`[DEBUG] Cookies: ${req.headers.cookie ? 'Present' : 'Missing'}`);
    console.log(`[DEBUG] Session ID: ${req.sessionID}`);
    if (req.session) {
      console.log(`[DEBUG] Session Data:`, JSON.stringify({ userId: req.session.userId, type: req.session.userType }));
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