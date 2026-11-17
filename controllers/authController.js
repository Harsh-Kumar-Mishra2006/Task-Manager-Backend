// controllers/authController.js
const Auth = require('../models/authModel');          // FIX: idiomatic name
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------- Helper: sign token ----------
const signToken = (user) =>
  jwt.sign(
    { userId: user._id, email: user.email, role: user.role, name: user.name },
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

// ---------- SIGNUP (user only) ----------
const signup = async (req, res) => {
  // FIX #1: role is NOT accepted from the client. Always 'user'.
  const { name, email, username, phone, password, profile = {}, age, gender, dob } = req.body;

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

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existingEmail = await Auth.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // username check (only if provided and non-empty)
    let normalizedUsername = null;
    if (username && username.trim() !== '') {
      normalizedUsername = username.trim().toLowerCase();
      const existingUsername = await Auth.findOne({ username: normalizedUsername });
      if (existingUsername) {
        return res.status(400).json({ success: false, error: 'Username already taken' });
      }
    }

    // FIX #9: model pre-save hook hashes; we pass plaintext here.
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password,                                  // hashed by pre('save')
      role: 'user',                              // FIX #1: forced
      isVerified: true,                          // see note below (#8)
      isActive: true,
      profile: {
        // FIX: explicit fields take precedence over spread
        age: age != null ? Number(age) : (profile.age ?? null),
        gender: gender ?? profile.gender ?? '',
        dob: dob ?? profile.dob ?? '',
        address: profile.address ?? '',
        education: profile.education ?? '',
        bio: profile.bio ?? ''
      }
    };
    // FIX #2: only add optional keys when they actually have values
    if (normalizedUsername) userData.username = normalizedUsername;
    if (phone && phone.trim()) userData.phone = phone.trim();

    const createuser = await Auth.create(userData);

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
      message: 'User account created successfully'
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ success: false, error: `${field} already in use` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(err.errors)[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create account' });
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

    const user = await Auth
      .findOne({ email: email.trim().toLowerCase() })
      .select('+password');

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

    // FIX #11: touch presence
    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

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
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ---------- GET PROFILE ----------
const getProfile = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let displayUsername = user.username;
    if (!displayUsername || displayUsername === 'null' || displayUsername === 'undefined') {
      displayUsername = user.name;
    }

    return res.json({
      success: true,
      user: {                                 // FIX: consistent envelope
        id: user._id,
        name: user.name,
        email: user.email,
        username: displayUsername,
        phone: user.phone || '',
        role: user.role,
        profile: user.profile,
        isVerified: user.isVerified,
        lastActiveAt: user.lastActiveAt
      }
    });
  } catch (err) {
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
    return res.status(500).json({ success: false, error: 'Error during logout' });
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
        isJWTFormat: token.split('.').length === 3
        // FIX #13: removed first50Chars — partial secret leak
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