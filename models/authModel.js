// models/authModel.js
const mongoose = require('mongoose');

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
    lowercase: true,
    default: null
  },
  phone: {
    // Optional — profile info only, NOT a login credential
    type: String,
    trim: true,
    default: null
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
      values: ['user', 'worker', 'admin'],
      message: 'Role must be user, worker, or admin'
    },
    default: 'user'
  },
  profile: {
    age:     { type: String, default: '' },
    gender:  { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dob:     { type: String, default: '' },
    address: { type: String, default: '' },
    education: { type: String, default: '' },
    bio:     { type: String, default: '' }
  },
  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
// email is already unique via field option; no need to re-declare here
authSchema.index({ username: 1 }, { unique: true, sparse: true });
authSchema.index({ phone: 1 }, { sparse: true });
authSchema.index({ role: 1, isActive: 1 });

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