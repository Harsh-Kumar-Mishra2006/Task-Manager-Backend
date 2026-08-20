//middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error Details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code
  });

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { statusCode: 404, message };
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { statusCode: 400, message };
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = { statusCode: 400, message: messages.join(', ') };
  }

  const statusCode = error.statusCode || 500;
  const response = {
    status: 'error',
    message: error.message || 'Server Error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.errors = err.errors || null;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;