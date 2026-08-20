//routes/taskRoutes.js
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
const { validate, sanitize } = require('../middleware/validation');
const { taskValidationRules } = require('../utils/validators');

router.get('/stats', getTaskStats);

router.post(
  '/',
  taskValidationRules.create,
  sanitize,
  validate,
  createTask
);

router.get(
  '/',
  taskValidationRules.pagination,
  validate,
  getAllTasks
);

router.get(
  '/:id',
  taskValidationRules.id,
  validate,
  getTaskById
);

router.put(
  '/:id',
  taskValidationRules.id,
  taskValidationRules.update,
  sanitize,
  validate,
  updateTask
);

router.delete(
  '/:id',
  taskValidationRules.id,
  validate,
  deleteTask
);

router.delete(
  '/bulk/delete',
  bulkDeleteTasks
);

module.exports = router;