require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Disable Mongoose command buffering globally to prevent 10000ms buffering timeouts
mongoose.set('bufferCommands', false);

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
const isDemoMode = !mongoUri || mongoUri.includes('abcde.mongodb.net') || mongoUri.includes('placeholder') || mongoUri.includes('dummy') || mongoUri.trim() === '';

if (isDemoMode) {
  console.log('--------------------------------------------------');
  console.log('WARNING: MONGODB_URI is not set or placeholder!');
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
      serverSelectionTimeoutMS: 2000, // Fail fast after 2s instead of hanging for 10s
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
    console.error('Initial MongoDB Connection Error (switching to Smart Fallback):', err.message);
  });
}

// Database connection health check middleware
const checkDbConnection = async (req, res, next) => {
  if (isDemoMode) {
    return next();
  }

  try {
    await connectDb();
    next();
  } catch (err) {
    console.warn('Database connection unavailable, switching to Smart In-Memory Fallback:', err.message);
    next(); // Continue request using Smart Model Fallback
  }
};

// Routes
app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/auth', checkDbConnection, authRoutes);
app.use('/api/game', checkDbConnection, gameRoutes);
app.use('/game', checkDbConnection, gameRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', readyState: mongoose.connection.readyState });
});

// Serve static frontend build if available
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/game') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
