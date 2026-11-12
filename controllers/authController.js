const auth = require('../models/authModel');
const Worker = require('../models/addWorker');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

// Signup
const signup = async (req, res) => {
  let { name, email, username, phone, password, role = 'user', profile = {}, age, gender, dob } = req.body;

  console.log('Signup request received:', { name, email, phone, role });

  if (!email || !email.trim()) {
    return res.status(400).json({ 
      success: false,
      error: 'Email is required for user/admin registration' 
    });
  }

  if (!name || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Name and password are required' 
    });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address'
    });
  }

  try {
    const existingEmail = await auth.findOne({ email: email.trim() });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);
    
    // Prepare user data
    const userData = {
      name,
      email: email.trim(),
      password: hash,
      role: role,
      profile: {
        age: age || '',
        gender: gender || '',
        dob: dob || '',
        ...profile
      },
      isVerified: true,
      isActive: true
    };

    if (phone) {
      userData.phone = phone;
    }

    // Add username if provided
    if (username && username.trim() !== '') {
      // Check username uniqueness
      const existingUsername = await auth.findOne({ username: username.trim() });
      if (existingUsername) {
        return res.status(400).json({ 
          success: false,
          message: 'Username already taken' 
        });
      }
      userData.username = username.trim();
    }

    const createuser = await auth.create(userData);

    console.log(`${role} created successfully with email: ${email}`);

    res.status(201).json({
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
    console.log("Error occurred: ", err);
    res.status(400).json({
      success: false,
      error: "Failed to create profile: " + err.message
    });
  }
};

// login
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    const user = await auth.findOne({ email: email.trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        name: user.name
      }, 
      'mypassword', 
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      data: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || 'Not provided',
        username: user.username || 'Not provided',
        phone: user.phone,
        role: user.role,
        profile: user.profile
      },
      message: `Welcome back, ${user.name}!`,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    let token = req.header('Authorization') || req.headers.authorization;
    
    if (token) {
      token = token.replace('Bearer ', '');
    } else {
      token = req.cookies?.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, 'mypassword');
    const user = await auth.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let displayUsername = user.username;
    if (!displayUsername || displayUsername === 'null' || displayUsername === 'undefined') {
      displayUsername = user.role === 'worker' ? user.phone : user.name;
    }
    
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: displayUsername, 
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        isVerified: user.isVerified
      }
    });
    
  } catch (err) {
    console.log('Server error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
    
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Error during logout"
    });
  }
};

const debugToken = async (req, res) => {
  try {
    let token = req.header('Authorization') || req.headers.authorization;
    
    if (token) {
      token = token.replace('Bearer ', '');
    } else {
      token = req.cookies?.token;
    }
    
    if (!token) {
      return res.json({
        success: false,
        error: 'No token provided'
      });
    }
    
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
          const verified = jwt.verify(token, 'mypassword');
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
    
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = {
  signup,
  login,
  logout,
  getProfile,
  debugToken,
};