//controllers/taskController.js
const Task = require('../models/Task');

exports.createTask = async (req, res, next) => {
  try {
    console.log('Creating task with data:', req.body);
    
    const taskData = { ...req.body };
    
    if (!taskData.dueDate || taskData.dueDate === '') {
      taskData.dueDate = null;
    }
    
    if (taskData.tags && typeof taskData.tags === 'string') {
      taskData.tags = taskData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    const task = await Task.create(taskData);
    
    console.log('Task created successfully:', task._id);
    
    res.status(201).json({
      status: 'success',
      data: {
        task
      },
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      errors: error.errors || null
    });
  }
};


exports.getAllTasks = async (req, res, next) => {
  try {
    console.log('Fetching tasks with params:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
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
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        task
      },
      message: 'Task retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    console.log('Updating task:', req.params.id);
    console.log('Update data:', req.body);
    
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format'
      });
    }

    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const updates = {};
    const allowedUpdates = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        if (field === 'dueDate') {
          if (req.body.dueDate === '') {
            updates[field] = null;
          } else {
            const date = new Date(req.body.dueDate);
            if (!isNaN(date.getTime())) {
              updates[field] = date;
            } else {
              updates[field] = null;
            }
          }
        } else if (field === 'tags') {
          if (typeof req.body.tags === 'string') {
            updates[field] = req.body.tags.split(',').map(tag => tag.trim()).filter(Boolean);
          } else if (Array.isArray(req.body.tags)) {
            updates[field] = req.body.tags;
          } else {
            updates[field] = [];
          }
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    console.log('Applying updates:', updates);

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        returnDocument: 'after', 
        runValidators: true,
        context: 'query'
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found after update'
      });
    }

    console.log('Task updated successfully:', updatedTask._id);

    res.status(200).json({
      status: 'success',
      data: {
        task: updatedTask
      },
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate field value entered'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while updating task'
    });
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    console.log('Deleting task:', req.params.id);

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format'
      });
    }

    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    
    if (!deletedTask) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    console.log('Task deleted successfully:', req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        deletedTask: {
          id: deletedTask._id,
          title: deletedTask.title
        }
      },
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    
    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while deleting task'
    });
  }
};

exports.getTaskStats = async (req, res, next) => {
  try {
    const totalTasks = await Task.countDocuments();
    const statusStats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const priorityStats = await Task.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        total: totalTasks,
        byStatus: statusStats,
        byPriority: priorityStats,
        recent: recentTasks
      },
      message: 'Task statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.bulkDeleteTasks = async (req, res, next) => {
  try {
    console.log('Bulk deleting tasks:', req.body);
    
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of task IDs'
      });
    }

    const invalidIds = ids.filter(id => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format in the provided list',
        invalidIds: invalidIds
      });
    }

    const result = await Task.deleteMany({ _id: { $in: ids } });

    console.log(`${result.deletedCount} tasks deleted successfully`);

    res.status(200).json({
      status: 'success',
      data: {
        deletedCount: result.deletedCount,
        requestedCount: ids.length
      },
      message: `${result.deletedCount} tasks deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while deleting tasks'
    });
  }
};