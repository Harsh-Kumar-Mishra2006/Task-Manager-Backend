// models/authModel.js
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const authSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [60, 'Name cannot exceed 60 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    trim: true,
    lowercase: true
    // FIX #2: no `default: null` — sparse unique index only skips MISSING fields.
    // With default:null every second user collided on null.
  },
  phone: {
    // Optional — profile info only, NOT a login credential
    type: String,
    trim: true
    // FIX #2: no default:null for the same sparse-index reason.
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false   // never returned by default
  },
  role: {
    type: String,
    enum: {
      values: ['user'],          // FIX #1: single role, matches controller
      message: 'Role must be user'
    },
    default: 'user',
    immutable: true              // FIX #1: cannot be changed after creation
  },
  profile: {
    age:       { type: Number, min: 0, max: 120, default: null }, // FIX #12: Number, not String
    gender:    { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dob:       { type: String, default: '' },
    address:   { type: String, default: '' },
    education: { type: String, default: '' },
    bio:       { type: String, default: '' }
  },
  isVerified: { type: Boolean, default: false }, // FIX #8: no longer auto-true
  isActive:   { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now } // FIX #11: presence for collaboration
}, {
  timestamps: true
});

// Indexes
authSchema.index({ username: 1 }, { unique: true, sparse: true });
authSchema.index({ phone: 1 }, { sparse: true });
authSchema.index({ role: 1, isActive: 1 });

// FIX #9: defense-in-depth — hash on save if password was modified.
// Controller may pre-hash; isModified guard makes this idempotent.
authSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// toJSON transform
authSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('Auth', authSchema);