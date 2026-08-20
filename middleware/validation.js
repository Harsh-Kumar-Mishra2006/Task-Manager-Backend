//middleware/validation.js
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map(err => ({
    field: err.path,
    message: err.msg
  }));

  return res.status(400).json({
    status: 'error',
    errors: extractedErrors
  });
};

const sanitize = (req, res, next) => {
  if (req.body.title) {
    req.body.title = req.body.title.replace(/[<>]/g, '');
  }
  if (req.body.description) {
    req.body.description = req.body.description.replace(/[<>]/g, '');
  }
  next();
};

module.exports = { validate, sanitize };