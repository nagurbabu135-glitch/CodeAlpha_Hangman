const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to stringify ID
const strId = (id) => id ? id.toString() : '';

// Register Endpoint
router.post('/register', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with that username or email already exists.' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ userId: strId(user._id), user_id: strId(user._id), username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: strId(user._id),
        username: user.username,
        email: user.email,
        stats: { games_played: user.gamesPlayed || 0, games_won: user.gamesWon || 0 }
      }
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Server error during registration.', details: error.message });
  }
});

// Login Endpoint (Supports username or email)
router.post('/login', async (req, res) => {
  try {
    const identifier = (req.body.username_or_email || req.body.email || req.body.username || '').trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier.toLowerCase() },
        { username_or_email: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    const token = jwt.sign({ userId: strId(user._id), user_id: strId(user._id), username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: strId(user._id),
        username: user.username,
        email: user.email,
        stats: { games_played: user.gamesPlayed || 0, games_won: user.gamesWon || 0 }
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login.', details: error.message });
  }
});

// Get User Profile / Session Verification
router.get(['/me', '/profile'], auth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    res.json({
      user: {
        id: strId(user._id),
        username: user.username,
        email: user.email,
        stats: user.stats || { games_played: user.gamesPlayed || 0, games_won: user.gamesWon || 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user profile.' });
  }
});

module.exports = router;
