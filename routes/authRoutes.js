// routes/authRoutes.js
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

// PUBLIC
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// PROTECTED
router.get('/profile', authenticateToken, getProfile);
router.get('/debug-token', authenticateToken, debugToken);

module.exports = router;