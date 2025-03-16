const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Get token from header
    let token = req.header('Authorization');
    
    // Log the received token for debugging
    console.log('Received Authorization header:', token);
    
    // Check if no token
    if (!token) {
      console.log('No Authorization header provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Handle different token formats (with or without Bearer prefix)
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    
    console.log('Token to verify:', token);
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      
      // Add user data to request
      req.user = decoded;
      
      // Log success
      console.log('Auth successful for user ID:', decoded.id);
      
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};