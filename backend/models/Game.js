const mongoose = require('mongoose');

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

module.exports = mongoose.model('Game', gameSchema);
