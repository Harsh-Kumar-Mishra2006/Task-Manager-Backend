//utils/validators.js
const { body, param, query } = require('express-validator');

const taskValidationRules = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('status')
      .optional()
      .isIn(['pending', 'in-progress', 'completed'])
      .withMessage('Status must be pending, in-progress, or completed'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      }),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags) => {
        if (tags && tags.some(tag => tag.length > 20)) {
          throw new Error('Each tag must be 20 characters or less');
        }
        return true;
      })
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('status')
      .optional()
      .isIn(['pending', 'in-progress', 'completed'])
      .withMessage('Status must be pending, in-progress, or completed'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      }),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid task ID format')
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('status')
      .optional()
      .isIn(['pending', 'in-progress', 'completed'])
      .withMessage('Invalid status filter'),
    
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Invalid priority filter'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'title', 'status', 'priority', 'dueDate'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ]
};

module.exports = { taskValidationRules };