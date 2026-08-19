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

// Comprehensive Word & Tailored Tip Database
const WORD_DATABASE = {
  "Programming & Tech": [
    { word: "PYTHON", hint: "A versatile high-level programming language named after a British comedy group.", definition: "Popular language known for clean syntax and data science." },
    { word: "MONGODB", hint: "Leading NoSQL document database storing data in JSON-like BSON.", definition: "Flexible document-based distributed database system." },
    { word: "JAVASCRIPT", hint: "The fundamental scripting language powering all modern web browsers.", definition: "Dynamic language driving front-end and back-end web apps." },
    { word: "REACT", hint: "Popular declarative UI component library created by Meta.", definition: "Frontend framework using virtual DOM and components." },
    { word: "EXPRESS", hint: "Fast, minimalist web application framework for Node.js.", definition: "Standard backend web framework for Node." },
    { word: "NODEJS", hint: "Event-driven JavaScript runtime built on Chrome's V8 engine.", definition: "Server-side JavaScript execution environment." },
    { word: "ALGORITHM", hint: "A step-by-step mathematical procedure to solve computational problems.", definition: "Rigorous finite sequence of instructions for calculation." },
    { word: "CYBERSECURITY", hint: "Defending systems, networks, and data from malicious digital attacks.", definition: "Practice of securing digital systems from cyber threats." },
    { word: "ASYNCHRONOUS", hint: "Non-blocking execution model allowing concurrent task processing.", definition: "Programming model operating independently of main flow." },
    { word: "MICROSERVICES", hint: "Architecture structuring apps as small, independent services.", definition: "Modular distributed system architectural pattern." },
    { word: "DOCKER", hint: "Containerization tool packaging applications with dependencies.", definition: "OS-level virtualization platform for lightweight containers." },
    { word: "KUBERNETES", hint: "Container orchestration platform automating deployment and scaling.", definition: "Open-source container management and scaling system." },
    { word: "TYPESCRIPT", hint: "Strongly typed language that compiles down to JavaScript.", definition: "Microsoft-developed typed superset of JavaScript." },
    { word: "BLOCKCHAIN", hint: "Decentralized immutable digital ledger secured by cryptography.", definition: "Distributed peer-to-peer transaction chain." }
  ],
  "Movies & TV": [
    { word: "INCEPTION", hint: "Mind-bending Nolan thriller involving dream-within-a-dream heists.", definition: "Film exploring subconscious dream infiltration and spinning tops." },
    { word: "AVENGERS", hint: "Earth's mightiest heroes team up against Thanos and cosmic threats.", definition: "Marvel superhero blockbuster assembly." },
    { word: "GLADIATOR", hint: "Spaniard general seeking vengeance against a corrupt Roman emperor.", definition: "Russell Crowe historical epic set in Roman arenas." },
    { word: "INTERSTELLAR", hint: "Explorers travel through a Saturn wormhole to find a new home.", definition: "Sci-fi masterpiece exploring black holes and space-time." },
    { word: "MATRIX", hint: "Red pill or blue pill? Cyberpunk rebellion against simulated AI.", definition: "Iconic sci-fi action film featuring Neo and Agent Smith." },
    { word: "OPPENHEIMER", hint: "Biographical epic about the physicist who developed the atomic bomb.", definition: "Christopher Nolan drama about the Manhattan Project." },
    { word: "PARASITE", hint: "Dark satire where a low-income family infiltrates a wealthy home.", definition: "Academy Award winning South Korean psychological thriller." },
    { word: "TITANIC", hint: "Romantic epic set aboard the ill-fated maiden voyage of 1912.", definition: "James Cameron maritime disaster drama starring Leo & Kate." },
    { word: "AVATAR", hint: "Disabled marine visits alien Pandora in an organic Na'vi body.", definition: "Sci-fi epic featuring blue Na'vi inhabitants of Pandora." },
    { word: "GODFATHER", hint: "Chronicle of the Corleone Italian-American mafia family dynasty.", definition: "Cinematic masterpiece directed by Francis Ford Coppola." }
  ],
  "Science & Nature": [
    { word: "PHOTOSYNTHESIS", hint: "Green plant process transforming solar sunlight into chemical glucose.", definition: "Biological process generating oxygen and plant energy." },
    { word: "SUPERNOVA", hint: "Cataclysmic explosion marking the luminous death of a star.", definition: "Stellar explosion producing heavy interstellar elements." },
    { word: "QUANTUM", hint: "Subatomic physics studying wave-particle duality and entanglement.", definition: "Physics branch operating at atomic scales." },
    { word: "ATMOSPHERE", hint: "Gaseous envelope shielding Earth from harmful solar radiation.", definition: "Layer of gases held by planetary gravity." },
    { word: "GRAVITY", hint: "Universal force attracting massive bodies towards one another.", definition: "Fundamental interaction warping spacetime." },
    { word: "DNA", hint: "Double-helix molecular blueprint carrying hereditary genetic code.", definition: "Deoxyribonucleic acid, master molecule of life." },
    { word: "NEBULA", hint: "Glowing interstellar cloud of dust and gas where stars are born.", definition: "Cosmic stellar nursery in outer space." },
    { word: "VOLCANO", hint: "Crustal rupture letting molten lava, ash, and gases escape.", definition: "Geological vent erupting magma." }
  ],
  "World History": [
    { word: "RENAISSANCE", hint: "European cultural and intellectual rebirth originating in Florence.", definition: "Cultural movement spanning 14th to 17th centuries." },
    { word: "PARTHENON", hint: "Classical Greek marble temple atop the Athenian Acropolis.", definition: "Ancient temple dedicated to goddess Athena." },
    { word: "COLOSSEUM", hint: "Iconic Roman amphitheater used for gladiatorial combat.", definition: "Ancient Roman monument in center of Rome." },
    { word: "PHARAOH", hint: "Monarch of ancient Egyptian dynasties worshipped as a deity.", definition: "Supreme ruler of ancient Egypt." },
    { word: "PYRAMID", hint: "Monumental stone structure built as royal Egyptian tombs.", definition: "Triangular ancient Egyptian architectural wonder." },
    { word: "HIEROGLYPH", hint: "Pictorial writing system used by ancient Egyptian scribes.", definition: "Ancient Egyptian formal script." }
  ],
  "Animals": [
    { word: "CHAMELEON", hint: "Lizard species capable of rapid skin camouflage and 360-degree vision.", definition: "Reptile with independently moving eyes." },
    { word: "CHEETAH", hint: "The fastest terrestrial mammal reaching speeds of 70 mph.", definition: "Spotted African big cat specialized for sprinting." },
    { word: "OCTOPUS", hint: "Eight-armed ocean creature possessing 3 hearts and high intelligence.", definition: "Soft-bodied marine mollusk." },
    { word: "PLATYPUS", hint: "Egg-laying mammal with a duck bill, webbed feet, and venomous spurs.", definition: "Unique Australian semi-aquatic monotreme." },
    { word: "KANGAROO", hint: "Australian marsupial that hops on powerful hind legs with pouch.", definition: "Large hopping marsupial." },
    { word: "FLAMINGO", hint: "Wading bird famous for pink feathers derived from eating shrimp.", definition: "Long-legged pink wading bird." },
    { word: "DOLPHIN", hint: "Echolocating marine mammal known for acrobatics and social intelligence.", definition: "Aquatic mammal related to whales." }
  ],
  "Food & Culinary": [
    { word: "CAPPUCCINO", hint: "Italian coffee beverage prepared with espresso, steamed milk, and foam.", definition: "Classic frothed espresso drink." },
    { word: "GUACAMOLE", hint: "Avocado-based Mexican dip mixed with lime, cilantro, and spices.", definition: "Creamy Mexican avocado condiment." },
    { word: "CROISSANT", hint: "Flaky buttery French crescent-shaped laminated pastry.", definition: "Classic French breakfast pastry." },
    { word: "CHOCOLATE", hint: "Confectionery created from roasted and ground cacao seeds.", definition: "Cocoa-based sweet indulgence." },
    { word: "SPAGHETTI", hint: "Long, thin cylindrical Italian pasta noodles.", definition: "Popular Italian wheat pasta." },
    { word: "SUSHI", hint: "Japanese dish of seasoned vinegared rice served with raw fish.", definition: "Traditional Japanese culinary art." },
    { word: "TIRAMISU", hint: "Italian coffee-flavoured dessert layered with ladyfingers and mascarpone.", definition: "Classic espresso-infused dessert." }
  ]
};

// Global map tracking played words per user session to guarantee ZERO repetition
const userUsedWordsMap = new Map();

function getRandomWordItem(category, userId) {
  let catKey = category;
  if (!WORD_DATABASE[catKey] || catKey === 'All') {
    const keys = Object.keys(WORD_DATABASE);
    catKey = keys[Math.floor(Math.random() * keys.length)];
  }
  const catWords = WORD_DATABASE[catKey] || WORD_DATABASE["Programming & Tech"];

  const userKey = userId ? userId.toString() : 'guest';
  let userSet = userUsedWordsMap.get(userKey);
  if (!userSet) {
    userSet = new Set();
    userUsedWordsMap.set(userKey, userSet);
  }

  // Filter out words that have already been played in this session
  const available = catWords.filter(item => !userSet.has(item.word));

  if (available.length === 0) {
    // All words in this category played! Reset category tracking for fresh rotation
    catWords.forEach(item => userSet.delete(item.word));
    const randomPick = catWords[Math.floor(Math.random() * catWords.length)];
    userSet.add(randomPick.word);
    return { ...randomPick, category: catKey };
  }

  const randomPick = available[Math.floor(Math.random() * available.length)];
  userSet.add(randomPick.word);
  return { ...randomPick, category: catKey };
}

// Start new game
router.post(['/start', '/new'], auth, async (req, res) => {
  try {
    const category = req.body.category || "Programming & Tech";
    const difficulty = (req.body.difficulty || "medium").toLowerCase();
    
    let maxAttempts = 6;
    if (difficulty === 'easy') maxAttempts = 8;
    if (difficulty === 'hard') maxAttempts = 5;

    const wordItem = getRandomWordItem(category, req.user._id);
    
    const game = new Game({
      user: req.user._id,
      word: wordItem.word,
      aiHints: [wordItem.hint],
      guessedLetters: [],
      incorrectGuesses: 0,
      maxIncorrectGuesses: maxAttempts,
      status: 'active'
    });

    // Store custom hint & definition on game object
    game.customHint = wordItem.hint;
    game.customDefinition = wordItem.definition;
    
    await game.save();

    const masked_word = Array(wordItem.word.length).fill('_').join(' ');
    
    res.json({
      game_id: game._id,
      gameId: game._id,
      word_length: wordItem.word.length,
      category: wordItem.category,
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
      word: game.status !== 'active' ? game.word : undefined,
      definition: game.status !== 'active' ? (game.customDefinition || "Great effort!") : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get AI / Custom hint for word
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
    
    // Check if custom hint is attached to game
    if (game.customHint) {
      return res.json({ hint: game.customHint });
    }
    if (game.aiHints && game.aiHints.length > 0) {
      return res.json({ hint: game.aiHints[0] });
    }

    const ai = getOpenAI();
    let hint;
    
    if (!ai) {
      const word = game.word;
      hint = `The secret word has ${word.length} letters and starts with "${word[0]}".`;
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
