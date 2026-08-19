const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied', message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345678');
    const targetId = decoded.userId || decoded.user_id;
    
    let userResult = User.findById(targetId);
    let user = userResult && typeof userResult.exec === 'function' ? await userResult.exec() : await userResult;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found for token', message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is invalid or expired', message: 'Token is not valid' });
  }
};

module.exports = auth;
