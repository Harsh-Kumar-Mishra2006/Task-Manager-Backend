//models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
      validator: function(value) {
        if (value === null || value === undefined) return true;
        return value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.every(tag => tag.length <= 20);
      },
      message: 'Each tag must be 20 characters or less'
    }
  }
}, {
  timestamps: true
});

taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ createdAt: -1 });

taskSchema.pre('save', function() {
  if (this.isModified('title')) {
    this.title = this.title.charAt(0).toUpperCase() + this.title.slice(1);
  }
});


taskSchema.virtual('ageInDays').get(function() {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

taskSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  return this.save();
};

taskSchema.statics.getStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

taskSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;