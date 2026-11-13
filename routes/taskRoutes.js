// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  bulkDeleteTasks
} = require('../controllers/taskController');
const authenticateToken = require('../middlewares/authMiddleware');

// EVERY task endpoint requires a valid login
router.use(authenticateToken);

// Static routes MUST come before /:id
router.get('/stats', getTaskStats);
router.delete('/bulk/delete', bulkDeleteTasks);

router.post('/', createTask);
router.get('/', getAllTasks);

router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;