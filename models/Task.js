// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // ── NEW: owner ─────────────────────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: [true, 'Task must belong to a user'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in-progress', 'completed'],
      message: 'Status must be pending, in-progress, or completed'
    },
    default: 'pending'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null,
    validate: {
      validator(value) {
        if (value === null || value === undefined) return true;
        // Only enforce future-date on new docs; editing an old task shouldn't fail
        return this.isNew ? value > new Date() : true;
      },
      message: 'Due date must be in the future'
    }
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator(tags) {
        return tags.every((tag) => tag.length <= 20);
      },
      message: 'Each tag must be 20 characters or less'
    }
  }
}, {
  timestamps: true
});

taskSchema.index({ user: 1, status: 1, priority: 1 });
taskSchema.index({ user: 1, createdAt: -1 });

taskSchema.pre('save', function () {
  if (this.isModified('title') && this.title) {
    this.title = this.title.charAt(0).toUpperCase() + this.title.slice(1);
  }
});

taskSchema.virtual('ageInDays').get(function () {
  if (!this.createdAt) return 0;
  return Math.floor((Date.now() - this.createdAt.getTime()) / 86400000);
});

taskSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  return this.save();
};

taskSchema.statics.getStats = async function () {
  return this.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
};

taskSchema.set('toJSON', {
  virtuals: true,                    // ← so ageInDays shows up
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Task', taskSchema);