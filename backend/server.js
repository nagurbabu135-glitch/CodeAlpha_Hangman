require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Set default JWT_SECRET for development if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_secret_key_change_in_production_12345678';
  console.warn('WARNING: Using default JWT_SECRET for development. Change this in production!');
}

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const mongoUri = process.env.MONGODB_URI;
const isDemoMode = !mongoUri;

if (isDemoMode) {
  console.log('--------------------------------------------------');
  console.log('WARNING: MONGODB_URI is not set!');
  console.log('Running in In-Memory Demo Mode.');
  console.log('Data will reset when the server restarts/spins down.');
  console.log('--------------------------------------------------');
}

// Cache connection globally to prevent multiple connections in serverless environments
let cachedDb = global.mongooseCachedDb || null;
let cachedPromise = global.mongooseCachedPromise || null;

async function connectDb() {
  if (isDemoMode) {
    return null;
  }

  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const uri = mongoUri;

  if (!cachedPromise) {
    console.log('Connecting to MongoDB...');
    cachedPromise = mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    }).then((m) => {
      console.log('MongoDB Connected successfully');
      cachedDb = m;
      global.mongooseCachedDb = m;
      return m;
    }).catch(err => {
      cachedPromise = null;
      global.mongooseCachedPromise = null;
      throw err;
    });
    global.mongooseCachedPromise = cachedPromise;
  }

  return cachedPromise;
}

// Start connection attempt asynchronously if not in demo mode
if (!isDemoMode) {
  connectDb().catch(err => {
    console.error('Initial MongoDB Connection Error:', err);
  });
}

// Database connection health check middleware
const checkDbConnection = async (req, res, next) => {
  if (isDemoMode) {
    return next(); // Skip DB checks and allow requests in Demo Mode
  }

  try {
    await connectDb();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err);
    return res.status(503).json({
      message: 'Database connection is currently unavailable. Please ensure MONGODB_URI environment variable is configured in Vercel settings.',
      error: err.message
    });
  }
};

// Routes
app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/api/game', checkDbConnection, gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
