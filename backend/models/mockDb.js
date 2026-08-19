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
    const index = global.inMemoryUsers.findIndex(u => u._id === this._id || u.username === this.username || u.email === this.email);
    if (index !== -1) {
      global.inMemoryUsers[index] = this;
    } else {
      global.inMemoryUsers.push(this);
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    if (!this.password || !candidatePassword) return false;
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
    return candidatePassword === this.password;
  }

  static async findOne(query) {
    if (!query) return null;
    const { _id, email, username, username_or_email, $or } = query;
    
    let found = global.inMemoryUsers.find(u => {
      if (!u) return false;
      if (_id && u._id && u._id.toString() === _id.toString()) return true;
      if (email && u.email && u.email.toLowerCase() === email.toLowerCase()) return true;
      if (username && u.username && u.username.toLowerCase() === username.toLowerCase()) return true;
      if (username_or_email && (u.username.toLowerCase() === username_or_email.toLowerCase() || u.email.toLowerCase() === username_or_email.toLowerCase())) return true;
      if ($or && Array.isArray($or)) {
        return $or.some(q => {
          if (q._id && u._id && u._id.toString() === q._id.toString()) return true;
          if (q.email && u.email && u.email.toLowerCase() === q.email.toLowerCase()) return true;
          if (q.username && u.username && u.username.toLowerCase() === q.username.toLowerCase()) return true;
          return false;
        });
      }
      return false;
    });

    return found || null;
  }

  static findById(id) {
    const makeChain = (targetUser) => {
      const chain = {
        select: () => chain,
        lean: () => chain,
        exec: () => Promise.resolve(targetUser),
        then: (resolve) => resolve(targetUser)
      };
      return chain;
    };

    if (!id) return makeChain(null);

    let user = global.inMemoryUsers.find(u => u && u._id && u._id.toString() === id.toString());
    return makeChain(user || null);
  }

  static async findByIdAndUpdate(id, update) {
    const userResult = await this.findById(id);
    const user = userResult ? await userResult.exec() : null;
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
    let game = global.inMemoryGames.find(g => {
      if (!g) return false;
      if (_id && (!g._id || g._id.toString() !== _id.toString())) return false;
      if (user && (!g.user || g.user.toString() !== user.toString())) return false;
      return true;
    });
    return game || null;
  }

  static find(query) {
    const { user } = query || {};
    let results = [...global.inMemoryGames];
    
    if (user) {
      results = results.filter(g => g && g.user && g.user.toString() === user.toString());
    }
    
    const chain = {
      sort: (sortQuery) => {
        if (sortQuery && sortQuery.createdAt) {
          results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return chain;
      },
      limit: (n) => {
        results = results.slice(0, n);
        return chain;
      },
      lean: () => chain,
      exec: () => Promise.resolve(results),
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
