// src/validators/audio.validator.js
const { body, param, query } = require('express-validator');

const audioValidators = {
  create: [
    body('title')
      .notEmpty().withMessage('Title is required')
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    
    body('category')
      .isIn(['emission', 'podcast', 'teaching']).withMessage('Invalid category')
  ],

  update: [
    param('id')
      .notEmpty().withMessage('Audio ID is required'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('Audio ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('Audio ID is required')
  ],

  getAll: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    
    query('category')
      .optional()
      .isIn(['emission', 'podcast', 'teaching']).withMessage('Invalid category')
  ]
};

module.exports = audioValidators;