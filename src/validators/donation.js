const { body, param, query } = require('express-validator');

const donationValidators = {
  create: [
    body('amount')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
      .toFloat(),
    
    body('type')
      .isIn(['oneTime', 'monthly']).withMessage('Type must be either oneTime or monthly'),
    
    body('paymentMethod')
      .isIn(['creditCard', 'paypal', 'tmoney', 'flooz'])
      .withMessage('Invalid payment method'),
    
    body('message')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Message must be less than 500 characters'),
    
    body('isAnonymous')
      .optional()
      .isBoolean().withMessage('isAnonymous must be a boolean')
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('Donation ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('Donation ID is required')
  ],

  getAll: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    
    query('type')
      .optional()
      .isIn(['oneTime', 'monthly']).withMessage('Invalid type'),
    
    query('paymentMethod')
      .optional()
      .isIn(['creditCard', 'paypal', 'tmoney', 'flooz'])
      .withMessage('Invalid payment method'),
    
    query('userId')
      .optional()
      .trim()
  ],

  getStats: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format')
      .toDate(),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .toDate(),
    
    query('type')
      .optional()
      .isIn(['oneTime', 'monthly']).withMessage('Invalid type')
  ],

  getTopDonors: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format')
      .toDate(),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .toDate()
  ]
};

module.exports = donationValidators;