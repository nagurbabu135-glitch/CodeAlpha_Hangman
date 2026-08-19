const mongoose = require('mongoose');
const mockDb = require('./mockDb');

// Disable Mongoose command buffering globally
mongoose.set('bufferCommands', false);

const gameSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  word: {
    type: String,
    required: true
  },
  guessedLetters: {
    type: [String],
    default: []
  },
  incorrectGuesses: {
    type: Number,
    default: 0
  },
  maxIncorrectGuesses: {
    type: Number,
    default: 6
  },
  status: {
    type: String,
    enum: ['active', 'won', 'lost'],
    default: 'active'
  },
  aiHints: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

const RealGame = mongoose.model('Game', gameSchema);

class SmartGame {
  constructor(data) {
    if (mongoose.connection.readyState === 1) {
      return new RealGame(data);
    } else {
      return new mockDb.Game(data);
    }
  }

  static async findOne(query) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await RealGame.findOne(query);
      } catch (err) {
        console.warn('[DB Fallback] RealGame.findOne query failed, switching to mockDb:', err.message);
        return await mockDb.Game.findOne(query);
      }
    }
    return await mockDb.Game.findOne(query);
  }

  static find(query) {
    if (mongoose.connection.readyState === 1) {
      try {
        return RealGame.find(query);
      } catch (err) {
        console.warn('[DB Fallback] RealGame.find failed, switching to mockDb:', err.message);
        return mockDb.Game.find(query);
      }
    }
    return mockDb.Game.find(query);
  }

  static async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await RealGame.findById(id);
      } catch (err) {
        console.warn('[DB Fallback] RealGame.findById failed, switching to mockDb:', err.message);
        return await mockDb.Game.findOne({ _id: id });
      }
    }
    return await mockDb.Game.findOne({ _id: id });
  }
}

module.exports = SmartGame;
