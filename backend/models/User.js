const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mockDb = require('./mockDb');

// Disable Mongoose command buffering globally to prevent buffering timeouts
mongoose.set('bufferCommands', false);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const RealUser = mongoose.model('User', userSchema);

class SmartUser {
  constructor(data) {
    if (mongoose.connection.readyState === 1) {
      return new RealUser(data);
    } else {
      return new mockDb.User(data);
    }
  }

  static async findOne(query) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await RealUser.findOne(query);
      } catch (err) {
        console.warn('[DB Fallback] RealUser.findOne query failed, switching to mockDb:', err.message);
        return await mockDb.User.findOne(query);
      }
    }
    return await mockDb.User.findOne(query);
  }

  static findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return RealUser.findById(id);
      } catch (err) {
        console.warn('[DB Fallback] RealUser.findById failed, switching to mockDb:', err.message);
        return mockDb.User.findById(id);
      }
    }
    return mockDb.User.findById(id);
  }

  static async findByIdAndUpdate(id, update, options) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await RealUser.findByIdAndUpdate(id, update, options);
      } catch (err) {
        console.warn('[DB Fallback] RealUser.findByIdAndUpdate failed, switching to mockDb:', err.message);
        return await mockDb.User.findByIdAndUpdate(id, update);
      }
    }
    return await mockDb.User.findByIdAndUpdate(id, update);
  }
}

module.exports = SmartUser;
