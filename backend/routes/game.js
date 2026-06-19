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

// Predefined words list
const WORDS = [
  'PYTHON',
  'JAVASCRIPT',
  'REACT',
  'MONGODB',
  'EXPRESS',
  'NODEJS',
  'FRONTEND',
  'BACKEND',
  'DATABASE',
  'AUTHENTICATION'
];

// Start new game
router.post('/start', auth, async (req, res) => {
  try {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    
    const game = new Game({
      user: req.user._id,
      word: word,
      guessedLetters: [],
      incorrectGuesses: 0,
      maxIncorrectGuesses: 6,
      status: 'active'
    });
    
    await game.save();
    
    res.json({
      gameId: game._id,
      wordLength: word.length,
      maxIncorrectGuesses: game.maxIncorrectGuesses,
      guessedLetters: game.guessedLetters,
      incorrectGuesses: game.incorrectGuesses,
      status: game.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Make a guess
router.post('/guess', auth, async (req, res) => {
  try {
    const { gameId, letter } = req.body;
    
    if (!letter || letter.length !== 1 || !/^[A-Z]$/.test(letter.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid letter' });
    }
    
    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is already finished' });
    }
    
    const upperLetter = letter.toUpperCase();
    
    if (game.guessedLetters.includes(upperLetter)) {
      return res.status(400).json({ message: 'Letter already guessed' });
    }
    
    game.guessedLetters.push(upperLetter);
    
    if (!game.word.includes(upperLetter)) {
      game.incorrectGuesses += 1;
    }
    
    // Check win condition
    const wordLetters = game.word.split('');
    const allGuessed = wordLetters.every(l => game.guessedLetters.includes(l));
    
    if (allGuessed) {
      game.status = 'won';
      game.completedAt = new Date();
      
      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { gamesPlayed: 1, gamesWon: 1 }
      });
    } else if (game.incorrectGuesses >= game.maxIncorrectGuesses) {
      game.status = 'lost';
      game.completedAt = new Date();
      
      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { gamesPlayed: 1 }
      });
    }
    
    await game.save();
    
    // Get current word state (reveal guessed letters, hide others)
    const wordState = game.word.split('').map(l => 
      game.guessedLetters.includes(l) ? l : '_'
    ).join(' ');
    
    res.json({
      wordState,
      guessedLetters: game.guessedLetters,
      incorrectGuesses: game.incorrectGuesses,
      maxIncorrectGuesses: game.maxIncorrectGuesses,
      status: game.status,
      word: game.status !== 'active' ? game.word : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get AI hint
router.post('/hint', auth, async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is already finished' });
    }
    
    const ai = getOpenAI();
    let hint;
    
    if (!ai) {
      // Fallback hint based on the actual word when OpenAI is not configured
      const word = game.word;
      const unguessedLetters = word.split('').filter(l => !game.guessedLetters.includes(l));
      
      // Generate a simple hint based on the word
      const hints = [
        `The word starts with "${word[0]}"`,
        `The word has ${word.length} letters`,
        `The word ends with "${word[word.length - 1]}"`,
        `Try guessing a vowel`,
        `Think about programming terms`,
        `This word is related to technology`
      ];
      
      // Select a hint that doesn't reveal too much
      hint = hints[Math.floor(Math.random() * hints.length)];
    } else {
      // Use OpenAI for intelligent hints
      const wordState = game.word.split('').map(l => 
        game.guessedLetters.includes(l) ? l : '_'
      ).join(' ');
      
      const prompt = `I'm playing Hangman. The word has ${game.word.length} letters. Current state: "${wordState}". Guessed letters: ${game.guessedLetters.join(', ')}. Incorrect guesses: ${game.incorrectGuesses}/${game.maxIncorrectGuesses}. Give me a helpful hint without revealing the word directly. Keep it brief (1-2 sentences).`;
      
      const completion = await ai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for the Hangman game. Provide subtle hints without giving away the word.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100
      });
      
      hint = completion.choices[0].message.content;
    }
    
    game.aiHints.push(hint);
    await game.save();
    
    res.json({ hint });
  } catch (error) {
    console.error('Hint Error:', error);
    
    // Fallback hint on error
    const game = await Game.findOne({ _id: req.body.gameId, user: req.user._id });
    if (game) {
      const fallbackHint = "Think about technology and programming terms. The word is related to software development.";
      game.aiHints.push(fallbackHint);
      await game.save();
      res.json({ hint: fallbackHint });
    } else {
      res.status(500).json({ message: 'Failed to get hint', error: error.message });
    }
  }
});

// Get game history
router.get('/history', auth, async (req, res) => {
  try {
    const games = await Game.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({ games });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
