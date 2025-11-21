const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class UserController {
  invite = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userService = req.container.get('userService');
    const result = await userService.inviteUser(req.body, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { role, limit = 50, page = 1 } = req.query;

    const userService = req.container.get('userService');
    const result = await userService.getAllUsers({
      role,
      limit: parseInt(limit),
      page: parseInt(page)
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userService = req.container.get('userService');
    const result = await userService.getUserById(id);

    res.json(result);
  });

  updateRole = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;
    const { role } = req.body;

    const userService = req.container.get('userService');
    const result = await userService.updateUserRole(id, role);

    res.json(result);
  });

  resendInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userService = req.container.get('userService');
    const result = await userService.resendInvitation(id);

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userService = req.container.get('userService');
    const result = await userService.deleteUser(id);

    res.json(result);
  });
}

module.exports = new UserController();