require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4000;

async function main() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.set('trust proxy', 1);
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret';
  app.use(session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl:"mongodb://127.0.0.1:27017/scholar_shield" }),
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }
  }));


async function start() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/scholar_shield");
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
}
start();



  // Allow multiple frontend origins (comma-separated)
  const ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:8080')
    .split(',')
    .map(s => s.trim());
  const corsOptions = {
    origin(origin, callback) {
      // allow same-origin or non-browser requests with no origin
      if (!origin || ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tests', require('./routes/tests'));
  app.use('/api/attempts', require('./routes/attempts'));

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
