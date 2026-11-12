// controllers/authController.js
const auth = require('../models/authModel');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------- Helper: sign token ----------
const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// ---------- Helper: set cookie ----------
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
};

// ---------- SIGNUP ----------
const signup = async (req, res) => {
  const { name, email, username, phone, password, role = 'user', profile = {}, age, gender, dob } = req.body;

  console.log('Signup request received:', { name, email, role });

  // --- validation ---
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  if (!name || !password) {
    return res.status(400).json({ success: false, error: 'Name and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
  }
  if (!['user', 'worker', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existingEmail = await auth.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // username check (only if provided and non-empty)
    let normalizedUsername = null;
    if (username && username.trim() !== '') {
      normalizedUsername = username.trim().toLowerCase();
      const existingUsername = await auth.findOne({ username: normalizedUsername });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    }

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);

    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      role,
      username: normalizedUsername,
      phone: phone && phone.trim() ? phone.trim() : null,
      profile: {
        age: age || '',
        gender: gender || '',
        dob: dob || '',
        ...profile
      },
      isVerified: true,
      isActive: true
    };

    const createuser = await auth.create(userData);

    console.log(`${role} created successfully with email: ${normalizedEmail}`);

    return res.status(201).json({
      success: true,
      data: {
        id: createuser._id,
        name: createuser.name,
        email: createuser.email,
        username: createuser.username || '',
        phone: createuser.phone || '',
        role: createuser.role,
        profile: createuser.profile
      },
      message: `${role} account created successfully`
    });
  } catch (err) {
    console.log('Signup error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ success: false, error: `${field} already in use` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(err.errors)[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create account: ' + err.message });
  }
};

// ---------- LOGIN (email only) ----------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const user = await auth
      .findOne({ email: email.trim().toLowerCase() })
      .select('+password');   // password is select:false in schema

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken(user);
    setTokenCookie(res, token);

    return res.json({
      success: true,
      data: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || '',
        phone: user.phone || '',
        role: user.role,
        profile: user.profile
      },
      message: `Welcome back, ${user.name}!`
    });
  } catch (err) {
    console.log('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------- GET PROFILE ----------
const getProfile = async (req, res) => {
  try {
    // authenticateToken has already verified + set req.user
    const user = await auth.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let displayUsername = user.username;
    if (!displayUsername || displayUsername === 'null' || displayUsername === 'undefined') {
      displayUsername = user.name;
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: displayUsername,
        phone: user.phone || '',
        role: user.role,
        profile: user.profile,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.log('getProfile error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ---------- LOGOUT ----------
const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.log('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Error during logout' });
  }
};

// ---------- DEBUG TOKEN (dev only) ----------
const debugToken = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    let token = req.header('Authorization') || req.headers.authorization;
    if (token) token = token.replace('Bearer ', '').trim();
    else token = req.cookies?.token;

    if (!token) return res.json({ success: false, error: 'No token provided' });

    token = token.trim().replace(/^["']|["']$/g, '');

    const result = {
      success: true,
      tokenInfo: {
        length: token.length,
        first50Chars: token.substring(0, 50),
        isJWTFormat: token.split('.').length === 3
      }
    };

    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        result.tokenInfo.decodedPayload = payload;
        try {
          const verified = jwt.verify(token, JWT_SECRET);
          result.tokenInfo.verified = true;
          result.tokenInfo.userId = verified.userId;
        } catch (verifyError) {
          result.tokenInfo.verified = false;
          result.tokenInfo.verificationError = verifyError.message;
        }
      } catch (decodeError) {
        result.tokenInfo.decodeError = decodeError.message;
      }
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { signup, login, logout, getProfile, debugToken };