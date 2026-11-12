const express = require('express');
const { 
  login, 
  signup, 
  logout, 
  getProfile, 
  debugToken
} = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

// PUBLIC ROUTES (no authentication required)
router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);

// PROTECTED ROUTES (authentication required)
router.get('/profile', authenticateToken, getProfile);
router.get('/debug-token', authenticateToken, debugToken);

module.exports = router;