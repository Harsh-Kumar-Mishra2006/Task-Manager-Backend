// routes/authRoutes.js
const express = require('express');
const {
  login, signup, logout, getProfile, debugToken
} = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

// PUBLIC
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// FIX #4: debug-token must be PUBLIC — otherwise authenticateToken
// rejects bad tokens before the handler can diagnose them.
// Handler itself guards NODE_ENV === 'production'.
router.get('/debug-token', debugToken);

// PROTECTED
router.get('/profile', authenticateToken, getProfile);

module.exports = router;