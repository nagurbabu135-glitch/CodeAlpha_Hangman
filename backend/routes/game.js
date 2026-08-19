const express = require('express');
const OpenAI = require('openai');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Lazy initialize OpenAI only when needed
let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// Predefined words list by category
const WORD_DATABASE = {
  "Programming & Tech": ["PYTHON", "JAVASCRIPT", "REACT", "MONGODB", "EXPRESS", "NODEJS", "FRONTEND", "BACKEND", "DATABASE", "AUTHENTICATION", "COMPILER", "ALGORITHM"],
  "Movies & TV": ["INCEPTION", "AVENGERS", "GLADIATOR", "TITANIC", "INTERSTELLAR", "MATRIX"],
  "Science & Nature": ["QUANTUM", "GRAVITY", "MOLECULE", "NEBULA", "EVOLUTION", "ELECTRON"],
  "World History": ["PARTHENON", "RENAISSANCE", "PHARAOH", "EMPIRE", "COLOSSEUM"],
  "Animals": ["DOLPHIN", "CHEETAH", "FLAMINGO", "KANGAROO", "PENGUIN"],
  "Food & Culinary": ["SPAGHETTI", "CROISSANT", "CHOCOLATE", "ESPRESSO", "GUACAMOLE"]
};

// Helper to pick random word
function getRandomWord(category) {
  const catWords = WORD_DATABASE[category] || WORD_DATABASE["Programming & Tech"];
  return catWords[Math.floor(Math.random() * catWords.length)];
}

// Start new game
router.post(['/start', '/new'], auth, async (req, res) => {
  try {
    const category = req.body.category || "Programming & Tech";
    const difficulty = (req.body.difficulty || "medium").toLowerCase();
    
    let maxAttempts = 6;
    if (difficulty === 'easy') maxAttempts = 8;
    if (difficulty === 'hard') maxAttempts = 5;

    const word = getRandomWord(category);
    
    const game = new Game({
      user: req.user._id,
      word: word,
      guessedLetters: [],
      incorrectGuesses: 0,
      maxIncorrectGuesses: maxAttempts,
      status: 'active'
    });
    
    await game.save();

    const masked_word = Array(word.length).fill('_').join(' ');
    
    res.json({
      game_id: game._id,
      gameId: game._id,
      word_length: word.length,
      category: category,
      difficulty: difficulty,
      max_attempts: maxAttempts,
      attempts_remaining: maxAttempts,
      stage: 0,
      masked_word: masked_word,
      wordState: masked_word,
      guessed_letters: [],
      status: 'IN_PROGRESS'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Make a guess
router.post('/guess', auth, async (req, res) => {
  try {
    const gameId = req.body.game_id || req.body.gameId;
    const letter = (req.body.letter || '').toUpperCase();
    
    if (!gameId) {
      return res.status(400).json({ message: 'Game ID is required' });
    }
    
    if (!letter || letter.length !== 1 || !/^[A-Z]$/.test(letter)) {
      return res.status(400).json({ message: 'Invalid letter' });
    }
    
    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is already finished' });
    }
    
    if (game.guessedLetters.includes(letter)) {
      return res.status(400).json({ message: 'Letter already guessed' });
    }
    
    game.guessedLetters.push(letter);
    const is_correct = game.word.includes(letter);
    
    if (!is_correct) {
      game.incorrectGuesses += 1;
    }
    
    // Check win / lose condition
    const wordLetters = game.word.split('');
    const allGuessed = wordLetters.every(l => game.guessedLetters.includes(l));
    
    let gameStatus = 'IN_PROGRESS';
    if (allGuessed) {
      game.status = 'won';
      gameStatus = 'WON';
      game.completedAt = new Date();
      await User.findByIdAndUpdate(req.user._id, { $inc: { gamesPlayed: 1, gamesWon: 1 } });
    } else if (game.incorrectGuesses >= game.maxIncorrectGuesses) {
      game.status = 'lost';
      gameStatus = 'LOST';
      game.completedAt = new Date();
      await User.findByIdAndUpdate(req.user._id, { $inc: { gamesPlayed: 1 } });
    }
    
    await game.save();
    
    const masked_word = game.word.split('').map(l => 
      game.guessedLetters.includes(l) ? l : '_'
    ).join(' ');
    
    const attempts_remaining = Math.max(0, game.maxIncorrectGuesses - game.incorrectGuesses);

    res.json({
      game_id: game._id,
      gameId: game._id,
      letter: letter,
      is_correct: is_correct,
      masked_word: masked_word,
      wordState: masked_word,
      guessed_letters: game.guessedLetters,
      attempts_remaining: attempts_remaining,
      stage: game.incorrectGuesses,
      max_attempts: game.maxIncorrectGuesses,
      status: gameStatus,
      secret_word: game.status !== 'active' ? game.word : undefined,
      word: game.status !== 'active' ? game.word : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get AI hint
router.post('/hint', auth, async (req, res) => {
  try {
    const gameId = req.body.game_id || req.body.gameId;
    
    if (!gameId) {
      return res.status(400).json({ message: 'Game ID is required' });
    }
    
    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    const ai = getOpenAI();
    let hint;
    
    if (!ai) {
      const word = game.word;
      const unguessed = word.split('').filter(l => !game.guessedLetters.includes(l));
      const hints = [
        `The word has ${word.length} letters`,
        `Starts with "${word[0]}"`,
        `Ends with "${word[word.length - 1]}"`,
        `Contains letter "${word[Math.floor(word.length / 2)]}"`
      ];
      hint = hints[Math.floor(Math.random() * hints.length)];
    } else {
      const prompt = `Give a helpful 1-sentence hint for guessing the word "${game.word}" in a Hangman game without giving away the exact word.`;
      const completion = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 60,
      });
      hint = completion.choices[0].message.content.trim();
    }
    
    res.json({ hint: hint });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
