const bcrypt = require('bcryptjs');

// Global arrays to persist data across requests during serverless container lifespan
global.inMemoryUsers = global.inMemoryUsers || [];
global.inMemoryGames = global.inMemoryGames || [];

class MockUser {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substring(2, 9);
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.gamesPlayed = data.gamesPlayed || 0;
    this.gamesWon = data.gamesWon || 0;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    // Hash password if not already hashed (bcrypt hashes start with $2a$ or $2b$)
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    const index = global.inMemoryUsers.findIndex(u => u._id === this._id);
    if (index !== -1) {
      global.inMemoryUsers[index] = this;
    } else {
      global.inMemoryUsers.push(this);
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  static async findOne(query) {
    if (!query) return null;
    const { email, username, $or } = query;
    const found = global.inMemoryUsers.find(u => {
      if (email && u.email === email) return true;
      if (username && u.username === username) return true;
      if ($or) {
        return $or.some(q => {
          if (q.email && u.email === q.email) return true;
          if (q.username && u.username === q.username) return true;
          return false;
        });
      }
      return false;
    });
    return found || null;
  }

  static async findById(id) {
    if (!id) return null;
    let user = global.inMemoryUsers.find(u => u._id.toString() === id.toString());
    if (!user) {
      // Re-create a temporary demo user on-the-fly to prevent session loss on container restart
      user = new MockUser({
        _id: id,
        username: 'DemoUser',
        email: 'demo@example.com',
        gamesPlayed: 0,
        gamesWon: 0
      });
      global.inMemoryUsers.push(user);
    }
    return user;
  }

  static async findByIdAndUpdate(id, update) {
    const user = await this.findById(id);
    if (!user) return null;
    if (update.$inc) {
      if (update.$inc.gamesPlayed) user.gamesPlayed += update.$inc.gamesPlayed;
      if (update.$inc.gamesWon) user.gamesWon += update.$inc.gamesWon;
    }
    await user.save();
    return user;
  }
}

class MockGame {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substring(2, 9);
    this.user = data.user;
    this.word = data.word;
    this.guessedLetters = data.guessedLetters || [];
    this.incorrectGuesses = data.incorrectGuesses || 0;
    this.maxIncorrectGuesses = data.maxIncorrectGuesses || 6;
    this.status = data.status || 'active';
    this.aiHints = data.aiHints || [];
    this.createdAt = data.createdAt || new Date();
    this.completedAt = data.completedAt || null;
  }

  async save() {
    const index = global.inMemoryGames.findIndex(g => g._id === this._id);
    if (index !== -1) {
      global.inMemoryGames[index] = this;
    } else {
      global.inMemoryGames.push(this);
    }
    return this;
  }

  static async findOne(query) {
    if (!query) return null;
    const { _id, user } = query;
    let game = global.inMemoryGames.find(g => 
      g._id.toString() === _id.toString() && g.user.toString() === user.toString()
    );
    if (!game) {
      // Re-create a temporary active game to prevent session loss
      game = new MockGame({
        _id: _id,
        user: user,
        word: 'REACT', // Fallback word
        guessedLetters: [],
        incorrectGuesses: 0,
        maxIncorrectGuesses: 6,
        status: 'active'
      });
      global.inMemoryGames.push(game);
    }
    return game;
  }

  static find(query) {
    const { user } = query || {};
    let results = [...global.inMemoryGames];
    
    if (user) {
      results = results.filter(g => g.user.toString() === user.toString());
    }
    
    const chain = {
      sort: (sortQuery) => {
        if (sortQuery && sortQuery.createdAt) {
          results.sort((a, b) => b.createdAt - a.createdAt);
        }
        return chain;
      },
      limit: (n) => {
        results = results.slice(0, n);
        return chain;
      },
      then: (resolve) => {
        resolve(results);
      }
    };
    return chain;
  }
}

module.exports = {
  User: MockUser,
  Game: MockGame
};
