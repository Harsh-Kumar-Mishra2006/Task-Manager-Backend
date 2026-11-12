// models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: 'Untitled',
    maxlength: [120, 'Title too long']
  },
  content: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true,
    index: true
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth'
  }],
  // lightweight version counter for optimistic sync
  version: {
    type: Number,
    default: 0
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    default: null
  },
  // metadata for download
  charCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: false }
}, {
  timestamps: true
});

documentSchema.index({ owner: 1, updatedAt: -1 });

documentSchema.pre('save', function () {
  this.charCount = this.content ? this.content.length : 0;
});

documentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Document', documentSchema);