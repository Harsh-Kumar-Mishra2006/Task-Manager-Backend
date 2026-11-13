// controllers/taskController.js
const Task = require('../models/Task');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── CREATE ─────────────────────────────────────────────
const createTask = async (req, res) => {
  try {
    // Sanity: authenticateToken should have set this
    if (!req.user?.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'You must be logged in to create a task'
      });
    }

    const taskData = { ...req.body, user: req.user.userId };

    // Never let the client set another user's ID
    delete taskData._id;
    delete taskData.__v;

    if (!taskData.dueDate || taskData.dueDate === '') {
      taskData.dueDate = null;
    }

    if (typeof taskData.tags === 'string') {
      taskData.tags = taskData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const task = await Task.create(taskData);

    return res.status(201).json({
      status: 'success',
      data: { task },
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ status: 'error', message: 'Validation error', errors: messages });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── LIST (only this user's tasks) ──────────────────────
const getAllTasks = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { user: req.user.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Task.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      status: 'success',
      data: {
        tasks,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── GET ONE ────────────────────────────────────────────
const getTaskById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID format' });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { task },
      message: 'Task retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── UPDATE ─────────────────────────────────────────────
const updateTask = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID format' });
    }

    const existing = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const updates = {};
    const allowed = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];

    for (const field of allowed) {
      if (req.body[field] === undefined || req.body[field] === null) continue;

      if (field === 'dueDate') {
        if (req.body.dueDate === '') {
          updates.dueDate = null;
        } else {
          const d = new Date(req.body.dueDate);
          updates.dueDate = isNaN(d.getTime()) ? null : d;
        }
      } else if (field === 'tags') {
        if (typeof req.body.tags === 'string') {
          updates.tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
        } else if (Array.isArray(req.body.tags)) {
          updates.tags = req.body.tags;
        } else {
          updates.tags = [];
        }
      } else {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No valid fields to update' });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,              // ← standard Mongoose option
      runValidators: true
      // context: 'query'  ← removed (invalid)
    });

    return res.status(200).json({
      status: 'success',
      data: { task: updatedTask },
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ status: 'error', message: 'Validation error', errors: messages });
    }
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Duplicate field value entered' });
    }
    return res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ── DELETE ─────────────────────────────────────────────
const deleteTask = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID format' });
    }

    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: { deletedTask: { id: deleted._id, title: deleted.title } },
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID format' });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── STATS (scoped to this user) ────────────────────────
const getTaskStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const [totalTasks, statusStats, priorityStats, recentTasks] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status priority createdAt')
    ]);

    return res.status(200).json({
      status: 'success',
      data: { total: totalTasks, byStatus: statusStats, byPriority: priorityStats, recent: recentTasks },
      message: 'Task statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── BULK DELETE (only this user's tasks) ───────────────
const bulkDeleteTasks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please provide an array of task IDs' });
    }

    const invalid = ids.filter((id) => !isValidId(id));
    if (invalid.length) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID format', invalidIds: invalid });
    }

    const result = await Task.deleteMany({
      _id: { $in: ids },
      user: req.user.userId            // ← only delete own tasks
    });

    return res.status(200).json({
      status: 'success',
      data: { deletedCount: result.deletedCount, requestedCount: ids.length },
      message: `${result.deletedCount} tasks deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  getTaskStats,
  bulkDeleteTasks,
  updateTask,
  deleteTask
};