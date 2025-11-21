const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const authService = req.container.get('authService');
    const result = await authService.login(req);

    res.json(result);
  });

  refreshToken = asyncHandler(async (req, res) => {
    const authService = req.container.get('authService');
    const result = await authService.refreshToken(req);

    res.json(result);
  });

  logout = asyncHandler(async (req, res) => {
    const authService = req.container.get('authService');
    const result = await authService.logout(req);

    res.json(result);
  });

  generateCustomToken = asyncHandler(async (req, res) => {
    const authService = req.container.get('authService');
    const result = await authService.generateCustomToken(req);

    res.json(result);
  });

  resetPassword = asyncHandler(async (req, res) => {
    const authService = req.container.get('authService');
    const result = await authService.resetPassword(req);

    res.json(result);
  });

  verifyToken = asyncHandler(async (req, res) => {
    const authService = req.container.get('authService');
    const result = await authService.verifyToken(req);

    res.json(result);
  });

  getMe = asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });
}

module.exports = new AuthController();