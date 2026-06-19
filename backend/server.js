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
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hangman';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  // Don't exit on connection error - allow retries
});

// Database connection health check middleware
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection is currently unavailable. Please ensure MONGODB_URI environment variable is configured in Vercel settings.'
    });
  }
  next();
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
