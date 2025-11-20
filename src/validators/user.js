// src/validators/user.validator.js
const { body, param, query } = require('express-validator');

const userValidators = {
  invite: [
    body('email')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('role')
      .isIn(['pasteur', 'media']).withMessage('Role must be either pasteur or media'),
    
    body('displayName')
      .notEmpty().withMessage('Display name is required')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Display name must be between 2 and 100 characters')
  ],

  updateRole: [
    param('id')
      .notEmpty().withMessage('User ID is required'),
    
    body('role')
      .isIn(['user', 'pasteur', 'media', 'admin']).withMessage('Invalid role')
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('User ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('User ID is required')
  ],

  getAll: [
    query('role')
      .optional()
      .isIn(['user', 'pasteur', 'media', 'admin']).withMessage('Invalid role'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1')
  ],

  resendInvitation: [
    param('id')
      .notEmpty().withMessage('User ID is required')
  ]
};

module.exports = userValidators;